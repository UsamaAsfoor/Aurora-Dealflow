import Link from "next/link";
import { ArrowRight, Brain, LayoutDashboard, MapPin, Target } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: MapPin,
    title: "Property Search",
    description:
      "Search by address, city, zip, or draw an area on the map. Filter by equity, absentee owner, vacancy, and distress signals.",
  },
  {
    icon: Brain,
    title: "AI Opportunity Score",
    description:
      "Deterministic scoring from weighted signals plus AI-generated summaries and deal strategy recommendations.",
  },
  {
    icon: Target,
    title: "Save as Lead",
    description:
      "Snapshot properties into your pipeline with owner, valuation, tax, and sale history data preserved locally.",
  },
];

export default function HomePage() {
  return (
    <AppShell>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-blue-100/60 blur-3xl" />
          <div className="absolute -right-32 top-40 h-96 w-96 rounded-full bg-indigo-100/50 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 ring-1 ring-blue-100">
              Real estate deal intelligence
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              <span className="text-gradient">Find distressed properties.</span>
              <br />
              Score deals. Close faster.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Aurora DealFlow combines ATTOM property data, AI-powered opportunity
              scoring, and a CRM pipeline built for real estate investors.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/login">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/dashboard/search">
                  <LayoutDashboard className="h-4 w-4" />
                  Open Dashboard
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-24 grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="surface-card-hover group overflow-hidden"
              >
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100 transition-all group-hover:bg-blue-100">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-slate-600">
                  {description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
