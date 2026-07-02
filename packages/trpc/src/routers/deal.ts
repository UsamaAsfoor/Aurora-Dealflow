import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  dealDocuments,
  dealOffers,
  dealRooms,
  leads,
  properties,
  propertyValuations,
  buyers,
} from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";
import { assertLeadOwnership, logActivity } from "../services/activity-service.js";

const DEFAULT_CHECKLIST = [
  { id: "photos", label: "Property photos captured", done: false },
  { id: "comps", label: "Comps reviewed", done: false },
  { id: "offer", label: "Offer calculated", done: false },
  { id: "contract", label: "Purchase contract signed", done: false },
  { id: "title", label: "Title opened", done: false },
  { id: "dispo", label: "Deal blasted to buyers", done: false },
  { id: "closed", label: "Closed / assigned", done: false },
];

export const dealRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: dealRooms.id,
        leadId: dealRooms.leadId,
        status: dealRooms.status,
        arv: dealRooms.arv,
        mao: dealRooms.mao,
        assignmentFee: dealRooms.assignmentFee,
        line1: properties.line1,
        city: properties.city,
        state: properties.state,
        updatedAt: dealRooms.updatedAt,
      })
      .from(dealRooms)
      .innerJoin(leads, eq(dealRooms.leadId, leads.id))
      .innerJoin(properties, eq(leads.propertyId, properties.id))
      .where(eq(dealRooms.userId, ctx.userId))
      .orderBy(desc(dealRooms.updatedAt));
  }),

  getByLeadId: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);

      const room = await ctx.db.query.dealRooms.findFirst({
        where: eq(dealRooms.leadId, input.leadId),
        with: { documents: true, offers: true },
      });

      return room;
    }),

  create: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);

      const existing = await ctx.db.query.dealRooms.findFirst({
        where: eq(dealRooms.leadId, input.leadId),
      });

      if (existing) return existing;

      const lead = await ctx.db.query.leads.findFirst({
        where: eq(leads.id, input.leadId),
        with: { property: { with: { valuation: true } } },
      });

      const avm = Number(lead?.property.valuation?.avm ?? 0);
      const repairEstimate = avm * 0.15;
      const mao = avm * 0.7 - repairEstimate;

      const [room] = await ctx.db
        .insert(dealRooms)
        .values({
          leadId: input.leadId,
          userId: ctx.userId,
          arv: String(avm),
          repairEstimate: String(repairEstimate),
          mao: String(Math.max(mao, 0)),
          assignmentFee: "10000",
          checklist: DEFAULT_CHECKLIST,
        })
        .returning();

      await logActivity(ctx.db, {
        leadId: input.leadId,
        userId: ctx.userId,
        type: "deal",
        title: "Deal room opened",
      });

      return room;
    }),

  update: protectedProcedure
    .input(
      z.object({
        dealRoomId: z.string().uuid(),
        arv: z.number().optional(),
        repairEstimate: z.number().optional(),
        mao: z.number().optional(),
        assignmentFee: z.number().optional(),
        notes: z.string().optional(),
        checklist: z
          .array(
            z.object({
              id: z.string(),
              label: z.string(),
              done: z.boolean(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.dealRooms.findFirst({
        where: eq(dealRooms.id, input.dealRoomId),
      });

      if (!room || room.userId !== ctx.userId) {
        throw new Error("Deal room not found");
      }

      const [updated] = await ctx.db
        .update(dealRooms)
        .set({
          arv: input.arv != null ? String(input.arv) : undefined,
          repairEstimate:
            input.repairEstimate != null
              ? String(input.repairEstimate)
              : undefined,
          mao: input.mao != null ? String(input.mao) : undefined,
          assignmentFee:
            input.assignmentFee != null
              ? String(input.assignmentFee)
              : undefined,
          notes: input.notes,
          checklist: input.checklist,
          updatedAt: new Date(),
        })
        .where(eq(dealRooms.id, input.dealRoomId))
        .returning();

      return updated;
    }),

  addDocument: protectedProcedure
    .input(
      z.object({
        dealRoomId: z.string().uuid(),
        name: z.string().min(1),
        url: z.string().url(),
        docType: z.string().default("other"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.dealRooms.findFirst({
        where: eq(dealRooms.id, input.dealRoomId),
      });

      if (!room || room.userId !== ctx.userId) {
        throw new Error("Deal room not found");
      }

      const [doc] = await ctx.db
        .insert(dealDocuments)
        .values({
          dealRoomId: input.dealRoomId,
          name: input.name,
          url: input.url,
          docType: input.docType,
        })
        .returning();

      return doc;
    }),

  createOffer: protectedProcedure
    .input(
      z.object({
        dealRoomId: z.string().uuid(),
        buyerId: z.string().uuid(),
        amount: z.number(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.dealRooms.findFirst({
        where: eq(dealRooms.id, input.dealRoomId),
      });

      if (!room || room.userId !== ctx.userId) {
        throw new Error("Deal room not found");
      }

      const [offer] = await ctx.db
        .insert(dealOffers)
        .values({
          dealRoomId: input.dealRoomId,
          buyerId: input.buyerId,
          amount: String(input.amount),
          notes: input.notes,
        })
        .returning();

      return offer;
    }),

  matchBuyers: protectedProcedure
    .input(z.object({ dealRoomId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.dealRooms.findFirst({
        where: eq(dealRooms.id, input.dealRoomId),
      });

      if (!room || room.userId !== ctx.userId) {
        throw new Error("Deal room not found");
      }

      const lead = await ctx.db.query.leads.findFirst({
        where: eq(leads.id, room.leadId),
        with: { property: { with: { valuation: true } } },
      });

      const avm = Number(lead?.property.valuation?.avm ?? 0);

      const allBuyers = await ctx.db.query.buyers.findMany({
        where: eq(buyers.userId, ctx.userId),
        with: { buyBox: true },
      });

      return allBuyers
        .filter((buyer) => {
          const box = buyer.buyBox;
          if (!box) return true;
          const min = Number(box.minPrice ?? 0);
          const max = Number(box.maxPrice ?? Number.MAX_SAFE_INTEGER);
          return avm >= min && avm <= max;
        })
        .map((buyer) => ({
          id: buyer.id,
          name: buyer.name,
          email: buyer.email,
          phone: buyer.phone,
          company: buyer.company,
        }));
    }),
});
