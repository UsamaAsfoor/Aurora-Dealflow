import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { users } from "@aurora/db";
import { signAccessToken } from "../auth/jwt.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { publicProcedure, router } from "../trpc.js";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const authRouter = router({
  register: publicProcedure
    .input(
      credentialsSchema.extend({
        name: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      if (existing[0]) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const userId = randomUUID();
      const passwordHash = await hashPassword(input.password);

      await ctx.db.insert(users).values({
        id: userId,
        email: input.email.toLowerCase(),
        name: input.name ?? null,
        passwordHash,
      });

      const token = signAccessToken({
        sub: userId,
        email: input.email.toLowerCase(),
      });

      return {
        token,
        user: {
          id: userId,
          email: input.email.toLowerCase(),
          name: input.name ?? null,
        },
      };
    }),

  login: publicProcedure
    .input(credentialsSchema)
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      const user = row[0];
      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const token = signAccessToken({
        sub: user.id,
        email: user.email,
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    }),
});
