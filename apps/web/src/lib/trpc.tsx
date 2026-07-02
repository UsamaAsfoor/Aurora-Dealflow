"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import { useMemo, useState } from "react";
import type { AppRouter } from "@aurora/trpc";
import { useAuth } from "@/lib/auth";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [queryClient] = useState(() => new QueryClient());

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: `${getBaseUrl()}/trpc`,
            transformer: superjson,
            headers() {
              return token ? { Authorization: `Bearer ${token}` } : {};
            },
          }),
        ],
      }),
    [token],
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

export type { AppRouter };
