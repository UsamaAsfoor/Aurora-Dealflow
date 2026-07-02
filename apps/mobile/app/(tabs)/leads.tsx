import { View, Text, FlatList, StyleSheet } from "react-native";
import { trpc } from "../../src/lib/trpc";

export default function LeadsScreen() {
  const leadsQuery = trpc.lead.list.useQuery();

  return (
    <View style={styles.container}>
      <FlatList
        data={leadsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.line1}</Text>
            <Text style={styles.subtitle}>
              {item.pipelineStageName} · {item.city}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No leads saved yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  title: { fontWeight: "600" },
  subtitle: { color: "#64748b", marginTop: 4 },
  empty: { textAlign: "center", color: "#64748b", marginTop: 40 },
});
