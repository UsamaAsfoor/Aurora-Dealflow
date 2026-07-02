import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { TrpcProvider } from "../src/lib/trpc";
import { AuthProvider } from "../src/lib/auth";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TrpcProvider queryClient={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </TrpcProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
