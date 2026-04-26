import { ILLMClient } from "../interfaces";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3";
const DEFAULT_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

export class OllamaLLMClient implements ILLMClient {
  async streamCompletion(
    systemPrompt: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void
  ): Promise<string> {
    const response = await fetch(`${DEFAULT_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        options: {
          // temperature: 0.4,
          // num_predict: 320,
          temperature: 0.3,
          num_predict: 120,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data?.message?.content || "";

    if (!text.trim()) {
      throw new Error("Ollama returned an empty response.");
    }

    onChunk(text);
    return text.trim();
  }
}
