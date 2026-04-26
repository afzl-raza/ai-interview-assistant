import { ILLMClient } from "../interfaces";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

interface OpenAICompatibleClientOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  providerName: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenAICompatibleLLMClient implements ILLMClient {
  constructor(private options: OpenAICompatibleClientOptions) {}

  async streamCompletion(
    systemPrompt: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void
  ): Promise<string> {
    const response = await fetch(`${this.options.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify({
        model: this.options.model,
        stream: false,
        temperature: this.options.temperature ?? 0.3,
        max_tokens: this.options.maxTokens ?? 320,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${this.options.providerName} API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";

    if (!text.trim()) {
      throw new Error(`${this.options.providerName} returned an empty response.`);
    }

    onChunk(text);
    return text.trim();
  }
}
