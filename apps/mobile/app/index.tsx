import { Redirect } from "expo-router";
import { useAuth } from "../src/lib/auth";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)/search" />;
}
