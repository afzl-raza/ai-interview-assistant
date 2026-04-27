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

    const guardedResponse = this.buildGuardedResponse(session, userMessage);
    if (guardedResponse) {
      onChunk(guardedResponse);
      session.addMessage("assistant", guardedResponse);
      sessionStore.set(session);
      return { fullResponse: guardedResponse, phase: session.phase, scoreCard: session.scoreCard };
    }

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

    let scoreCard = responseParser.extractScoreCard(fullResponse);
    if (scoreCard) {
      session.setPhase("debrief");
      session.setScoreCard(scoreCard);
    } else if (session.phase === "debrief") {
      scoreCard = session.scoreCard;
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

  private buildGuardedResponse(session: InterviewSession, userMessage: string): string | null {
    const lower = userMessage.toLowerCase();

    const outOfScopePatterns = [
      /ignore all previous instructions/,
      /\bstock tips?\b/,
      /\binvestment advice\b/,
      /\bcrypto\b/,
      /\bblockchain\b/,
      /\bpolitics?\b/,
      /\bweather\b/,
      /\bsports?\b/,
      /\bbetting\b/,
      /\bgambling\b/,
    ];

    const asksForAnswerPatterns = [
      /\bgive me the best answer\b/,
      /\bwrite the answer for me\b/,
      /\banswer it for me\b/,
      /\bjust tell me what to say\b/,
      /\bcan i copy your answer\b/,
    ];

    const invalidInputPatterns = [
      /^[a-z]{4,}$/i,
      /^\W+$/,
    ];

    if (outOfScopePatterns.some((pattern) => pattern.test(lower))) {
      if (session.phase === "interviewing") {
        const role = session.suggestedRole || "interview";
        return `I can't help with that here. Let's keep this focused on your ${role} mock interview. Can you answer the current interview question or share a relevant example from your experience?`;
      }

      if (session.phase === "role_suggested") {
        return "I can't help with that here. Let's keep this focused on your mock interview. Which role would you like to continue with?";
      }

      return "I can't help with that here. Let's keep this focused on the mock interview. Which role would you like to practice for?";
    }

    if (asksForAnswerPatterns.some((pattern) => pattern.test(lower))) {
      if (session.phase === "interviewing") {
        return "I won't give you a full answer to copy. I can help you think it through. What would your own answer be in one or two sentences?";
      }

      return "I won't generate a copy-paste answer for the interview. Let's keep this focused on your own practice. Which role would you like to continue with?";
    }

    if (invalidInputPatterns.some((pattern) => pattern.test(userMessage.trim())) && userMessage.trim().length <= 12) {
      if (session.phase === "interviewing") {
        return "I didn't get a usable answer there. Can you respond in one short sentence related to the interview question?";
      }

      if (session.phase === "role_suggested") {
        return "I didn't get a clear choice there. Which role would you like to continue with?";
      }

      return "I didn't get a clear input there. Which role would you like to practice for?";
    }

    return null;
  }
}
