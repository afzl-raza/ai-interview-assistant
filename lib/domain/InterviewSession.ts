export type InterviewPhase = "idle" | "role_suggested" | "interviewing" | "debrief";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ScoreCard {
  communication: number;
  depth: number;
  confidence: number;
  technicalAccuracy: number;
  handlingToughQuestions: number;
}

export class InterviewSession {
  private _messages: Message[] = [];
  private _phase: InterviewPhase = "idle";
  private _resumeText = "";
  private _suggestedRole = "";
  private _scoreCard: ScoreCard | null = null;
  private _questionCount = 0;
  readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  get phase() { return this._phase; }
  get messages() { return [...this._messages]; }
  get resumeText() { return this._resumeText; }
  get suggestedRole() { return this._suggestedRole; }
  get scoreCard() { return this._scoreCard; }
  get hasResume() { return this._resumeText.trim().length > 0; }
  get questionCount() { return this._questionCount; }

  setResume(text: string) {
    this._resumeText = text.trim();
    this._phase = "idle";
    this._scoreCard = null;
    this._questionCount = 0;
    this._messages = [];
    this._suggestedRole = "";
  }

  setPhase(phase: InterviewPhase) {
    this._phase = phase;
  }

  setSuggestedRole(role: string) {
    this._suggestedRole = role.trim();
  }

  addMessage(role: "user" | "assistant", content: string) {
    this._messages.push({ role, content });
  }

  incrementQuestionCount() {
    this._questionCount += 1;
  }

  setScoreCard(scoreCard: ScoreCard) {
    this._scoreCard = scoreCard;
  }

  toAPIMessages() {
    return this._messages.map(({ role, content }) => ({ role, content }));
  }
}
