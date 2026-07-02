import { View, Text, FlatList, StyleSheet } from "react-native";
import { trpc } from "../../src/lib/trpc";

export default function SearchScreen() {
  const searchQuery = trpc.property.search.useQuery({ sortBy: "score" });

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Nearby / Demo Search</Text>
      <FlatList
        data={searchQuery.data?.results ?? []}
        keyExtractor={(item) => item.attomId}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.address.line1}</Text>
            <Text style={styles.subtitle}>
              {item.address.city}, {item.address.state} · Score {item.score ?? "—"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  title: { fontWeight: "600" },
  subtitle: { color: "#64748b", marginTop: 4 },
});
