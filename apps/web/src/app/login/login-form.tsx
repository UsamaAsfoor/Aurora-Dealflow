"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";

export function LoginForm() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  useEffect(() => {
    if (user) {
      router.replace("/dashboard/search");
    }
  }, [user, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      const result =
        mode === "login"
          ? await loginMutation.mutateAsync({ email, password })
          : await registerMutation.mutateAsync({
              email,
              password,
              name: name || undefined,
            });

      login(result.token, result.user);
      router.push("/dashboard/search");
    } catch (err) {
      if (err instanceof TRPCClientError) {
        setError(err.message);
      } else {
        setError("Authentication failed");
      }
    }
  }

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <AppShell>
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl" />
        </div>

        <Card className="relative w-full max-w-md shadow-lg shadow-slate-200/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-sm shadow-blue-600/25">
              A
            </div>
            <CardTitle className="text-xl">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to access your deal pipeline"
                : "Start finding and scoring investment opportunities"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending
                  ? "Please wait..."
                  : mode === "login"
                    ? "Sign In"
                    : "Create Account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === "login" ? "New here?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="font-semibold text-blue-600 transition-colors hover:text-blue-700"
                onClick={() =>
                  setMode(mode === "login" ? "register" : "login")
                }
              >
                {mode === "login" ? "Create an account" : "Sign in"}
              </button>
            </p>

            <p className="mt-4 text-center text-sm">
              <Link
                href="/"
                className="text-slate-500 transition-colors hover:text-slate-700"
              >
                ← Back to home
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
