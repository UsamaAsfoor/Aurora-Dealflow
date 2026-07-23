"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import { useState } from "react";
import type { AppRouter } from "@aurora/trpc";
import { getStoredToken } from "@/lib/auth";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              const message =
                error instanceof Error ? error.message : String(error);
              if (message.includes("UNAUTHORIZED")) return false;
              return failureCount < 1;
            },
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
            // Read at request time so logins/refreshes always attach the latest JWT
            const token = getStoredToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

export type { AppRouter };
