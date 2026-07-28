"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";

export default function JoinBuyerPage() {
  const router = useRouter();
  const { login } = useAuth();
  const registerBuyer = trpc.auth.registerBuyer.useMutation({
    onSuccess: (data) => {
      login(data.token, data.user);
      router.push("/marketplace");
    },
  });

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [areas, setAreas] = useState("Phoenix, AZ");
  const [minPrice, setMinPrice] = useState("50000");
  const [maxPrice, setMaxPrice] = useState("400000");
  const [propertyTypes, setPropertyTypes] = useState("SFR");
  const [strategies, setStrategies] = useState("wholesale,fix");
  const [dealsPerMonth, setDealsPerMonth] = useState("2");
  const [capitalRange, setCapitalRange] = useState("$100k–$500k");
  const [smsConsent, setSmsConsent] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f0e0c] text-[#f4efe6]">
      <header className="border-b border-[#2a2318] px-4 py-5">
        <div className="mx-auto flex max-w-xl justify-between">
          <Link href="/marketplace" className="text-[#e0b02a]">
            Aurora Marketplace
          </Link>
          <span className="text-sm text-[#a39a8d]">Step {step} of 3</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Buyer onboarding
        </h1>
        <p className="mt-2 text-sm text-[#a39a8d]">
          Set your buy box so wholesalers can match and blast deals you want.
        </p>

        {step === 1 && (
          <div className="mt-8 space-y-4">
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Password (8+)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input placeholder="Mobile (for SMS blasts)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button disabled={!name || !email || password.length < 8} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-8 space-y-4">
            <Input
              placeholder="Markets / areas (comma-separated)"
              value={areas}
              onChange={(e) => setAreas(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Min price"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <Input
                placeholder="Max price"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
            <Input
              placeholder="Property types (e.g. SFR, Multi)"
              value={propertyTypes}
              onChange={(e) => setPropertyTypes(e.target.value)}
            />
            <Input
              placeholder="Strategies (wholesale, flip, rental)"
              value={strategies}
              onChange={(e) => setStrategies(e.target.value)}
            />
            <Input
              placeholder="Deals per month"
              type="number"
              value={dealsPerMonth}
              onChange={(e) => setDealsPerMonth(e.target.value)}
            />
            <Input
              placeholder="Capital range"
              value={capitalRange}
              onChange={(e) => setCapitalRange(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-8 space-y-4">
            <label className="flex items-start gap-3 text-sm text-[#a39a8d]">
              <input
                type="checkbox"
                className="mt-1"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
              />
              I consent to receive deal SMS and email from Aurora wholesalers.
              Reply STOP to opt out. Listings are as-is; verify independently.
            </label>
            {registerBuyer.error && (
              <p className="text-sm text-red-400">{registerBuyer.error.message}</p>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                disabled={!smsConsent || registerBuyer.isPending}
                onClick={() =>
                  registerBuyer.mutate({
                    name,
                    email,
                    password,
                    phone: phone || undefined,
                    smsConsent,
                    buyBox: {
                      areas: areas.split(",").map((s) => s.trim()).filter(Boolean),
                      minPrice: Number(minPrice) || undefined,
                      maxPrice: Number(maxPrice) || undefined,
                      propertyTypes: propertyTypes
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                      strategies: strategies
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                      dealsPerMonth: Number(dealsPerMonth) || undefined,
                      capitalRange,
                    },
                  })
                }
              >
                Create buyer account
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
