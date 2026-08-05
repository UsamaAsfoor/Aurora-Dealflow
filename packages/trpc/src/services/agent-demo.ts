import { extractStreetAddress } from "@aurora/core";
import type { CrmContextPack } from "./agent-context.js";
import {
  detectSuggestedAgentAction,
  formatSwitchToAgentSuggestion,
} from "./agent-ask.js";
import {
  type AgentCaller,
  type AgentMode,
  type PendingConfirmationPayload,
  type SearchAction,
  type ToolTraceItem,
  type UiAction,
  executeAgentTool,
  searchActionSchema,
} from "./agent-tools.js";
import { storePendingConfirmation } from "./agent-pending.js";

export type AgentTurnResult = {
  message: string;
  toolTrace: ToolTraceItem[];
  uiActions: UiAction[];
  pendingConfirmations: PendingConfirmationPayload[];
};

function parseSearchIntent(userText: string): SearchAction | null {
  const text = userText.trim();
  const lower = text.toLowerCase();

  // Full street address must win over ZIP-inside-address (e.g. "… IL 62704")
  const streetAddress = extractStreetAddress(text);
  if (streetAddress) {
    return searchActionSchema.parse({
      type: "search",
      address: streetAddress,
      query: streetAddress,
      intent: "specific_property",
    });
  }

  const zipMatch = text.match(/\b(\d{5})\b/);

  let intent: SearchAction["intent"] | undefined;
  if (/\bvacant\b/.test(lower)) intent = "vacant";
  else if (/\babsentee\b/.test(lower)) intent = "absentee";
  else if (/pre[-\s]?foreclosure|nod|auction/.test(lower))
    intent = "pre_foreclosure";
  else if (/tax/.test(lower)) intent = "tax_delinquent";
  else if (/expired/.test(lower)) intent = "expired_listings";

  if (!zipMatch && !intent) return null;
  if (!zipMatch) return null;

  return searchActionSchema.parse({
    type: "search",
    zip: zipMatch[1],
    areaMode: "zip",
    state: /\baz\b|arizona/.test(lower) ? "AZ" : undefined,
    intent: intent ?? "list_building",
  });
}

function crmSummaryMessage(pack: CrmContextPack): string {
  const stages =
    pack.pipeline.map((p) => `**${p.stage}**: ${p.count}`).join(" · ") ||
    "no stages";
  const leadLines =
    pack.recentLeads.length === 0
      ? "_No leads yet._"
      : pack.recentLeads
          .slice(0, 6)
          .map(
            (l) =>
              `- **${l.stage}** — ${l.address}${l.zip ? ` (${l.zip})` : ""}`,
          )
          .join("\n");

  return [
    `Here's your CRM snapshot, **${pack.user.name ?? "investor"}**:`,
    "",
    `Pipeline: ${stages}`,
    `Open deals: **${pack.openDeals}** · Buyers: **${pack.buyers}** · Active campaigns: **${pack.activeCampaigns}**`,
    "",
    "Recent leads:",
    leadLines,
  ].join("\n");
}

function wantsCrmSummary(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /pipeline|crm|leads?|deals?|buyers?|campaigns?|usage|my board|summar/.test(
      lower,
    ) && !/\b(\d{5})\b/.test(lower)
  );
}

function wantsCreateLead(text: string): boolean {
  return /add (as )?lead|create lead|save (as )?lead|top result/.test(
    text.toLowerCase(),
  );
}

function wantsMoveLead(text: string): { stageName: string } | null {
  const m = text.match(
    /move(?:\s+(?:it|lead|them))?\s+to\s+([A-Za-z][A-Za-z\s]+)/i,
  );
  if (!m?.[1]) return null;
  return { stageName: m[1].trim().replace(/[."']+$/, "") };
}

function wantsHighImpact(
  text: string,
): { tool: string; title: string; args: Record<string, unknown> } | null {
  const lower = text.toLowerCase();
  if (/blast|buyer blast|blast matched/.test(lower)) {
    return {
      tool: "blast_buyers",
      title: "Blast matched buyers",
      args: { listingId: "pending-listing-id", message: text },
    };
  }
  if (/send sms|text (the )?owner|sms/.test(lower)) {
    const leadHint = text.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    return {
      tool: "send_sms",
      title: "Send SMS",
      args: {
        leadId: leadHint?.[0] ?? "needs-lead-id",
        body: "Following up on your property — are you open to an offer?",
      },
    };
  }
  if (/send email/.test(lower)) {
    return {
      tool: "send_email",
      title: "Send email",
      args: {
        leadId: "needs-lead-id",
        subject: "Property inquiry",
        body: text,
      },
    };
  }
  if (/publish|marketplace/.test(lower) && /list|publish/.test(lower)) {
    return {
      tool: "publish_listing",
      title: "Publish marketplace listing",
      args: { dealRoomId: "needs-deal-room-id" },
    };
  }
  if (/checkout|upgrade|subscribe/.test(lower)) {
    return {
      tool: "create_checkout",
      title: "Start checkout",
      args: { planId: "pro" },
    };
  }
  return null;
}

export async function runDemoAgentTurn(input: {
  userId: string;
  mode: AgentMode;
  userText: string;
  pack: CrmContextPack;
  caller: AgentCaller;
}): Promise<AgentTurnResult> {
  const { userId, mode, userText, pack, caller } = input;
  const toolTrace: ToolTraceItem[] = [];
  const uiActions: UiAction[] = [];
  const pendingConfirmations: PendingConfirmationPayload[] = [];
  const parts: string[] = [];

  // Ask mode: if the user wants an action (and isn't also asking a research question
  // with a ZIP), steer them to Agent — Cursor-style.
  if (mode === "ask") {
    const actionAsk = detectSuggestedAgentAction(userText);
    const searchAsk = parseSearchIntent(userText);
    if (actionAsk && !searchAsk) {
      return {
        message: formatSwitchToAgentSuggestion(actionAsk),
        toolTrace,
        uiActions,
        pendingConfirmations,
      };
    }
  }

  const search = parseSearchIntent(userText);
  if (search) {
    const vacant = search.intent === "vacant";
    const absentee = search.intent === "absentee";
    const pre = search.intent === "pre_foreclosure";
    const tax = search.intent === "tax_delinquent";
    const isAddress = Boolean(search.address || search.query);

    const exec = await executeAgentTool(
      "search_properties",
      isAddress
        ? {
            address: search.address ?? search.query,
            query: search.address ?? search.query,
            limit: 10,
          }
        : {
            zip: search.zip,
            state: search.state,
            vacant,
            absentee,
            preForeclosure: pre,
            taxDelinquent: tax,
            limit: 20,
          },
      caller,
      mode,
    );
    toolTrace.push({
      name: "search_properties",
      ok: exec.ok,
      summary: exec.summary,
    });
    if (mode === "agent") {
      if (exec.uiActions) uiActions.push(...exec.uiActions);
      else uiActions.push(search);
    }

    const results =
      (exec.result as {
        results?: Array<{
          attomId: string;
          address?: string;
          city?: string;
          estimatedValue?: number | null;
          score?: number;
          isVacant?: boolean;
          isAbsentee?: boolean;
        }>;
        total?: number;
        totalAvailable?: number;
      })?.results ?? [];
    const totalAvailable =
      (exec.result as { totalAvailable?: number; total?: number } | undefined)
        ?.totalAvailable ??
      (exec.result as { total?: number } | undefined)?.total ??
      results.length;

    const intentLabel =
      search.intent && search.intent !== "list_building"
        ? search.intent.replace(/_/g, " ")
        : null;

    const targetLabel = isAddress
      ? (search.address ?? search.query ?? "address")
      : `ZIP **${search.zip}**`;

    if (mode === "ask") {
      parts.push(
        [
          isAddress
            ? `## Research: **${targetLabel}**`
            : `## Research: ZIP **${search.zip}**`,
          !isAddress && intentLabel ? `Filter focus: **${intentLabel}**` : null,
          "",
          isAddress
            ? `I looked up that street address (read-only — **the map was not updated**).`
            : `I looked up inventory (read-only — **the map was not updated**).`,
          isAddress
            ? results.length > 0
              ? `Matched **${results.length}** property.`
              : "No property matched that address."
            : `Matched about **${totalAvailable.toLocaleString()}** properties; showing the top **${results.length}** by score.`,
        ]
          .filter(Boolean)
          .join("\n"),
      );

      if (results.length > 0) {
        const bullets = results.slice(0, 5).map((p, i) => {
          const flags = [
            p.isVacant ? "vacant" : null,
            p.isAbsentee ? "absentee" : null,
          ]
            .filter(Boolean)
            .join(", ");
          const value =
            p.estimatedValue != null
              ? `$${Number(p.estimatedValue).toLocaleString()}`
              : "value n/a";
          const score = p.score != null ? `score ${p.score}` : null;
          return `${i + 1}. **${p.address ?? p.attomId}**${p.city ? `, ${p.city}` : ""} — ${value}${score ? ` · ${score}` : ""}${flags ? ` · ${flags}` : ""}`;
        });
        parts.push(
          [isAddress ? "### Property" : "### Top properties", ...bullets].join(
            "\n",
          ),
        );
      } else {
        parts.push(
          isAddress
            ? "No property matched that full address. Check spelling or try City, ST ZIP after the street."
            : "No properties matched that query in the current data set. Try another ZIP or broaden the distress filters.",
        );
      }

      const actionAsk = detectSuggestedAgentAction(userText);
      if (actionAsk || wantsCreateLead(userText)) {
        parts.push(
          formatSwitchToAgentSuggestion(
            actionAsk ?? {
              action: "save leads or update the map with these results",
              example: isAddress
                ? `Show ${targetLabel} on the map`
                : `Find ${intentLabel ?? "homes"} in ${search.zip} and show them on the map`,
            },
          ),
        );
      } else {
        parts.push(
          [
            "### Next steps",
            "- Ask me to compare a specific property or explain equity / vacancy signals",
            "- Switch to **Agent** if you want these results on the map or saved as leads",
          ].join("\n"),
        );
      }
    } else {
      parts.push(
        isAddress
          ? `Looked up **${targetLabel}**. Found **${results.length}** match${results.length === 1 ? "" : "es"}. Map updated.`
          : [
              `Searched **${search.zip}**`,
              intentLabel ? ` with **${intentLabel}** mode` : "",
              `. Found **${results.length}** properties (universe ~${totalAvailable.toLocaleString()}). Map updated.`,
            ].join(""),
      );
    }

    if (mode === "agent" && wantsCreateLead(userText) && results[0]?.attomId) {
      const created = await executeAgentTool(
        "create_lead",
        {
          attomId: results[0].attomId,
          notes: `Created via Agent from search ${search.zip}`,
        },
        caller,
        mode,
      );
      toolTrace.push({
        name: "create_lead",
        ok: created.ok,
        summary: created.summary,
      });
      parts.push(
        created.ok
          ? `Saved top result (**${results[0].address ?? results[0].attomId}**) as a lead.`
          : `Could not create lead: ${created.summary}`,
      );

      const move = wantsMoveLead(userText);
      const leadId = (created.result as { leadId?: string } | undefined)
        ?.leadId;
      if (move && leadId && created.ok) {
        const moved = await executeAgentTool(
          "move_lead",
          { leadId, stageName: move.stageName },
          caller,
          mode,
        );
        toolTrace.push({
          name: "move_lead",
          ok: moved.ok,
          summary: moved.summary,
        });
        parts.push(
          moved.ok
            ? `Moved lead to **${move.stageName}**.`
            : `Could not move lead: ${moved.summary}`,
        );
      }
    }

    return {
      message: parts.join("\n\n"),
      toolTrace,
      uiActions,
      pendingConfirmations,
    };
  }

  if (mode === "ask") {
    const actionAsk = detectSuggestedAgentAction(userText);
    if (actionAsk) {
      return {
        message: formatSwitchToAgentSuggestion(actionAsk),
        toolTrace,
        uiActions,
        pendingConfirmations,
      };
    }
  }

  if (mode === "agent") {
    const high = wantsHighImpact(userText);
    if (high) {
      if (
        high.args.leadId === "needs-lead-id" ||
        high.args.listingId === "pending-listing-id" ||
        high.args.dealRoomId === "needs-deal-room-id"
      ) {
        const lead = pack.recentLeads[0];
        if (high.tool === "send_sms" || high.tool === "send_email") {
          if (!lead) {
            return {
              message:
                "I need a lead id to message. Save a property as a lead first, then ask again.",
              toolTrace,
              uiActions,
              pendingConfirmations,
            };
          }
          high.args.leadId = lead.id;
        } else {
          return {
            message: `I can prepare **${high.title}**, but I need a concrete listing/deal id. Open a deal or listing, then ask again.`,
            toolTrace,
            uiActions,
            pendingConfirmations,
          };
        }
      }

      const pending = storePendingConfirmation({
        userId,
        tool: high.tool,
        args: high.args,
        title: high.title,
      });
      pendingConfirmations.push({
        id: pending.id,
        title: pending.title,
        tool: pending.tool,
        args: pending.args,
      });
      toolTrace.push({
        name: high.tool,
        ok: true,
        summary: `Awaiting confirmation: ${high.title}`,
      });
      return {
        message: `Ready to **${high.title.toLowerCase()}**. Confirm below to proceed.`,
        toolTrace,
        uiActions,
        pendingConfirmations,
      };
    }

    const moveOnly = wantsMoveLead(userText);
    if (moveOnly && pack.recentLeads[0]) {
      const lead = pack.recentLeads[0];
      const moved = await executeAgentTool(
        "move_lead",
        { leadId: lead.id, stageName: moveOnly.stageName },
        caller,
        mode,
      );
      toolTrace.push({
        name: "move_lead",
        ok: moved.ok,
        summary: moved.summary,
      });
      return {
        message: moved.ok
          ? `Moved **${lead.address}** to **${moveOnly.stageName}**.`
          : `Could not move lead: ${moved.summary}`,
        toolTrace,
        uiActions,
        pendingConfirmations,
      };
    }
  }

  if (wantsCrmSummary(userText)) {
    toolTrace.push({
      name: "list_pipeline",
      ok: true,
      summary: "Loaded CRM context pack",
    });
    const summary = crmSummaryMessage(pack);
    return {
      message:
        mode === "ask"
          ? [
              summary,
              "",
              "### Tips",
              "- I can dig into a lead, deal, or buyer next — ask a follow-up question",
              "- Switch to **Agent** when you want me to move stages, save leads, or update the map",
            ].join("\n")
          : summary,
      toolTrace,
      uiActions,
      pendingConfirmations,
    };
  }

  return {
    message:
      mode === "ask"
        ? [
            "I'm in **Ask** mode — research and explanations only (like Cursor Ask).",
            "",
            "I can:",
            "- Analyze markets / ZIP inventory (results stay in chat; map unchanged)",
            "- Explain your pipeline, deals, buyers, and usage",
            "- Walk through strategy, equity, vacancy, and next steps",
            "",
            "I won't:",
            "- Move the map, save leads, send SMS, or change CRM",
            "",
            "Try: `What does my pipeline look like?` or `Find vacant homes in 85016`",
            "",
            "Switch to **Agent** when you want me to execute changes.",
          ].join("\n")
        : [
            "I'm in **Agent** mode — I can search, update the map, and change your CRM.",
            "",
            "Try:",
            "- `Find vacant homes in 85016`",
            "- `Find vacant in 85016, add top result as lead, move to Contacted`",
            "- `Send SMS` or `Blast matched buyers` (asks for confirmation)",
            "- `Summarize my pipeline`",
          ].join("\n"),
    toolTrace,
    uiActions,
    pendingConfirmations,
  };
}
