import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { buyBoxes, buyers, users } from "@aurora/db";
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
        role: z.enum(["wholesaler", "buyer"]).optional(),
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
      const role = input.role ?? "wholesaler";

      await ctx.db.insert(users).values({
        id: userId,
        email: input.email.toLowerCase(),
        name: input.name ?? null,
        passwordHash,
        role,
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
          role,
        },
      };
    }),

  registerBuyer: publicProcedure
    .input(
      credentialsSchema.extend({
        name: z.string().min(1),
        phone: z.string().optional(),
        smsConsent: z.boolean(),
        buyBox: z.object({
          areas: z.array(z.string()).optional(),
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          propertyTypes: z.array(z.string()).optional(),
          strategies: z.array(z.string()).optional(),
          dealsPerMonth: z.number().int().optional(),
          capitalRange: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.smsConsent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "SMS/email consent is required to join the buyer network",
        });
      }

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
        name: input.name,
        passwordHash,
        role: "buyer",
      });

      const [buyer] = await ctx.db
        .insert(buyers)
        .values({
          userId,
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone,
        })
        .returning();

      await ctx.db.insert(buyBoxes).values({
        buyerId: buyer!.id,
        areas: input.buyBox.areas,
        minPrice:
          input.buyBox.minPrice != null ? String(input.buyBox.minPrice) : null,
        maxPrice:
          input.buyBox.maxPrice != null ? String(input.buyBox.maxPrice) : null,
        propertyTypes: input.buyBox.propertyTypes,
        strategies: input.buyBox.strategies,
        dealsPerMonth: input.buyBox.dealsPerMonth,
        capitalRange: input.buyBox.capitalRange,
        smsConsent: true,
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
          name: input.name,
          role: "buyer" as const,
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
          role: user.role ?? "wholesaler",
        },
      };
    }),
});
