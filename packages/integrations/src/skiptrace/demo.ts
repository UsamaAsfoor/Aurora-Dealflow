export class DemoSkipTraceService {
  async trace(_input: { leadId: string }) {
    return {
      phones: ["(555) 123-4567", "(555) 987-6543"],
      emails: ["owner@example.com"],
      provider: "demo",
      confidence: 0.72,
      note: "Demo skip trace data — connect BatchData or Direct Skip in production.",
    };
  }
}
