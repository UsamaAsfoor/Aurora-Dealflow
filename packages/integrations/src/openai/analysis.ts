import OpenAI from "openai";
import type {
  AiAnalysisResult,
  DealStrategy,
  OpportunityScoreResult,
  PropertySignals,
} from "@aurora/core";
import { strategyLabel } from "@aurora/core";

const VALID_STRATEGIES: DealStrategy[] = [
  "list",
  "cash_offer",
  "wholesale",
  "hold",
  "flip",
  "buyer_match",
  "follow_up_later",
];

export class OpenAiAnalysisService {
  private client: OpenAI | null;
  private useDemo: boolean;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    this.useDemo =
      !key || key === "sk-..." || process.env.OPENAI_USE_DEMO === "true";
    this.client = this.useDemo ? null : new OpenAI({ apiKey: key });
  }

  async generateAnalysis(
    signals: PropertySignals,
    scoreResult: OpportunityScoreResult,
    propertySummary: string,
  ): Promise<AiAnalysisResult> {
    if (this.useDemo) {
      return this.generateDemoAnalysis(signals, scoreResult, propertySummary);
    }

    const prompt = `You are a real estate investment analyst. Based ONLY on the computed signals below, write:
1. A 2-3 sentence property opportunity summary
2. A recommended deal strategy (one of: ${VALID_STRATEGIES.join(", ")})
3. 1-2 sentences of reasoning

Property: ${propertySummary}
Computed Score: ${scoreResult.score}/100
Signals:
${scoreResult.breakdown
  .map(
    (s) =>
      `- ${s.label}: raw=${String(s.rawValue)}, contribution=${s.contribution.toFixed(1)}`,
  )
  .join("\n")}

Respond in JSON: { "summary": "...", "strategy": "...", "reasoning": "..." }`;

    const response = await this.client!.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return this.generateDemoAnalysis(signals, scoreResult, propertySummary);
    }

    const parsed = JSON.parse(content) as {
      summary?: string;
      strategy?: string;
      reasoning?: string;
    };

    const strategy = VALID_STRATEGIES.includes(parsed.strategy as DealStrategy)
      ? (parsed.strategy as DealStrategy)
      : this.inferStrategy(signals, scoreResult.score);

    return {
      score: scoreResult.score,
      breakdown: scoreResult.breakdown,
      summary: parsed.summary ?? this.generateDemoAnalysis(signals, scoreResult, propertySummary).summary,
      strategy,
      reasoning: parsed.reasoning ?? strategyLabel(strategy),
    };
  }

  private inferStrategy(
    signals: PropertySignals,
    score: number,
  ): DealStrategy {
    if (score < 40) return "follow_up_later";
    if (signals.isPreForeclosure) return "cash_offer";
    if ((signals.equityPercent ?? 0) > 70 && signals.isAbsentee) return "wholesale";
    if ((signals.equityPercent ?? 0) > 50) return "flip";
    if (signals.isVacant) return "buyer_match";
    return "cash_offer";
  }

  private generateDemoAnalysis(
    signals: PropertySignals,
    scoreResult: OpportunityScoreResult,
    propertySummary: string,
  ): AiAnalysisResult {
    const parts: string[] = [];
    if ((signals.equityPercent ?? 0) > 60) parts.push("high equity");
    if (signals.isAbsentee) parts.push("absentee owner");
    if (signals.ownershipYears && signals.ownershipYears > 10) {
      parts.push(`${signals.ownershipYears} years owned`);
    }
    if (signals.isPreForeclosure) parts.push("pre-foreclosure status");
    if (signals.isTaxDelinquent) parts.push("tax delinquency");
    if (signals.isVacant) parts.push("vacancy indicator");

    const strategy = this.inferStrategy(signals, scoreResult.score);

    return {
      score: scoreResult.score,
      breakdown: scoreResult.breakdown,
      summary: `${propertySummary} shows ${parts.length > 0 ? parts.join(", ") : "moderate investment signals"}. Opportunity score: ${scoreResult.score}/100.`,
      strategy,
      reasoning: `Based on the computed signals, a ${strategyLabel(strategy).toLowerCase()} approach aligns best with the current distress and equity profile.`,
    };
  }
}
