import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc.js";
import {
  buildCrmContextPack,
  formatContextPackForPrompt,
} from "../services/agent-context.js";
import { runDemoAgentTurn } from "../services/agent-demo.js";
import {
  cancelPendingConfirmation,
  storePendingConfirmation,
  takePendingConfirmation,
} from "../services/agent-pending.js";
import {
  agentModeSystemPrompt,
  askModeSystemPrompt,
} from "../services/agent-ask.js";
import {
  type AgentMode,
  type PendingConfirmationPayload,
  type ToolTraceItem,
  type UiAction,
  createAgentCaller,
  executeAgentTool,
  getToolDefinitions,
  searchActionSchema,
} from "../services/agent-tools.js";

type OpenAiMessage =
  | { role: "user" | "assistant"; content: string | null }
  | {
      role: "assistant";
      content: string | null;
      tool_calls: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const contextSchema = z
  .object({
    zip: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    intent: z.string().optional(),
    resultCount: z.number().optional(),
    areaMode: z.string().optional(),
  })
  .optional();

const agentResponseSchema = z.object({
  message: z.string(),
  toolTrace: z
    .array(
      z.object({
        name: z.string(),
        ok: z.boolean(),
        summary: z.string(),
      }),
    )
    .default([]),
  uiActions: z.array(searchActionSchema).default([]),
  pendingConfirmations: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        tool: z.string(),
        args: z.record(z.unknown()),
      }),
    )
    .default([]),
});

function systemPrompt(mode: AgentMode, contextText: string): string {
  return mode === "ask"
    ? askModeSystemPrompt(contextText)
    : agentModeSystemPrompt(contextText);
}

async function runLiveAgentTurn(input: {
  ctx: Parameters<typeof buildCrmContextPack>[0];
  userId: string;
  mode: AgentMode;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  packText: string;
}): Promise<z.infer<typeof agentResponseSchema>> {
  const { ctx, userId, mode, messages, packText } = input;
  const caller = createAgentCaller(ctx);
  const tools = getToolDefinitions(mode);

  const openaiMessages: OpenAiMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const toolTrace: ToolTraceItem[] = [];
  const uiActions: UiAction[] = [];
  const pendingConfirmations: PendingConfirmationPayload[] = [];

  const maxSteps = 8;
  for (let step = 0; step < maxSteps; step++) {
    const turn = await ctx.openai.chatWithTools({
      system: systemPrompt(mode, packText),
      messages: openaiMessages,
      tools,
    });

    if (!turn) {
      throw new Error("OpenAI returned empty turn");
    }

    if (!turn.toolCalls.length) {
      return agentResponseSchema.parse({
        message: turn.content?.trim() || "Done.",
        toolTrace,
        uiActions,
        pendingConfirmations,
      });
    }

    openaiMessages.push({
      role: "assistant",
      content: turn.content,
      tool_calls: turn.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      })),
    });

    for (const call of turn.toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.arguments || "{}") as Record<string, unknown>;
      } catch {
        args = {};
      }

      const exec = await executeAgentTool(call.name, args, caller, mode);

      if (exec.needsConfirmation) {
        const pending = storePendingConfirmation({
          userId,
          tool: exec.needsConfirmation.tool,
          args: exec.needsConfirmation.args,
          title: exec.needsConfirmation.title,
        });
        pendingConfirmations.push({
          id: pending.id,
          title: pending.title,
          tool: pending.tool,
          args: pending.args,
        });
      }

      if (exec.uiActions?.length) {
        uiActions.push(...exec.uiActions);
      }

      toolTrace.push({
        name: call.name,
        ok: exec.ok,
        summary: exec.summary,
      });

      openaiMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(
          exec.needsConfirmation
            ? {
                status: "pending_confirmation",
                title: exec.needsConfirmation.title,
                confirmationId: pendingConfirmations.at(-1)?.id,
              }
            : {
                ok: exec.ok,
                summary: exec.summary,
                result: exec.result,
              },
        ),
      });
    }
  }

  return agentResponseSchema.parse({
    message:
      "I hit the tool-step limit. Here's what I completed — ask me to continue if needed.",
    toolTrace,
    uiActions,
    pendingConfirmations,
  });
}

export const agentRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        messages: z.array(messageSchema).min(1),
        mode: z.enum(["ask", "agent"]).default("agent"),
        context: contextSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lastUser = [...input.messages]
        .reverse()
        .find((m) => m.role === "user");
      if (!lastUser) {
        return agentResponseSchema.parse({
          message: "Send a message to get started.",
        });
      }

      const pack = await buildCrmContextPack(ctx, input.context ?? null).catch(
        () =>
          ({
            user: {
              name: null,
              email: ctx.userEmail,
              role: "wholesaler",
            },
            usage: null,
            pipeline: [],
            recentLeads: [],
            openDeals: 0,
            buyers: 0,
            activeCampaigns: 0,
            searchWorkspace: input.context ?? null,
          }) satisfies Awaited<ReturnType<typeof buildCrmContextPack>>,
      );
      const packText = formatContextPackForPrompt(pack);
      const caller = createAgentCaller(ctx);
      const mode = input.mode as AgentMode;

      /** Ask mode: never return side effects (map actions or confirmations). */
      const stripAskSideEffects = <
        T extends {
          uiActions?: unknown[];
          pendingConfirmations?: unknown[];
        },
      >(
        response: T,
      ): T =>
        mode === "ask"
          ? { ...response, uiActions: [], pendingConfirmations: [] }
          : response;

      if (ctx.openai.isDemoMode()) {
        return stripAskSideEffects(
          await runDemoAgentTurn({
            userId: ctx.userId,
            mode,
            userText: lastUser.content,
            pack,
            caller,
          }),
        );
      }

      try {
        return stripAskSideEffects(
          await runLiveAgentTurn({
            ctx,
            userId: ctx.userId,
            mode,
            messages: input.messages,
            packText,
          }),
        );
      } catch (error) {
        console.warn(
          "Live agent turn failed; falling back to demo agent:",
          error instanceof Error ? error.message : error,
        );
        return stripAskSideEffects(
          await runDemoAgentTurn({
            userId: ctx.userId,
            mode,
            userText: lastUser.content,
            pack,
            caller,
          }),
        );
      }
    }),

  confirm: protectedProcedure
    .input(
      z.object({
        confirmationId: z.string().uuid(),
        approved: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.approved) {
        cancelPendingConfirmation(input.confirmationId, ctx.userId);
        return agentResponseSchema.parse({
          message: "Cancelled.",
          toolTrace: [
            {
              name: "confirm",
              ok: true,
              summary: "User cancelled confirmation",
            },
          ],
        });
      }

      const pending = takePendingConfirmation(
        input.confirmationId,
        ctx.userId,
      );
      if (!pending) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Confirmation expired or not found",
        });
      }

      const caller = createAgentCaller(ctx);
      const exec = await executeAgentTool(
        pending.tool,
        pending.args,
        caller,
        "agent",
        { skipConfirmGate: true },
      );

      return agentResponseSchema.parse({
        message: exec.ok
          ? `Confirmed: **${pending.title}** — ${exec.summary}.`
          : `Failed: **${pending.title}** — ${exec.summary}.`,
        toolTrace: [
          {
            name: pending.tool,
            ok: exec.ok,
            summary: exec.summary,
          },
        ],
        uiActions: exec.uiActions ?? [],
      });
    }),
});
