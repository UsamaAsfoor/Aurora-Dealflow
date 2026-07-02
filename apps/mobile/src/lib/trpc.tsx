import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import { useMemo } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { AppRouter } from "@aurora/trpc";
import { useAuth } from "./auth";

export const trpc = createTRPCReact<AppRouter>();

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4001";

export function TrpcProvider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  const { token } = useAuth();

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: `${API_URL}/trpc`,
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
      {children}
    </trpc.Provider>
  );
}
