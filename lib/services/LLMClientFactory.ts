import { AnthropicLLMClient } from "./AnthropicLLMClient";
import { DeepSeekLLMClient } from "./DeepSeekLLMClient";
import { GeminiLLMClient } from "./GeminiLLMClient";
import { GroqLLMClient } from "./GroqLLMClient";
import { OllamaLLMClient } from "./OllamaLLMClient";
import { ILLMClient, ILLMClientFactory } from "../interfaces";

type LLMProvider = "ollama" | "gemini" | "anthropic" | "deepseek" | "groq";

export class LLMClientFactory implements ILLMClientFactory {
  create(): ILLMClient {
    const provider = this.getProvider();

    if (provider === "ollama") {
      return new OllamaLLMClient();
    }

    if (provider === "gemini") {
      return new GeminiLLMClient(this.getRequiredEnv("GEMINI_API_KEY"));
    }

    if (provider === "deepseek") {
      return new DeepSeekLLMClient(this.getRequiredEnv("DEEPSEEK_API_KEY"));
    }

    if (provider === "groq") {
      return new GroqLLMClient(this.getRequiredEnv("GROQ_API_KEY"));
    }

    return new AnthropicLLMClient(this.getRequiredEnv("ANTHROPIC_API_KEY"));
  }

  private getProvider(): LLMProvider {
    const provider = (process.env.LLM_PROVIDER || "ollama").toLowerCase();

    if (
      provider === "ollama" ||
      provider === "gemini" ||
      provider === "anthropic" ||
      provider === "deepseek" ||
      provider === "groq"
    ) {
      return provider;
    }

    throw new Error("Invalid LLM_PROVIDER. Use ollama, gemini, anthropic, deepseek, or groq.");
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new Error(`Missing ${name}`);
    }

    return value;
  }
}
