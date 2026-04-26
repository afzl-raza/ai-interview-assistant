import { ResumeParser } from "./services/ResumeParser";
import { PromptBuilder } from "./services/PromptBuilder";
import { ResponseParser } from "./services/ResponseParser";
import { RoleDetector } from "./services/RoleDetector";
import { LLMClientFactory } from "./services/LLMClientFactory";
import { sessionStore } from "./services/SessionStore";
import { InterviewOrchestrator } from "./usecases/InterviewOrchestrator";

export const resumeParser = new ResumeParser();
export { sessionStore };

let orchestratorSingleton: InterviewOrchestrator | null = null;
const llmClientFactory = new LLMClientFactory();
const roleDetector = new RoleDetector();

export function getOrchestrator(): InterviewOrchestrator {
  if (!orchestratorSingleton) {
    orchestratorSingleton = new InterviewOrchestrator({
      promptBuilder: new PromptBuilder(),
      llmClient: llmClientFactory.create(),
      responseParser: new ResponseParser(),
      roleDetector,
      sessionStore,
    });
  }

  return orchestratorSingleton;
}
