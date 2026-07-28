import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { buyers, buyBoxes } from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";

const buyBoxInput = z.object({
  areas: z.array(z.string()).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  propertyTypes: z.array(z.string()).optional(),
  strategies: z.array(z.string()).optional(),
  dealsPerMonth: z.number().int().optional(),
  capitalRange: z.string().optional(),
  smsConsent: z.boolean().optional(),
});

export const buyerRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.buyers.findMany({
      where: eq(buyers.userId, ctx.userId),
      with: { buyBox: true },
      orderBy: [desc(buyers.updatedAt)],
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        notes: z.string().optional(),
        buyBox: buyBoxInput.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [buyer] = await ctx.db
        .insert(buyers)
        .values({
          userId: ctx.userId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          company: input.company,
          notes: input.notes,
        })
        .returning();

      if (input.buyBox) {
        await ctx.db.insert(buyBoxes).values({
          buyerId: buyer!.id,
          areas: input.buyBox.areas,
          minPrice:
            input.buyBox.minPrice != null
              ? String(input.buyBox.minPrice)
              : null,
          maxPrice:
            input.buyBox.maxPrice != null
              ? String(input.buyBox.maxPrice)
              : null,
          propertyTypes: input.buyBox.propertyTypes,
          strategies: input.buyBox.strategies,
          dealsPerMonth: input.buyBox.dealsPerMonth,
          capitalRange: input.buyBox.capitalRange,
          smsConsent: input.buyBox.smsConsent ?? false,
        });
      }

      return buyer;
    }),

  update: protectedProcedure
    .input(
      z.object({
        buyerId: z.string().uuid(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(buyers)
        .set({
          name: input.name,
          email: input.email,
          phone: input.phone,
          company: input.company,
          notes: input.notes,
          updatedAt: new Date(),
        })
        .where(
          and(eq(buyers.id, input.buyerId), eq(buyers.userId, ctx.userId)),
        );

      return { success: true };
    }),

  updateBuyBox: protectedProcedure
    .input(
      z.object({
        buyerId: z.string().uuid(),
        buyBox: buyBoxInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const buyer = await ctx.db.query.buyers.findFirst({
        where: and(
          eq(buyers.id, input.buyerId),
          eq(buyers.userId, ctx.userId),
        ),
        with: { buyBox: true },
      });

      if (!buyer) throw new Error("Buyer not found");

      const values = {
        areas: input.buyBox.areas,
        minPrice:
          input.buyBox.minPrice != null
            ? String(input.buyBox.minPrice)
            : null,
        maxPrice:
          input.buyBox.maxPrice != null
            ? String(input.buyBox.maxPrice)
            : null,
        propertyTypes: input.buyBox.propertyTypes,
        strategies: input.buyBox.strategies,
        dealsPerMonth: input.buyBox.dealsPerMonth,
        capitalRange: input.buyBox.capitalRange,
        smsConsent: input.buyBox.smsConsent ?? false,
        updatedAt: new Date(),
      };

      if (buyer.buyBox) {
        await ctx.db
          .update(buyBoxes)
          .set(values)
          .where(eq(buyBoxes.buyerId, buyer.id));
      } else {
        await ctx.db.insert(buyBoxes).values({
          buyerId: buyer.id,
          ...values,
        });
      }

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ buyerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(buyers)
        .where(and(eq(buyers.id, input.buyerId), eq(buyers.userId, ctx.userId)));
      return { success: true };
    }),
});
