import { ILLMClient } from "../interfaces";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export class GeminiLLMClient implements ILLMClient {
  constructor(private apiKey: string) {}

  async streamCompletion(
    systemPrompt: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void
  ): Promise<string> {
    const geminiContents = messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: geminiContents,
          generationConfig: {
            temperature: 0.4,
            topP: 0.9,
            maxOutputTokens: 320,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("") || "";

    if (!text.trim()) {
      throw new Error("Gemini returned an empty response.");
    }

    onChunk(text);
    return text.trim();
  }
}

