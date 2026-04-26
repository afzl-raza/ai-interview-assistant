import { InterviewSession } from "../domain/InterviewSession";
import { ISessionStore } from "../interfaces";

class InMemorySessionStore implements ISessionStore {
  private sessions = new Map<string, InterviewSession>();

  get(sessionId: string) {
    return this.sessions.get(sessionId);
  }

  set(session: InterviewSession) {
    this.sessions.set(session.sessionId, session);
  }

  delete(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

export const sessionStore = new InMemorySessionStore();
