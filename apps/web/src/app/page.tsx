"use client";

import Link from "next/link";
import {
  ArrowRight,
  LayoutDashboard,
  MapPinned,
  Store,
  Workflow,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const wedges = [
  {
    icon: MapPinned,
    title: "Acquire",
    description:
      "Source distressed inventory by market and opportunity mode. Score deals, build lists, and push to pipeline.",
  },
  {
    icon: Workflow,
    title: "Work the lead",
    description:
      "Drag-and-drop pipeline, campaigns, skip trace, and deal rooms — from first touch to underwritten offer.",
  },
  {
    icon: Store,
    title: "Dispo",
    description:
      "Publish to a gated cash-buyer marketplace. Capture buy boxes. Blast matched buyers by SMS and email.",
  },
];

const plans = [
  {
    name: "Pro",
    price: "$99",
    blurb: "Search, pipeline, and AI scoring for solo investors.",
  },
  {
    name: "Team",
    price: "$199",
    blurb: "Campaigns, seats, and higher usage for small teams.",
  },
  {
    name: "Scale",
    price: "$399",
    blurb: "Marketplace publish, buyer blasts, and higher limits.",
    highlight: true,
  },
];

export default function HomePage() {
  return (
    <AppShell>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-[#d4a017]/10 blur-3xl" />
          <div className="absolute -right-20 top-40 h-96 w-96 rounded-full bg-[#4a3f32]/30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-md bg-[#2a2318] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#e0b02a] ring-1 ring-[#d4a017]/30">
              Acquire · Dispo · One workspace
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-[#f4efe6] sm:text-6xl">
              <span className="text-gradient">Source inventory.</span>
              <br />
              Dispo to cash buyers.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a39a8d]">
              Aurora combines PropStream-grade list building with an InvestorLift-style
              gated buyer network — without looking like either. Built for wholesalers
              and investors who want a product worth paying for.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/login">
                  Start acquiring
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/marketplace">
                  <Store className="h-4 w-4" />
                  Browse marketplace
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dashboard/search">
                  <LayoutDashboard className="h-4 w-4" />
                  Open dashboard
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-20 grid gap-5 md:grid-cols-3">
            {wedges.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="surface-card-hover overflow-hidden">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-[#2a2318] ring-1 ring-[#4a3f32]">
                    <Icon className="h-5 w-5 text-[#d4a017]" />
                  </div>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-[#a39a8d]">
                  {description}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-24">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-[#f4efe6]">
                Pricing that scales with the work
              </h2>
              <p className="mt-2 text-sm text-[#a39a8d]">
                Competitors charge heavily. Aurora is built to earn it with product.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={
                    plan.highlight
                      ? "ring-1 ring-[#d4a017]/50"
                      : undefined
                  }
                >
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <p className="text-3xl font-bold text-[#e0b02a]">
                      {plan.price}
                      <span className="text-sm font-medium text-[#6f675c]">
                        /mo
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent className="text-sm text-[#a39a8d]">
                    {plan.blurb}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
