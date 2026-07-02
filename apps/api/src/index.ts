import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import express from "express";
import { AttomClient, OpenAiAnalysisService } from "@aurora/integrations";
import { createDb } from "@aurora/db";
import {
  appRouter,
  createContext,
  extractBearerToken,
  verifyAccessToken,
} from "@aurora/trpc";
import { processDueCampaignSteps } from "@aurora/trpc";

const PORT = Number(process.env.PORT ?? 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://aurora:aurora@localhost:5434/aurora_dealflow";

const db = createDb(DATABASE_URL);
const attom = new AttomClient({ apiKey: process.env.ATTOM_API_KEY, db });
const openai = new OpenAiAnalysisService(process.env.OPENAI_API_KEY);

const metrics = {
  requests: 0,
  campaignStepsProcessed: 0,
  startedAt: new Date().toISOString(),
};

const app = express();

app.use(
  cors({
    origin: WEB_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json());

app.use((_req, _res, next) => {
  metrics.requests++;
  next();
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    demoMode: attom.isDemoMode(),
    uptime: process.uptime(),
  });
});

app.get("/metrics", (_req, res) => {
  res.json(metrics);
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) => {
      const token = extractBearerToken(req.headers.authorization);
      const payload = token ? verifyAccessToken(token) : null;

      return createContext({
        db,
        attom,
        openai,
        userId: payload?.sub ?? null,
        userEmail: payload?.email ?? null,
      });
    },
  }),
);

setInterval(async () => {
  try {
    const processed = await processDueCampaignSteps(db);
    metrics.campaignStepsProcessed += processed;
  } catch (error) {
    console.error("Campaign processor error:", error);
  }
}, 60_000);

app.listen(PORT, () => {
  console.log(`Aurora API listening on http://localhost:${PORT}`);
  console.log(`Demo mode: ${attom.isDemoMode() ? "enabled" : "disabled"}`);
});
