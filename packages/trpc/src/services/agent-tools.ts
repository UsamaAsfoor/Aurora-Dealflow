import { z } from "zod";
import { createCallerFactory, router } from "../trpc.js";
import type { TrpcContext } from "../context.js";
import { activityRouter } from "../routers/activity.js";
import { analysisRouter } from "../routers/analysis.js";
import { billingRouter } from "../routers/billing.js";
import { buyerRouter } from "../routers/buyer.js";
import { campaignRouter } from "../routers/campaign.js";
import { commsRouter } from "../routers/comms.js";
import { dealRouter } from "../routers/deal.js";
import { leadRouter } from "../routers/lead.js";
import { marketplaceRouter } from "../routers/marketplace.js";
import { pipelineRouter } from "../routers/pipeline.js";
import { propertyRouter } from "../routers/property.js";
import { taskRouter } from "../routers/task.js";
import { userRouter } from "../routers/user.js";

export type AgentMode = "ask" | "agent";

export type AgentToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ToolTraceItem = {
  name: string;
  ok: boolean;
  summary: string;
};

export const searchActionSchema = z.object({
  type: z.literal("search"),
  zip: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  areaMode: z.enum(["zip", "city", "county"]).optional(),
  intent: z
    .enum([
      "list_building",
      "vacant",
      "absentee",
      "pre_foreclosure",
      "tax_delinquent",
      "expired_listings",
      "mls_lookup",
      "emls",
      "radius_search",
    ])
    .optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
});

export type SearchAction = z.infer<typeof searchActionSchema>;

export type UiAction = SearchAction;

export type PendingConfirmationPayload = {
  id: string;
  title: string;
  tool: string;
  args: Record<string, unknown>;
};

export const HIGH_IMPACT_TOOLS = new Set([
  "enroll_campaign",
  "send_sms",
  "send_email",
  "publish_listing",
  "blast_buyers",
  "create_checkout",
]);

const READ_TOOL_NAMES = [
  "search_properties",
  "get_property",
  "get_comps",
  "list_leads",
  "get_lead",
  "list_pipeline",
  "list_deals",
  "get_deal",
  "list_buyers",
  "get_analysis",
  "get_usage",
  "get_me",
  "list_campaigns",
] as const;

/** Map / search workspace control — Agent mode only (not Ask). */
const MAP_CONTROL_TOOL_NAMES = ["emit_search_ui"] as const;

const WRITE_TOOL_NAMES = [
  "create_lead",
  "update_lead_notes",
  "move_lead",
  "create_deal",
  "update_deal",
  "create_buyer",
  "update_buy_box",
  "create_task",
  "complete_task",
  "add_note",
  "enroll_campaign",
  "send_sms",
  "send_email",
  "publish_listing",
  "blast_buyers",
  "create_checkout",
] as const;

const agentToolRouter = router({
  property: propertyRouter,
  lead: leadRouter,
  pipeline: pipelineRouter,
  deal: dealRouter,
  buyer: buyerRouter,
  campaign: campaignRouter,
  billing: billingRouter,
  user: userRouter,
  analysis: analysisRouter,
  task: taskRouter,
  activity: activityRouter,
  comms: commsRouter,
  marketplace: marketplaceRouter,
});

const createCaller = createCallerFactory(agentToolRouter);

export type AgentCaller = ReturnType<typeof createCaller>;

export function createAgentCaller(ctx: TrpcContext): AgentCaller {
  return createCaller(ctx);
}

function tool(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
): AgentToolDefinition {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: {
        type: "object",
        additionalProperties: false,
        ...parameters,
      },
    },
  };
}

const ALL_TOOL_DEFS: AgentToolDefinition[] = [
  tool("emit_search_ui", "Update the map/search UI with a property search (Agent mode only).", {
    properties: {
      zip: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
      areaMode: { type: "string", enum: ["zip", "city", "county"] },
      intent: {
        type: "string",
        enum: [
          "list_building",
          "vacant",
          "absentee",
          "pre_foreclosure",
          "tax_delinquent",
          "expired_listings",
          "mls_lookup",
          "emls",
          "radius_search",
        ],
      },
      minPrice: { type: "string" },
      maxPrice: { type: "string" },
    },
  }),
  tool("search_properties", "Search ATTOM property inventory.", {
    properties: {
      zip: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
      vacant: { type: "boolean" },
      absentee: { type: "boolean" },
      preForeclosure: { type: "boolean" },
      taxDelinquent: { type: "boolean" },
      limit: { type: "number" },
    },
  }),
  tool("get_property", "Get a property by ATTOM id.", {
    required: ["attomId"],
    properties: { attomId: { type: "string" } },
  }),
  tool("get_comps", "Get comparable sales for a property with optional radius and sold window.", {
    required: ["attomId"],
    properties: {
      attomId: { type: "string" },
      radiusMiles: { type: "number" },
      soldWithinMonths: { type: "number", enum: [3, 6, 12] },
    },
  }),
  tool("list_leads", "List recent leads from the CRM context (prefer list_pipeline for stages).", {
    properties: {},
  }),
  tool("get_lead", "Get a lead by id.", {
    required: ["leadId"],
    properties: { leadId: { type: "string" } },
  }),
  tool("list_pipeline", "List pipeline board with stages and leads.", {
    properties: {},
  }),
  tool("list_deals", "List deal rooms.", { properties: {} }),
  tool("get_deal", "Get deal room for a lead.", {
    required: ["leadId"],
    properties: { leadId: { type: "string" } },
  }),
  tool("list_buyers", "List buyers.", { properties: {} }),
  tool("get_analysis", "Get or generate AI analysis for a property.", {
    properties: {
      attomId: { type: "string" },
      propertyId: { type: "string" },
      leadId: { type: "string" },
    },
  }),
  tool("get_usage", "Get billing usage snapshot.", { properties: {} }),
  tool("get_me", "Get current user profile.", { properties: {} }),
  tool("list_campaigns", "List outreach campaigns.", { properties: {} }),
  tool("create_lead", "Create a lead from an ATTOM property id.", {
    required: ["attomId"],
    properties: {
      attomId: { type: "string" },
      notes: { type: "string" },
    },
  }),
  tool("update_lead_notes", "Replace notes on a lead.", {
    required: ["leadId", "notes"],
    properties: {
      leadId: { type: "string" },
      notes: { type: "string" },
    },
  }),
  tool("move_lead", "Move a lead to a pipeline stage by id or name.", {
    required: ["leadId"],
    properties: {
      leadId: { type: "string" },
      stageId: { type: "string" },
      stageName: { type: "string" },
    },
  }),
  tool("create_deal", "Create a deal room for a lead.", {
    required: ["leadId"],
    properties: { leadId: { type: "string" } },
  }),
  tool("update_deal", "Update deal room fields.", {
    required: ["dealRoomId"],
    properties: {
      dealRoomId: { type: "string" },
      arv: { type: "number" },
      repairs: { type: "number" },
      mao: { type: "number" },
      status: { type: "string" },
    },
  }),
  tool("create_buyer", "Create a buyer contact.", {
    required: ["name"],
    properties: {
      name: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      company: { type: "string" },
      notes: { type: "string" },
    },
  }),
  tool("update_buy_box", "Update a buyer's buy box.", {
    required: ["buyerId"],
    properties: {
      buyerId: { type: "string" },
      areas: { type: "array", items: { type: "string" } },
      minPrice: { type: "number" },
      maxPrice: { type: "number" },
      propertyTypes: { type: "array", items: { type: "string" } },
      strategies: { type: "array", items: { type: "string" } },
      smsConsent: { type: "boolean" },
    },
  }),
  tool("create_task", "Create a task on a lead.", {
    required: ["leadId", "title"],
    properties: {
      leadId: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
    },
  }),
  tool("complete_task", "Mark a task complete.", {
    required: ["taskId"],
    properties: { taskId: { type: "string" } },
  }),
  tool("add_note", "Add a note activity on a lead.", {
    required: ["leadId", "body"],
    properties: {
      leadId: { type: "string" },
      title: { type: "string" },
      body: { type: "string" },
    },
  }),
  tool("enroll_campaign", "Enroll leads into a campaign (requires confirmation).", {
    required: ["campaignId", "leadIds"],
    properties: {
      campaignId: { type: "string" },
      leadIds: { type: "array", items: { type: "string" } },
    },
  }),
  tool("send_sms", "Send SMS to a lead (requires confirmation).", {
    required: ["leadId", "body"],
    properties: {
      leadId: { type: "string" },
      body: { type: "string" },
    },
  }),
  tool("send_email", "Send email to a lead (requires confirmation).", {
    required: ["leadId", "subject", "body"],
    properties: {
      leadId: { type: "string" },
      subject: { type: "string" },
      body: { type: "string" },
    },
  }),
  tool("publish_listing", "Publish a deal to marketplace (requires confirmation).", {
    required: ["dealRoomId"],
    properties: {
      dealRoomId: { type: "string" },
      askingPrice: { type: "number" },
      strategy: { type: "string" },
      teaserSummary: { type: "string" },
    },
  }),
  tool("blast_buyers", "Blast matched buyers for a listing (requires confirmation).", {
    required: ["listingId"],
    properties: {
      listingId: { type: "string" },
      message: { type: "string" },
    },
  }),
  tool("create_checkout", "Start a Stripe checkout (requires confirmation).", {
    required: ["planId"],
    properties: {
      planId: { type: "string", enum: ["pro", "team", "scale"] },
    },
  }),
];

export function getToolDefinitions(mode: AgentMode): AgentToolDefinition[] {
  const allowed = new Set<string>([
    ...READ_TOOL_NAMES,
    ...(mode === "agent"
      ? [...MAP_CONTROL_TOOL_NAMES, ...WRITE_TOOL_NAMES]
      : []),
  ]);
  return ALL_TOOL_DEFS.filter((t) => allowed.has(t.function.name));
}

export function isWriteTool(name: string): boolean {
  return (WRITE_TOOL_NAMES as readonly string[]).includes(name);
}

export function isMapControlTool(name: string): boolean {
  return (MAP_CONTROL_TOOL_NAMES as readonly string[]).includes(name);
}

function summarize(name: string, result: unknown, ok: boolean): string {
  if (!ok) {
    return typeof result === "string" ? result : "Failed";
  }
  try {
    if (name === "search_properties") {
      const r = result as { results?: unknown[]; total?: number };
      return `Found ${r.results?.length ?? 0} properties${r.total != null ? ` (total ${r.total})` : ""}`;
    }
    if (name === "create_lead") {
      const r = result as { leadId?: string; isNew?: boolean };
      return r.isNew ? `Created lead ${r.leadId?.slice(0, 8)}…` : `Lead already exists ${r.leadId?.slice(0, 8)}…`;
    }
    if (name === "move_lead") return "Moved lead to stage";
    if (name === "list_pipeline") {
      const stages = result as Array<{ name: string; leads?: unknown[] }>;
      return `Pipeline: ${stages.map((s) => `${s.name}=${s.leads?.length ?? 0}`).join(", ")}`;
    }
    if (name === "emit_search_ui") return "Updated search UI";
    if (name === "send_sms") return "SMS sent";
    if (name === "send_email") return "Email sent";
    if (name === "blast_buyers") return "Buyer blast queued";
    if (name === "enroll_campaign") return "Leads enrolled";
    if (name === "create_deal") return "Deal room created";
    if (name === "create_buyer") return "Buyer created";
    if (name === "create_task") return "Task created";
    if (name === "add_note") return "Note added";
    if (name === "get_usage") return "Fetched usage";
    if (name === "get_me") return "Fetched profile";
    if (name === "list_campaigns") {
      const list = result as unknown[];
      return `${Array.isArray(list) ? list.length : 0} campaigns`;
    }
    if (name === "list_buyers") {
      const list = result as unknown[];
      return `${Array.isArray(list) ? list.length : 0} buyers`;
    }
    if (name === "list_deals") {
      const list = result as unknown[];
      return `${Array.isArray(list) ? list.length : 0} deals`;
    }
    if (name === "get_property") return "Loaded property";
    if (name === "get_comps") return "Loaded comps";
    if (name === "get_lead") return "Loaded lead";
    if (name === "get_analysis") return "Loaded analysis";
    return `${name} ok`;
  } catch {
    return ok ? `${name} ok` : `${name} failed`;
  }
}

export type ToolExecResult = {
  ok: boolean;
  result: unknown;
  summary: string;
  uiActions?: UiAction[];
  needsConfirmation?: { title: string; tool: string; args: Record<string, unknown> };
};

async function resolveStageId(
  caller: AgentCaller,
  stageId?: string,
  stageName?: string,
): Promise<string | null> {
  if (stageId) return stageId;
  if (!stageName) return null;
  const board = await caller.pipeline.listBoard();
  const needle = stageName.toLowerCase().trim();
  const match = board.find(
    (s: { name: string }) =>
      s.name.toLowerCase() === needle ||
      s.name.toLowerCase().includes(needle),
  );
  return match?.id ?? null;
}

export async function executeAgentTool(
  name: string,
  rawArgs: Record<string, unknown>,
  caller: AgentCaller,
  mode: AgentMode,
  options?: { skipConfirmGate?: boolean },
): Promise<ToolExecResult> {
  if (mode === "ask" && isWriteTool(name)) {
    return {
      ok: false,
      result:
        "Ask mode cannot make changes. Switch to Agent mode to execute this action.",
      summary: "Blocked in Ask — switch to Agent to execute",
    };
  }

  if (mode === "ask" && isMapControlTool(name)) {
    return {
      ok: false,
      result:
        "Ask mode cannot control the map. Switch to Agent mode to update search/map filters.",
      summary: "Blocked in Ask — switch to Agent for map control",
    };
  }

  if (
    HIGH_IMPACT_TOOLS.has(name) &&
    mode === "agent" &&
    !options?.skipConfirmGate
  ) {
    const titles: Record<string, string> = {
      enroll_campaign: "Enroll leads in campaign",
      send_sms: "Send SMS",
      send_email: "Send email",
      publish_listing: "Publish marketplace listing",
      blast_buyers: "Blast matched buyers",
      create_checkout: "Start checkout",
    };
    return {
      ok: true,
      result: { pending: true },
      summary: `Awaiting confirmation: ${titles[name] ?? name}`,
      needsConfirmation: {
        title: titles[name] ?? name,
        tool: name,
        args: rawArgs,
      },
    };
  }

  try {
    switch (name) {
      case "emit_search_ui": {
        const action = searchActionSchema.parse({
          type: "search",
          ...rawArgs,
        });
        return {
          ok: true,
          result: action,
          summary: summarize(name, action, true),
          uiActions: [action],
        };
      }
      case "search_properties": {
        const filters: {
          vacantOnly?: boolean;
          absenteeOnly?: boolean;
          preForeclosureOnly?: boolean;
          taxDelinquentOnly?: boolean;
          searchMode?:
            | "vacant"
            | "absentee"
            | "pre_foreclosure"
            | "tax_delinquent"
            | "list_building";
        } = {};
        if (rawArgs.vacant) {
          filters.vacantOnly = true;
          filters.searchMode = "vacant";
        }
        if (rawArgs.absentee) {
          filters.absenteeOnly = true;
          filters.searchMode = "absentee";
        }
        if (rawArgs.preForeclosure) {
          filters.preForeclosureOnly = true;
          filters.searchMode = "pre_foreclosure";
        }
        if (rawArgs.taxDelinquent) {
          filters.taxDelinquentOnly = true;
          filters.searchMode = "tax_delinquent";
        }
        const result = await caller.property.search({
          zip: rawArgs.zip as string | undefined,
          city: rawArgs.city as string | undefined,
          state: rawArgs.state as string | undefined,
          filters: Object.keys(filters).length ? filters : undefined,
          limit: (rawArgs.limit as number | undefined) ?? 50,
          sortBy: "score",
        });
        // Only Agent mode may drive the map/search workspace
        const uiActions: UiAction[] = [];
        if (mode === "agent" && (rawArgs.zip || rawArgs.city)) {
          uiActions.push({
            type: "search",
            zip: rawArgs.zip as string | undefined,
            city: rawArgs.city as string | undefined,
            state: rawArgs.state as string | undefined,
            areaMode: rawArgs.zip ? "zip" : "city",
            intent: rawArgs.vacant
              ? "vacant"
              : rawArgs.absentee
                ? "absentee"
                : rawArgs.preForeclosure
                  ? "pre_foreclosure"
                  : rawArgs.taxDelinquent
                    ? "tax_delinquent"
                    : "list_building",
          });
        }
        const slim = {
          total: result.total ?? result.results?.length,
          totalAvailable: result.totalAvailable,
          results: (result.results ?? []).slice(0, 8).map((p) => ({
            attomId: p.attomId,
            address: p.address?.line1,
            city: p.address?.city,
            state: p.address?.state,
            zip: p.address?.zip,
            estimatedValue: p.estimatedValue,
            score: p.score,
            isVacant: p.isVacant,
            isAbsentee: p.isAbsentee,
          })),
        };
        return {
          ok: true,
          result: slim,
          summary: summarize(name, result, true),
          uiActions,
        };
      }
      case "get_property": {
        const result = await caller.property.getByAttomId({
          attomId: String(rawArgs.attomId),
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "get_comps": {
        const soldWithinMonths = [3, 6, 12].includes(Number(rawArgs.soldWithinMonths))
          ? (Number(rawArgs.soldWithinMonths) as 3 | 6 | 12)
          : 6;
        const result = await caller.property.getComps({
          attomId: String(rawArgs.attomId),
          radiusMiles: Number(rawArgs.radiusMiles) || 1,
          soldWithinMonths,
        });
        return {
          ok: true,
          result,
          summary: `Loaded ${result.comps.length} comps · avg ${result.averageSalePrice ?? "n/a"} · ARV ${result.estimatedArv ?? "n/a"}`,
        };
      }
      case "list_leads": {
        const result = await caller.lead.list();
        const slim = result.slice(0, 20).map((l) => ({
          id: l.id,
          stage: l.pipelineStageName,
          address: l.line1,
          zip: l.zip,
        }));
        return { ok: true, result: slim, summary: `${slim.length} leads` };
      }
      case "get_lead": {
        const result = await caller.lead.getById({
          leadId: String(rawArgs.leadId),
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "list_pipeline": {
        const result = await caller.pipeline.listBoard();
        const slim = result.map((s) => ({
          id: s.id,
          name: s.name,
          leadCount: s.leads?.length ?? 0,
          leads: (s.leads ?? []).slice(0, 6).map((l) => ({
            id: l.id,
            address: l.line1,
          })),
        }));
        return {
          ok: true,
          result: slim,
          summary: summarize(name, result, true),
        };
      }
      case "list_deals": {
        const result = await caller.deal.list();
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "get_deal": {
        const result = await caller.deal.getByLeadId({
          leadId: String(rawArgs.leadId),
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "list_buyers": {
        const result = await caller.buyer.list();
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "get_analysis": {
        const result = await caller.analysis.getOrGenerate({
          attomId: rawArgs.attomId as string | undefined,
          propertyId: rawArgs.propertyId as string | undefined,
          leadId: rawArgs.leadId as string | undefined,
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "get_usage": {
        const result = await caller.billing.getUsage();
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "get_me": {
        const result = await caller.user.me();
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "list_campaigns": {
        const result = await caller.campaign.list();
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "create_lead": {
        const result = await caller.lead.createFromProperty({
          attomId: String(rawArgs.attomId),
          notes: rawArgs.notes as string | undefined,
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "update_lead_notes": {
        const result = await caller.lead.updateNotes({
          leadId: String(rawArgs.leadId),
          notes: String(rawArgs.notes),
        });
        return { ok: true, result, summary: "Updated lead notes" };
      }
      case "move_lead": {
        const stageId = await resolveStageId(
          caller,
          rawArgs.stageId as string | undefined,
          rawArgs.stageName as string | undefined,
        );
        if (!stageId) {
          return {
            ok: false,
            result: "Could not resolve pipeline stage",
            summary: "Stage not found",
          };
        }
        const result = await caller.pipeline.moveLead({
          leadId: String(rawArgs.leadId),
          stageId,
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "create_deal": {
        const result = await caller.deal.create({
          leadId: String(rawArgs.leadId),
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "update_deal": {
        const result = await caller.deal.update({
          dealRoomId: String(rawArgs.dealRoomId),
          arv: rawArgs.arv as number | undefined,
          repairEstimate:
            (rawArgs.repairEstimate as number | undefined) ??
            (rawArgs.repairs as number | undefined),
          mao: rawArgs.mao as number | undefined,
          notes: rawArgs.notes as string | undefined,
        });
        return { ok: true, result, summary: "Updated deal" };
      }
      case "create_buyer": {
        const result = await caller.buyer.create({
          name: String(rawArgs.name),
          email: rawArgs.email as string | undefined,
          phone: rawArgs.phone as string | undefined,
          company: rawArgs.company as string | undefined,
          notes: rawArgs.notes as string | undefined,
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "update_buy_box": {
        const result = await caller.buyer.updateBuyBox({
          buyerId: String(rawArgs.buyerId),
          buyBox: {
            areas: (rawArgs.areas as string[] | undefined) ?? [],
            minPrice: rawArgs.minPrice as number | undefined,
            maxPrice: rawArgs.maxPrice as number | undefined,
            propertyTypes: (rawArgs.propertyTypes as string[] | undefined) ?? [],
            strategies: (rawArgs.strategies as string[] | undefined) ?? [],
            smsConsent: rawArgs.smsConsent as boolean | undefined,
          },
        });
        return { ok: true, result, summary: "Updated buy box" };
      }
      case "create_task": {
        const result = await caller.task.create({
          leadId: String(rawArgs.leadId),
          title: String(rawArgs.title),
          description: rawArgs.description as string | undefined,
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "complete_task": {
        const result = await caller.task.complete({
          taskId: String(rawArgs.taskId),
        });
        return { ok: true, result, summary: "Completed task" };
      }
      case "add_note": {
        const result = await caller.activity.createNote({
          leadId: String(rawArgs.leadId),
          title: (rawArgs.title as string | undefined) ?? "Note",
          body: String(rawArgs.body),
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "enroll_campaign": {
        const result = await caller.campaign.enrollLeads({
          campaignId: String(rawArgs.campaignId),
          leadIds: rawArgs.leadIds as string[],
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "send_sms": {
        const result = await caller.comms.sendSms({
          leadId: String(rawArgs.leadId),
          body: String(rawArgs.body),
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "send_email": {
        const result = await caller.comms.sendEmail({
          leadId: String(rawArgs.leadId),
          subject: String(rawArgs.subject),
          body: String(rawArgs.body),
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "publish_listing": {
        const result = await caller.marketplace.publishFromDeal({
          dealRoomId: String(rawArgs.dealRoomId),
          askingPrice: rawArgs.askingPrice as number | undefined,
          strategy: rawArgs.strategy as string | undefined,
          teaserSummary: rawArgs.teaserSummary as string | undefined,
          disclaimerAccepted: true,
        });
        return { ok: true, result, summary: "Published listing" };
      }
      case "blast_buyers": {
        const result = await caller.marketplace.blastMatchedBuyers({
          listingId: String(rawArgs.listingId),
          message: rawArgs.message as string | undefined,
        });
        return { ok: true, result, summary: summarize(name, result, true) };
      }
      case "create_checkout": {
        const result = await caller.billing.createCheckout({
          planId: rawArgs.planId as "pro" | "team" | "scale",
        });
        return { ok: true, result, summary: "Checkout session created" };
      }
      default:
        return {
          ok: false,
          result: `Unknown tool: ${name}`,
          summary: `Unknown tool: ${name}`,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, result: message, summary: message };
  }
}
