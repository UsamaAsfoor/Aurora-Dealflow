import { View, Text, ScrollView, StyleSheet } from "react-native";
import { trpc } from "../../src/lib/trpc";

export default function PipelineScreen() {
  const boardQuery = trpc.pipeline.listBoard.useQuery();

  return (
    <ScrollView horizontal style={styles.container}>
      {boardQuery.data?.map((stage) => (
        <View key={stage.id} style={styles.column}>
          <Text style={styles.stageTitle}>
            {stage.name} ({stage.leads.length})
          </Text>
          {stage.leads.map((lead) => (
            <View key={lead.id} style={styles.card}>
              <Text style={styles.leadTitle}>{lead.line1}</Text>
              <Text style={styles.leadSubtitle}>{lead.city}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingVertical: 16 },
  column: {
    width: 260,
    marginHorizontal: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 12,
  },
  stageTitle: { fontWeight: "700", marginBottom: 8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  leadTitle: { fontWeight: "600", fontSize: 13 },
  leadSubtitle: { color: "#64748b", fontSize: 12, marginTop: 2 },
});
