/**
 * Cursor-style Ask helpers: detect action requests and suggest Agent mode.
 */

export type SuggestedAgentAction = {
  /** Short label for the action the user seems to want */
  action: string;
  /** Example prompt they can paste in Agent mode */
  example?: string;
};

/** Phrases that imply the user wants something executed (not just explained). */
export function detectSuggestedAgentAction(
  userText: string,
): SuggestedAgentAction | null {
  const text = userText.trim();
  const lower = text.toLowerCase();

  if (
    /\b(update|change|move|pan|zoom|show on|put on|control)\b.*\bmap\b/.test(
      lower,
    ) ||
    /\b(search|find|show|load|pull)\b.*\b(on the map|in the map|map)\b/.test(
      lower,
    ) ||
    /\bapply (filters?|search)\b/.test(lower)
  ) {
    return {
      action: "update the map / search filters",
      example: "Find vacant homes in 85016 and show them on the map",
    };
  }

  if (
    /add (as )?lead|create lead|save (as )?lead|save (this|the) property|top result/.test(
      lower,
    )
  ) {
    return {
      action: "save a property as a lead",
      example: "Find vacant in 85016, save the top result as a lead",
    };
  }

  if (/move(?:\s+(?:it|lead|them))?\s+to\s+/i.test(text)) {
    return {
      action: "move a lead in the pipeline",
      example: "Move my latest lead to Contacted",
    };
  }

  if (/send sms|text (the )?owner|\bsms\b/.test(lower)) {
    return {
      action: "send an SMS",
      example: "Send a follow-up SMS to my latest lead",
    };
  }

  if (/send email/.test(lower)) {
    return {
      action: "send an email",
      example: "Send an email to my latest lead",
    };
  }

  if (/blast|buyer blast|blast matched/.test(lower)) {
    return {
      action: "blast matched buyers",
      example: "Blast matched buyers for my published listing",
    };
  }

  if (/publish|marketplace/.test(lower) && /list|publish/.test(lower)) {
    return {
      action: "publish a marketplace listing",
      example: "Publish my open deal to the marketplace",
    };
  }

  if (/enroll|campaign/.test(lower) && /lead|enroll|start/.test(lower)) {
    return {
      action: "enroll leads in a campaign",
      example: "Enroll my recent leads in the outreach campaign",
    };
  }

  if (/checkout|upgrade|subscribe/.test(lower)) {
    return {
      action: "start a plan checkout",
      example: "Upgrade me to Pro",
    };
  }

  if (
    /\b(create|add|update|complete)\b.*\b(task|note|deal|buyer|buy ?box)\b/.test(
      lower,
    ) ||
    /\b(do|run|execute|perform|make|change)\b/.test(lower)
  ) {
    // Soft catch — only if it looks imperative, not a pure question
    if (
      /^(can you|could you|please|go ahead|just)\b/.test(lower) ||
      /\b(for me|now)\b/.test(lower)
    ) {
      return {
        action: "make CRM changes",
        example: text.slice(0, 120),
      };
    }
  }

  return null;
}

export function formatSwitchToAgentSuggestion(
  suggestion: SuggestedAgentAction,
): string {
  const lines = [
    `I'm in **Ask** mode — I can explain and research, but I won't make changes.`,
    "",
    `To **${suggestion.action}**, switch to **Agent** mode (toggle above the composer), then ask me again.`,
  ];
  if (suggestion.example) {
    lines.push("", `Example: _${suggestion.example}_`);
  }
  return lines.join("\n");
}

export function askModeSystemPrompt(contextText: string): string {
  return `You are Aurora's Ask assistant (Cursor-style Ask mode) in a side panel on the Search map page.

## Mode: ASK — read-only
You answer questions and explain. You do **not** perform actions.

### What you MUST NOT do
- Do not update the map, filters, or search workspace
- Do not create/move/update leads, deals, buyers, tasks, notes, or campaigns
- Do not send SMS/email, publish listings, blast buyers, or start checkout
- Do not claim you performed an action you cannot perform

### What you SHOULD do
- Be highly informative: clear structure, concrete numbers, tradeoffs, and next steps
- Use read tools (search_properties, get_property, get_comps, list_leads, list_pipeline, etc.) to ground answers in real data
- When presenting search results, summarize them in chat — the map will **not** change
- If the user asks you to **do** something (save a lead, move the map, send SMS, etc.), explain briefly what you found / would do, then tell them to switch to **Agent** mode to execute it
- Prefer markdown: short sections, bullets, bold key figures
- Do not invent lead/deal ids; use ids from tools or the context pack

### Tone
Helpful analyst / co-pilot. Thorough when useful, never vague filler.

CRM context pack:
${contextText}`;
}

export function agentModeSystemPrompt(contextText: string): string {
  return `You are Aurora's Agent (Cursor-style Agent mode) in a side panel on the Search map page.

## Mode: AGENT — can take action
You research **and** execute workspace/CRM actions when asked.

### Rules
- Prefer tools over guessing
- Use emit_search_ui or search_properties when the user wants the map/filters updated
- For high-impact actions (SMS, email, campaign enroll, publish, blast, checkout), call the tool — the server will hold them for user confirmation
- Keep replies concise markdown with a short summary of what you found or changed
- Do not invent lead/deal ids

CRM context pack:
${contextText}`;
}
