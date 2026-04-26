import { OpenAICompatibleLLMClient } from "./OpenAICompatibleLLMClient";

const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const DEFAULT_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

export class DeepSeekLLMClient extends OpenAICompatibleLLMClient {
  constructor(apiKey: string) {
    super({
      apiKey,
      baseUrl: DEFAULT_BASE_URL,
      model: DEFAULT_MODEL,
      providerName: "DeepSeek",
      temperature: 0.3,
      maxTokens: 320,
    });
  }
}
