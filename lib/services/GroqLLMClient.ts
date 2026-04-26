import { OpenAICompatibleLLMClient } from "./OpenAICompatibleLLMClient";

const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const DEFAULT_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";

export class GroqLLMClient extends OpenAICompatibleLLMClient {
  constructor(apiKey: string) {
    super({
      apiKey,
      baseUrl: DEFAULT_BASE_URL,
      model: DEFAULT_MODEL,
      providerName: "Groq",
      temperature: 0.3,
      maxTokens: 320,
    });
  }
}
