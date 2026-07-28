import type { TrpcContext } from "../context.js";
import { createAgentCaller } from "./agent-tools.js";

export type CrmContextPack = {
  user: { name: string | null; email: string | null; role: string };
  usage: unknown;
  pipeline: Array<{ stage: string; count: number }>;
  recentLeads: Array<{
    id: string;
    stage: string;
    address: string;
    city: string | null;
    state: string | null;
    zip: string | null;
  }>;
  openDeals: number;
  buyers: number;
  activeCampaigns: number;
  searchWorkspace: Record<string, unknown> | null;
};

export async function buildCrmContextPack(
  ctx: TrpcContext,
  searchWorkspace?: Record<string, unknown> | null,
): Promise<CrmContextPack> {
  const caller = createAgentCaller(ctx);

  const [me, usage, board, deals, buyers, campaigns] = await Promise.all([
    caller.user.me(),
    caller.billing.getUsage().catch(() => null),
    caller.pipeline.listBoard().catch(() => []),
    caller.deal.list().catch(() => []),
    caller.buyer.list().catch(() => []),
    caller.campaign.list().catch(() => []),
  ]);

  const stages = Array.isArray(board) ? board : [];
  const pipeline = stages.map((stage: { name: string; leads?: unknown[] }) => ({
    stage: stage.name,
    count: Array.isArray(stage.leads) ? stage.leads.length : 0,
  }));

  const recentLeads: CrmContextPack["recentLeads"] = [];
  for (const stage of stages) {
    const leads = Array.isArray(stage.leads) ? stage.leads : [];
    for (const lead of leads.slice(0, 8)) {
      recentLeads.push({
        id: lead.id,
        stage: stage.name,
        address: lead.line1 ?? "Unknown",
        city: lead.city ?? null,
        state: lead.state ?? null,
        zip: lead.zip ?? null,
      });
      if (recentLeads.length >= 12) break;
    }
    if (recentLeads.length >= 12) break;
  }

  const campaignList = Array.isArray(campaigns) ? campaigns : [];
  const activeCampaigns = campaignList.filter(
    (c: { status?: string }) =>
      c.status === "active" || c.status === "running",
  ).length;

  return {
    user: {
      name: me?.name ?? null,
      email: me?.email ?? ctx.userEmail,
      role: me?.role ?? "wholesaler",
    },
    usage,
    pipeline,
    recentLeads,
    openDeals: Array.isArray(deals) ? deals.length : 0,
    buyers: Array.isArray(buyers) ? buyers.length : 0,
    activeCampaigns,
    searchWorkspace: searchWorkspace ?? null,
  };
}

export function formatContextPackForPrompt(pack: CrmContextPack): string {
  const lines = [
    `User: ${pack.user.name ?? "n/a"} <${pack.user.email ?? "n/a"}> (${pack.user.role})`,
    `Pipeline stages: ${pack.pipeline.map((p) => `${p.stage}=${p.count}`).join(", ") || "none"}`,
    `Open deals: ${pack.openDeals}; Buyers: ${pack.buyers}; Active campaigns: ${pack.activeCampaigns}`,
    `Recent leads (id | stage | address):`,
    ...pack.recentLeads.map(
      (l) =>
        `- ${l.id.slice(0, 8)}… | ${l.stage} | ${l.address}${l.zip ? ` ${l.zip}` : ""}`,
    ),
  ];
  if (pack.searchWorkspace) {
    lines.push(`Current search workspace: ${JSON.stringify(pack.searchWorkspace)}`);
  }
  if (pack.usage) {
    lines.push(`Usage snapshot: ${JSON.stringify(pack.usage).slice(0, 400)}`);
  }
  return lines.join("\n");
}
