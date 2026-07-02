import { router } from "./trpc.js";
import { activityRouter } from "./routers/activity.js";
import { adminRouter } from "./routers/admin.js";
import { analysisRouter } from "./routers/analysis.js";
import { authRouter } from "./routers/auth.js";
import { billingRouter } from "./routers/billing.js";
import { buyerRouter } from "./routers/buyer.js";
import { campaignRouter } from "./routers/campaign.js";
import { commsRouter } from "./routers/comms.js";
import { dealRouter } from "./routers/deal.js";
import { exportRouter } from "./routers/export.js";
import { leadRouter } from "./routers/lead.js";
import { pipelineRouter } from "./routers/pipeline.js";
import { propertyRouter } from "./routers/property.js";
import { skipTraceRouter } from "./routers/skipTrace.js";
import { taskRouter } from "./routers/task.js";
import { userRouter } from "./routers/user.js";

export const appRouter = router({
  auth: authRouter,
  property: propertyRouter,
  lead: leadRouter,
  analysis: analysisRouter,
  user: userRouter,
  pipeline: pipelineRouter,
  task: taskRouter,
  activity: activityRouter,
  campaign: campaignRouter,
  comms: commsRouter,
  skipTrace: skipTraceRouter,
  export: exportRouter,
  deal: dealRouter,
  buyer: buyerRouter,
  billing: billingRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
export type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

export { createContext, type TrpcContext } from "./context.js";
export { createCallerFactory } from "./trpc.js";
export {
  extractBearerToken,
  verifyAccessToken,
  type JwtPayload,
} from "./auth/jwt.js";
export { processDueCampaignSteps } from "./services/campaign-processor.js";
