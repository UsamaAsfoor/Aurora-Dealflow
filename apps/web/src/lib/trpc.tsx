"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import { useEffect, useRef, useState } from "react";
import type { AppRouter } from "@aurora/trpc";
import { getStoredToken, useAuth } from "@/lib/auth";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4002";
}

function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    return (
      error.data?.code === "UNAUTHORIZED" ||
      error.message.includes("UNAUTHORIZED")
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("UNAUTHORIZED");
}

function TrpcClientProvider({ children }: { children: React.ReactNode }) {
  const { token, logout } = useAuth();
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
              if (isUnauthorizedError(error)) return false;
              return failureCount < 1;
            },
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/trpc`,
          transformer: superjson,
          headers() {
            // Prefer live auth token from React state; fall back to localStorage
            const bearer = tokenRef.current ?? getStoredToken();
            return bearer ? { Authorization: `Bearer ${bearer}` } : {};
          },
          fetch(url, options) {
            return fetch(url, options).then(async (response) => {
              if (response.status === 401) {
                queueMicrotask(() => logoutRef.current());
              }
              return response;
            });
          },
        }),
      ],
    }),
  );

  useEffect(() => {
    if (token) {
      void queryClient.invalidateQueries();
    }
  }, [token, queryClient]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  return <TrpcClientProvider>{children}</TrpcClientProvider>;
}

export type { AppRouter };
