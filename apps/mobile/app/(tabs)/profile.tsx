import { View, Text, Button, StyleSheet, Linking } from "react-native";
import { useAuth } from "../../src/lib/auth";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user?.email}</Text>
      <Text style={styles.subtitle}>Field companion · tap to call/text owners</Text>
      <Button
        title="Call Demo Owner"
        onPress={() => Linking.openURL("tel:5551234567")}
      />
      <Button
        title="Text Demo Owner"
        onPress={() => Linking.openURL("sms:5551234567")}
      />
      <Button title="Sign Out" onPress={() => logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center", color: "#64748b", marginBottom: 16 },
});
