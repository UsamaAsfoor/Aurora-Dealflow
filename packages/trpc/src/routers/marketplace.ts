import { and, desc, eq, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  buyBoxes,
  buyers,
  dealRooms,
  leads,
  listingUnlocks,
  marketplaceBlasts,
  marketplaceListings,
  users,
} from "@aurora/db";
import { createCommsService } from "@aurora/integrations";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";
import {
  checkUsageLimit,
  incrementUsage,
} from "../services/usage-service.js";

const buyBoxSchema = z.object({
  areas: z.array(z.string()).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  propertyTypes: z.array(z.string()).optional(),
  strategies: z.array(z.string()).optional(),
  dealsPerMonth: z.number().int().optional(),
  capitalRange: z.string().optional(),
  smsConsent: z.boolean().optional(),
});

function teaserRow(listing: typeof marketplaceListings.$inferSelect) {
  return {
    id: listing.id,
    city: listing.city,
    state: listing.state,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft,
    photoUrl: listing.photoUrl,
    arv: listing.arv,
    askingPrice: listing.askingPrice,
    strategy: listing.strategy,
    teaserSummary: listing.teaserSummary,
    publishedAt: listing.publishedAt,
    addressBlurred: true as const,
  };
}

function matchesBuyBox(
  box: {
    areas: unknown;
    minPrice: string | null;
    maxPrice: string | null;
    propertyTypes: unknown;
    strategies: unknown;
  } | null,
  listing: {
    city: string;
    state: string;
    askingPrice: string | null;
    arv: string | null;
    strategy: string | null;
  },
  propertyType?: string | null,
) {
  if (!box) return true;

  const price = Number(listing.askingPrice ?? listing.arv ?? 0);
  const min = Number(box.minPrice ?? 0);
  const max = Number(box.maxPrice ?? Number.MAX_SAFE_INTEGER);
  if (price > 0 && (price < min || price > max)) return false;

  const areas = (box.areas as string[] | null) ?? [];
  if (areas.length > 0) {
    const hay = `${listing.city} ${listing.state}`.toLowerCase();
    const areaHit = areas.some((a) => hay.includes(a.toLowerCase()) || a.toLowerCase().includes(listing.city.toLowerCase()));
    if (!areaHit) return false;
  }

  const strategies = (box.strategies as string[] | null) ?? [];
  if (strategies.length > 0 && listing.strategy) {
    if (!strategies.some((s) => s.toLowerCase() === listing.strategy!.toLowerCase())) {
      return false;
    }
  }

  const types = (box.propertyTypes as string[] | null) ?? [];
  if (types.length > 0 && propertyType) {
    if (!types.some((t) => t.toLowerCase() === propertyType.toLowerCase())) {
      return false;
    }
  }

  return true;
}

export const marketplaceRouter = router({
  listTeasers: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.status, "published"))
      .orderBy(desc(marketplaceListings.publishedAt))
      .limit(100);

    return rows.map(teaserRow);
  }),

  getListing: publicProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const listing = await ctx.db.query.marketplaceListings.findFirst({
        where: eq(marketplaceListings.id, input.listingId),
      });

      if (!listing || listing.status !== "published") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }

      const teaser = teaserRow(listing);

      if (!ctx.userId) {
        return { ...teaser, unlocked: false, full: null };
      }

      const isPublisher = listing.publisherUserId === ctx.userId;
      const unlock = await ctx.db.query.listingUnlocks.findFirst({
        where: and(
          eq(listingUnlocks.listingId, listing.id),
          eq(listingUnlocks.userId, ctx.userId),
        ),
      });

      const unlocked = isPublisher || Boolean(unlock);

      if (!unlocked) {
        return { ...teaser, unlocked: false, full: null };
      }

      return {
        ...teaser,
        unlocked: true,
        full: {
          fullAddress: listing.fullAddress,
          line1: listing.line1,
          zip: listing.zip,
          gallery: listing.gallery,
          dealRoomId: listing.dealRoomId,
        },
      };
    }),

  unlockListing: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.query.marketplaceListings.findFirst({
        where: eq(marketplaceListings.id, input.listingId),
      });

      if (!listing || listing.status !== "published") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }

      const existing = await ctx.db.query.listingUnlocks.findFirst({
        where: and(
          eq(listingUnlocks.listingId, listing.id),
          eq(listingUnlocks.userId, ctx.userId),
        ),
      });

      if (!existing) {
        await ctx.db.insert(listingUnlocks).values({
          listingId: listing.id,
          userId: ctx.userId,
        });
      }

      return { success: true };
    }),

  publishFromDeal: protectedProcedure
    .input(
      z.object({
        dealRoomId: z.string().uuid(),
        askingPrice: z.number().optional(),
        strategy: z.string().optional(),
        teaserSummary: z.string().optional(),
        disclaimerAccepted: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.disclaimerAccepted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accept the as-is marketplace disclaimer to publish",
        });
      }

      const room = await ctx.db.query.dealRooms.findFirst({
        where: eq(dealRooms.id, input.dealRoomId),
      });

      if (!room || room.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal room not found" });
      }

      const lead = await ctx.db.query.leads.findFirst({
        where: eq(leads.id, room.leadId),
        with: { property: true },
      });

      if (!lead?.property) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
      }

      const prop = lead.property;
      const existing = await ctx.db.query.marketplaceListings.findFirst({
        where: and(
          eq(marketplaceListings.dealRoomId, room.id),
          eq(marketplaceListings.status, "published"),
        ),
      });

      if (existing) {
        return existing;
      }

      const asking =
        input.askingPrice ??
        Number(room.mao ?? room.arv ?? 0);

      const [listing] = await ctx.db
        .insert(marketplaceListings)
        .values({
          dealRoomId: room.id,
          publisherUserId: ctx.userId,
          city: prop.city,
          state: prop.state,
          beds: prop.beds,
          baths: prop.baths,
          sqft: prop.sqft,
          photoUrl: null,
          arv: room.arv,
          askingPrice: String(asking),
          strategy: input.strategy ?? room.status ?? "wholesale",
          teaserSummary:
            input.teaserSummary ??
            `${prop.beds ?? "—"}bd / ${prop.baths ?? "—"}ba in ${prop.city}. Off-market opportunity.`,
          fullAddress: `${prop.line1}, ${prop.city}, ${prop.state} ${prop.zip}`,
          line1: prop.line1,
          zip: prop.zip,
          gallery: [],
        })
        .returning();

      return listing;
    }),

  updateBuyBox: protectedProcedure
    .input(buyBoxSchema)
    .mutation(async ({ ctx, input }) => {
      let buyer = await ctx.db.query.buyers.findFirst({
        where: eq(buyers.userId, ctx.userId),
        with: { buyBox: true },
      });

      if (!buyer) {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.userId),
        });
        const [created] = await ctx.db
          .insert(buyers)
          .values({
            userId: ctx.userId,
            name: user?.name ?? user?.email ?? "Buyer",
            email: user?.email,
          })
          .returning();
        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create buyer profile",
          });
        }
        buyer = await ctx.db.query.buyers.findFirst({
          where: eq(buyers.id, created.id),
          with: { buyBox: true },
        });
      }

      if (!buyer) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Buyer profile missing",
        });
      }

      const values = {
        areas: input.areas,
        minPrice: input.minPrice != null ? String(input.minPrice) : null,
        maxPrice: input.maxPrice != null ? String(input.maxPrice) : null,
        propertyTypes: input.propertyTypes,
        strategies: input.strategies,
        dealsPerMonth: input.dealsPerMonth,
        capitalRange: input.capitalRange,
        smsConsent: input.smsConsent ?? false,
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

  getMyBuyBox: protectedProcedure.query(async ({ ctx }) => {
    const buyer = await ctx.db.query.buyers.findFirst({
      where: eq(buyers.userId, ctx.userId),
      with: { buyBox: true },
    });
    return buyer?.buyBox ?? null;
  }),

  blastMatchedBuyers: protectedProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        message: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkUsageLimit(ctx.db, ctx.userId, "blasts");

      const listing = await ctx.db.query.marketplaceListings.findFirst({
        where: eq(marketplaceListings.id, input.listingId),
      });

      if (!listing || listing.publisherUserId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }

      const crmBuyers = await ctx.db.query.buyers.findMany({
        where: eq(buyers.userId, ctx.userId),
        with: { buyBox: true },
      });

      const platformBuyers = await ctx.db
        .select({
          buyer: buyers,
          buyBox: buyBoxes,
        })
        .from(buyers)
        .innerJoin(users, eq(users.id, buyers.userId))
        .leftJoin(buyBoxes, eq(buyBoxes.buyerId, buyers.id))
        .where(or(eq(users.role, "buyer"), eq(buyBoxes.smsConsent, true)));

      const seen = new Set<string>();
      const matched: Array<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        smsConsent: boolean;
      }> = [];

      for (const buyer of crmBuyers) {
        if (!matchesBuyBox(buyer.buyBox, listing)) continue;
        if (seen.has(buyer.id)) continue;
        seen.add(buyer.id);
        matched.push({
          id: buyer.id,
          name: buyer.name,
          email: buyer.email,
          phone: buyer.phone,
          smsConsent: buyer.buyBox?.smsConsent ?? false,
        });
      }

      for (const row of platformBuyers) {
        if (row.buyer.userId === ctx.userId) continue;
        if (!matchesBuyBox(row.buyBox, listing)) continue;
        if (seen.has(row.buyer.id)) continue;
        seen.add(row.buyer.id);
        matched.push({
          id: row.buyer.id,
          name: row.buyer.name,
          email: row.buyer.email,
          phone: row.buyer.phone,
          smsConsent: row.buyBox?.smsConsent ?? false,
        });
      }

      const appUrl =
        process.env.APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://localhost:3000";
      const deepLink = `${appUrl}/marketplace/${listing.id}`;
      const body =
        input.message ??
        `Aurora deal: Asking $${Number(listing.askingPrice ?? 0).toLocaleString()} / ARV $${Number(listing.arv ?? 0).toLocaleString()} — ${listing.city}, ${listing.state}. Open: ${deepLink}`;

      const { getUserSmsCredentials } = await import(
        "../services/messaging-credentials.js"
      );
      const byoSms = await getUserSmsCredentials(ctx.db, ctx.userId, "twilio");
      const comms = createCommsService({ sms: byoSms });
      const results: Array<Record<string, unknown>> = [];

      for (const buyer of matched) {
        if (buyer.phone && buyer.smsConsent) {
          const sms = await comms.sendSms({ to: buyer.phone, body });
          results.push({ buyerId: buyer.id, channel: "sms", ...sms });
          await incrementUsage(ctx.db, ctx.userId, "sms");
        }
        if (buyer.email) {
          const email = await comms.sendEmail({
            to: buyer.email,
            subject: `Off-market: ${listing.city}, ${listing.state}`,
            body,
          });
          results.push({ buyerId: buyer.id, channel: "email", ...email });
          await incrementUsage(ctx.db, ctx.userId, "emails");
        }
      }

      await ctx.db.insert(marketplaceBlasts).values({
        listingId: listing.id,
        publisherUserId: ctx.userId,
        channel: "sms+email",
        recipientCount: matched.length,
        body,
        metadata: { results },
      });

      await incrementUsage(ctx.db, ctx.userId, "blasts");

      const providers = results.map((r) => {
        const meta = r.metadata as { provider?: string } | undefined;
        return meta?.provider ?? (r.provider as string | undefined) ?? "unknown";
      });

      return {
        matchedCount: matched.length,
        sentCount: results.length,
        demoMode:
          results.length === 0 ||
          providers.every((p) => p === "demo"),
        results,
      };
    }),
});
