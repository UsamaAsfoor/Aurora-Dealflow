"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";

export default function MarketplaceListingPage() {
  const params = useParams<{ listingId: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const utils = trpc.useUtils();

  const listingQuery = trpc.marketplace.getListing.useQuery({
    listingId: params.listingId,
  });
  const unlock = trpc.marketplace.unlockListing.useMutation({
    onSuccess: () => utils.marketplace.getListing.invalidate({ listingId: params.listingId }),
  });

  const listing = listingQuery.data;

  return (
    <div className="min-h-screen bg-[#0f0e0c] text-[#f4efe6]">
      <header className="border-b border-[#2a2318] px-4 py-5 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/marketplace" className="text-sm text-[#a39a8d] hover:text-[#e0b02a]">
            ← Marketplace
          </Link>
          <Link href="/" className="text-[#e0b02a]">
            Aurora
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
        {listingQuery.isLoading && (
          <p className="text-sm text-[#a39a8d]">Loading…</p>
        )}

        {listing && (
          <>
            <p className="text-xs uppercase tracking-wider text-[#e0b02a]">
              {listing.strategy ?? "Off-market"}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl md:text-4xl">
              {listing.city}, {listing.state}
            </h1>

            {listing.unlocked && listing.full ? (
              <p className="mt-3 text-lg text-[#f4efe6]">
                {listing.full.fullAddress}
              </p>
            ) : (
              <p className="mt-3 blur-sm select-none text-lg text-[#a39a8d]">
                Full street address hidden until unlock
              </p>
            )}

            <p className="mt-4 text-[#a39a8d]">
              {listing.beds ?? "—"} bd · {listing.baths ?? "—"} ba ·{" "}
              {listing.sqft ? `${listing.sqft.toLocaleString()} sf` : "—"}
            </p>
            <p className="mt-2 text-[#a39a8d]">{listing.teaserSummary}</p>

            <div className="mt-8 grid gap-4 border border-[#2a2318] bg-[#161410] p-6 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-[#6f675c]">Asking</p>
                <p className="text-2xl text-[#e0b02a]">
                  ${Number(listing.askingPrice ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-[#6f675c]">ARV</p>
                <p className="text-2xl">
                  ${Number(listing.arv ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            {!listing.unlocked && (
              <div className="mt-8 border border-[#d4a017]/30 bg-[#1c1916] p-6">
                <p className="font-medium text-[#f4efe6]">Join to view full address</p>
                <p className="mt-2 text-sm text-[#a39a8d]">
                  Create a buyer account with your buy box, or sign in and unlock.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={() => router.push("/marketplace/join")}>
                    Join as buyer
                  </Button>
                  {token ? (
                    <Button
                      variant="secondary"
                      disabled={unlock.isPending}
                      onClick={() => unlock.mutate({ listingId: params.listingId })}
                    >
                      Unlock listing
                    </Button>
                  ) : (
                    <Link href="/login">
                      <Button variant="secondary">Sign in</Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
