"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function MarketplacePage() {
  const teasers = trpc.marketplace.listTeasers.useQuery();

  return (
    <div className="min-h-screen bg-[#0f0e0c] text-[#f4efe6]">
      <header className="border-b border-[#2a2318] px-4 py-5 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <Link href="/" className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[#e0b02a]">
              Aurora
            </Link>
            <p className="mt-1 text-sm text-[#a39a8d]">
              Gated cash-buyer marketplace — teaser first, full address after join
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/marketplace/join">
              <Button size="sm">Join as buyer</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" variant="secondary">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#f4efe6] md:text-4xl">
          Off-market inventory
        </h1>
        <p className="mt-2 max-w-xl text-[#a39a8d]">
          Browse city-level teasers. Unlock full street address and gallery after
          you create a buy box.
        </p>

        {teasers.isLoading && (
          <p className="mt-10 text-sm text-[#a39a8d]">Loading listings…</p>
        )}

        {!teasers.isLoading && (teasers.data?.length ?? 0) === 0 && (
          <div className="mt-12 border border-dashed border-[#3a3228] p-10 text-center">
            <p className="text-[#a39a8d]">
              No published deals yet. Wholesalers publish from Deal Room.
            </p>
            <Link href="/dashboard/deals" className="mt-4 inline-block">
              <Button variant="secondary" size="sm">
                Open Deal Room
              </Button>
            </Link>
          </div>
        )}

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teasers.data?.map((listing) => (
            <Link
              key={listing.id}
              href={`/marketplace/${listing.id}`}
              className="group block border border-[#2a2318] bg-[#161410] p-5 transition hover:border-[#d4a017]/50"
            >
              <div className="mb-4 flex h-36 items-end bg-gradient-to-br from-[#2a2318] to-[#1a1714] p-3">
                <span className="text-xs uppercase tracking-wider text-[#e0b02a]/80">
                  {listing.strategy ?? "Wholesale"}
                </span>
              </div>
              <p className="text-lg font-semibold text-[#f4efe6]">
                {listing.city}, {listing.state}
              </p>
              <p className="mt-1 blur-sm select-none text-sm text-[#a39a8d]">
                123 Hidden Street · Join to view
              </p>
              <p className="mt-3 text-sm text-[#a39a8d]">
                {listing.beds ?? "—"} bd · {listing.baths ?? "—"} ba ·{" "}
                {listing.sqft ? `${listing.sqft.toLocaleString()} sf` : "—"}
              </p>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-[#e0b02a]">
                  Ask ${Number(listing.askingPrice ?? 0).toLocaleString()}
                </span>
                <span className="text-[#a39a8d]">
                  ARV ${Number(listing.arv ?? 0).toLocaleString()}
                </span>
              </div>
              <p className="mt-3 text-xs text-[#6f675c] group-hover:text-[#e0b02a]">
                View teaser →
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
