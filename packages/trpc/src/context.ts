import type { Db } from "@aurora/db";
import type { AttomClient } from "@aurora/integrations";
import type { OpenAiAnalysisService } from "@aurora/integrations";

export interface TrpcContext {
  db: Db;
  attom: AttomClient;
  openai: OpenAiAnalysisService;
  userId: string | null;
  userEmail: string | null;
}

export type CreateContextOptions = {
  db: Db;
  attom: AttomClient;
  openai: OpenAiAnalysisService;
  userId?: string | null;
  userEmail?: string | null;
};

export function createContext(options: CreateContextOptions): TrpcContext {
  return {
    db: options.db,
    attom: options.attom,
    openai: options.openai,
    userId: options.userId ?? null,
    userEmail: options.userEmail ?? null,
  };
}
