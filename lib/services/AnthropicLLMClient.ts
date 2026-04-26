import { ILLMClient } from "../interfaces";

type ClaudeMessage = {
  role: "user" | "assistant";
  content: string;
};

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

export class AnthropicLLMClient implements ILLMClient {
  constructor(private apiKey: string) {}

  async streamCompletion(
    systemPrompt: string,
    messages: ClaudeMessage[],
    onChunk: (text: string) => void
  ): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 320,
        temperature: 0.4,
        system: systemPrompt,
        stream: false,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text =
      data?.content
        ?.filter((block: { type?: string }) => block.type === "text")
        .map((block: { text?: string }) => block.text || "")
        .join("") || "";

    if (!text.trim()) {
      throw new Error("Anthropic returned an empty response.");
    }

    onChunk(text);
    return text.trim();
  }
}
