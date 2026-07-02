import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { buyers, buyBoxes } from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";

export const buyerRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(buyers)
      .where(eq(buyers.userId, ctx.userId))
      .orderBy(desc(buyers.updatedAt));
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        notes: z.string().optional(),
        buyBox: z
          .object({
            areas: z.array(z.string()).optional(),
            minPrice: z.number().optional(),
            maxPrice: z.number().optional(),
            propertyTypes: z.array(z.string()).optional(),
            strategies: z.array(z.string()).optional(),
          })
          .optional(),
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
        .where(eq(buyers.id, input.buyerId));

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
