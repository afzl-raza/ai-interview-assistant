// lib/usecases/InterviewOrchestrator.ts

import { InterviewSession } from "../domain/InterviewSession";
import { IPromptBuilder, ILLMClient, IResponseParser, IRoleDetector, ISessionStore } from "../interfaces";

interface Deps {
  promptBuilder: IPromptBuilder;
  llmClient: ILLMClient;
  responseParser: IResponseParser;
  roleDetector: IRoleDetector;
  sessionStore: ISessionStore;
}

export interface ProcessResult {
  fullResponse: string;
  phase: string;
  scoreCard: ReturnType<IResponseParser["extractScoreCard"]>;
}

export class InterviewOrchestrator {
  constructor(private deps: Deps) {}

  async processMessage(
    sessionId: string,
    userMessage: string,
    onChunk: (text: string) => void
  ): Promise<ProcessResult> {
    const { promptBuilder, llmClient, responseParser, roleDetector, sessionStore } = this.deps;

    let session = sessionStore.get(sessionId);
    if (!session) {
      session = new InterviewSession(sessionId);
      sessionStore.set(session);
    }

    const explicitRole = roleDetector.detectPreferredRole(userMessage);
    const wantsInterviewNow = responseParser.detectInterviewStart("", userMessage);

    if (session.phase === "role_suggested") {
      if (explicitRole) {
        session.setSuggestedRole(explicitRole);
        session.setPhase("interviewing");
      } else if (wantsInterviewNow && session.suggestedRole) {
        session.setPhase("interviewing");
      }
    }

    if (session.phase === "idle" && !session.hasResume && explicitRole && roleDetector.looksLikeInterviewRequest(userMessage)) {
      session.setSuggestedRole(explicitRole);
      session.setPhase("interviewing");
    }

    session.addMessage("user", userMessage);

    const systemPrompt = promptBuilder.buildSystemPrompt(session);
    const fullResponse = await llmClient.streamCompletion(
      systemPrompt,
      session.toAPIMessages(),
      onChunk
    );

    session.addMessage("assistant", fullResponse);

    if (session.phase === "idle") {
      const role = explicitRole || responseParser.detectRoleSuggestion(fullResponse);
      if (role) {
        session.setSuggestedRole(role);
      }

      if (responseParser.detectRoleOptions(fullResponse) || role) {
        session.setPhase("role_suggested");
      }
    }

    if (session.phase === "interviewing") {
      if (this.looksLikeInterviewQuestion(fullResponse)) {
        session.incrementQuestionCount();
      }

      if (responseParser.detectDebriefStart(fullResponse)) {
        session.setPhase("debrief");
      }
    }

    let scoreCard = null;
    if (session.phase === "debrief") {
      scoreCard = responseParser.extractScoreCard(fullResponse);
      if (scoreCard) {
        session.setScoreCard(scoreCard);
      }
    }

    sessionStore.set(session);

    return { fullResponse, phase: session.phase, scoreCard };
  }

  getSession(sessionId: string) {
    return this.deps.sessionStore.get(sessionId);
  }

  private looksLikeInterviewQuestion(text: string): boolean {
    if (this.deps.responseParser.detectDebriefStart(text)) {
      return false;
    }

    return /\?/m.test(text);
  }
}
