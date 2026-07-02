import { publicProcedure, router } from "../trpc.js";

export const userRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    if (!ctx.userId) return null;
    return {
      id: ctx.userId,
      email: ctx.userEmail,
    };
  }),
});
