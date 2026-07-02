import { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { router } from "expo-router";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "../src/lib/trpc";
import { useAuth } from "../src/lib/auth";

export default function LoginScreen() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const loginMutation = trpc.auth.login.useMutation();

  if (user) {
    router.replace("/(tabs)/search");
  }

  async function handleLogin() {
    setError(null);
    try {
      const result = await loginMutation.mutateAsync({ email, password });
      await login(result.token, result.user);
      router.replace("/(tabs)/search");
    } catch (err) {
      setError(err instanceof TRPCClientError ? err.message : "Login failed");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aurora DealFlow</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Sign In" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
  },
  error: { color: "#dc2626" },
});
