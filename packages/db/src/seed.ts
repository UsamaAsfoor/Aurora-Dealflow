import { eq, isNull } from "drizzle-orm";
import { PIPELINE_STAGE_NAMES } from "@aurora/core";
import {
  campaignSteps,
  campaigns,
  createDb,
  pipelineStages,
  plans,
  users,
} from "./index.js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://aurora:aurora@localhost:5434/aurora_dealflow";

const STAGE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#64748b",
  "#78716c",
  "#6b7280",
];

const PLAYBOOKS = [
  {
    key: "high_equity_seller",
    name: "High Equity Seller",
    description: "Target owners with 50%+ equity and long ownership.",
    steps: [
      {
        sortOrder: 0,
        channel: "sms",
        delayDays: 0,
        template:
          "Hi {{owner}}, we noticed strong equity in your property. Would you consider a fair cash offer?",
      },
      {
        sortOrder: 1,
        channel: "email",
        delayDays: 2,
        subject: "Cash offer for your property",
        template:
          "We buy houses as-is with flexible closing. Reply if you'd like a no-obligation offer.",
      },
      {
        sortOrder: 2,
        channel: "sms",
        delayDays: 5,
        template: "Following up — still interested in a quick, as-is cash offer?",
      },
    ],
  },
  {
    key: "absentee_owner",
    name: "Absentee Owner",
    description: "Out-of-state owners with vacant or tired rental properties.",
    steps: [
      {
        sortOrder: 0,
        channel: "sms",
        delayDays: 0,
        template:
          "Hi {{owner}}, managing a property from out of state can be tough. We can buy as-is — interested?",
      },
      {
        sortOrder: 1,
        channel: "email",
        delayDays: 3,
        subject: "Sell your rental without repairs",
        template:
          "We specialize in absentee owner situations. No agents, no repairs, fast closing.",
      },
    ],
  },
  {
    key: "pre_foreclosure",
    name: "Pre-Foreclosure",
    description: "Compassionate outreach for owners facing foreclosure.",
    steps: [
      {
        sortOrder: 0,
        channel: "sms",
        delayDays: 0,
        template:
          "Hi {{owner}}, we help homeowners explore options before foreclosure. Can we talk?",
      },
    ],
  },
  {
    key: "tired_landlord",
    name: "Tired Landlord",
    description: "Landlords ready to exit problem tenants or deferred maintenance.",
    steps: [
      {
        sortOrder: 0,
        channel: "email",
        delayDays: 0,
        subject: "We buy rental properties as-is",
        template:
          "Tired of tenants and repairs? We purchase rental properties in any condition.",
      },
    ],
  },
  {
    key: "cash_buyer_need",
    name: "Buyer Need",
    description: "Find deals for active cash buyers in your buyer list.",
    steps: [
      {
        sortOrder: 0,
        channel: "email",
        delayDays: 0,
        subject: "New deal alert",
        template: "New off-market opportunity matching your buy box criteria.",
      },
    ],
  },
];

async function main() {
  const db = createDb(connectionString);

  const existingDefaults = await db
    .select()
    .from(pipelineStages)
    .where(isNull(pipelineStages.userId));

  if (existingDefaults.length === 0) {
    await db.insert(pipelineStages).values(
      PIPELINE_STAGE_NAMES.map((name, index) => ({
        name,
        sortOrder: index,
        color: STAGE_COLORS[index] ?? "#64748b",
        isDefault: name === "New Lead",
        userId: null,
      })),
    );
    console.log("Seeded default pipeline stages.");
  }

  const existingPlans = await db.select().from(plans).limit(1);
  if (existingPlans.length === 0) {
    await db.insert(plans).values([
      {
        id: "free",
        name: "Free",
        priceMonthly: 0,
        limits: {
          searches: 100,
          leads: 25,
          ai_analyses: 10,
          sms: 50,
          emails: 50,
        },
      },
      {
        id: "pro",
        name: "Pro",
        priceMonthly: 9900,
        limits: {
          searches: 2000,
          leads: 500,
          ai_analyses: 200,
          sms: 1000,
          emails: 1000,
        },
        stripePriceId: "price_pro_demo",
      },
      {
        id: "team",
        name: "Team",
        priceMonthly: 19900,
        limits: {
          searches: 10000,
          leads: 2500,
          ai_analyses: 1000,
          sms: 5000,
          emails: 5000,
        },
        stripePriceId: "price_team_demo",
      },
    ]);
    console.log("Seeded billing plans.");
  }

  const systemUserId = "system";
  const systemUser = await db
    .select()
    .from(users)
    .where(eq(users.id, systemUserId))
    .limit(1);

  if (systemUser.length === 0) {
    await db.insert(users).values({
      id: systemUserId,
      email: "system@auroradealflow.com",
      name: "System",
    });
  }

  for (const playbook of PLAYBOOKS) {
    const existing = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.playbookKey, playbook.key))
      .limit(1);

    if (existing.length > 0) continue;

    const [created] = await db
      .insert(campaigns)
      .values({
        userId: systemUserId,
        name: playbook.name,
        description: playbook.description,
        playbookKey: playbook.key,
        status: "active",
        isTemplate: true,
      })
      .returning();

    await db.insert(campaignSteps).values(
      playbook.steps.map((step) => ({
        campaignId: created!.id,
        sortOrder: step.sortOrder,
        channel: step.channel,
        delayDays: step.delayDays,
        subject: "subject" in step ? step.subject : null,
        template: step.template,
      })),
    );

    console.log(`Seeded playbook: ${playbook.name}`);
  }

  const demoUserId = process.env.SEED_USER_ID;
  if (demoUserId) {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, demoUserId))
      .limit(1);

    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: demoUserId,
        email: "demo@auroradealflow.com",
        name: "Demo User",
      });
      console.log("Seeded demo user.");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
