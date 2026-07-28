import { eq } from "drizzle-orm";
import { users } from "@aurora/db";
import { publicProcedure, router } from "../trpc.js";

export const userRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) return null;
    const row = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
    });
    return {
      id: ctx.userId,
      email: ctx.userEmail,
      name: row?.name ?? null,
      role: row?.role ?? "wholesaler",
    };
  }),
});
