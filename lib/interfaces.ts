import { InterviewSession, ScoreCard } from "./domain/InterviewSession";

export interface IPromptBuilder {
  buildSystemPrompt(session: InterviewSession): string;
}

export interface ILLMClient {
  streamCompletion(
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    onChunk: (text: string) => void
  ): Promise<string>;
}

export interface IResponseParser {
  detectRoleSuggestion(text: string): string | null;
  detectRoleOptions(text: string): boolean;
  detectInterviewStart(text: string, userMessage: string): boolean;
  detectDebriefStart(text: string): boolean;
  extractScoreCard(text: string): ScoreCard | null;
}

export interface ISessionStore {
  get(sessionId: string): InterviewSession | undefined;
  set(session: InterviewSession): void;
  delete(sessionId: string): void;
}

export interface IRoleDetector {
  detectPreferredRole(userMessage: string): string | null;
  looksLikeInterviewRequest(userMessage: string): boolean;
}

export interface ILLMClientFactory {
  create(): ILLMClient;
}
