import { ScoreCard } from "../domain/InterviewSession";
import { IResponseParser } from "../interfaces";

export class ResponseParser implements IResponseParser {
  detectRoleSuggestion(text: string): string | null {
    const patterns = [
      /the role of\s+"?([A-Za-z0-9\s/&-]+?)"?\s+(?:seems|looks|appears|would be|is)\s+(?:like\s+)?a strong fit/i,
      /the role of\s+"?([A-Za-z0-9\s/&-]+?)"?\s+seems to match your background well/i,
      /i(?: would|'d)? recommend\s+"?([A-Za-z0-9\s/&-]+?)"?\s+as/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  detectRoleOptions(text: string): boolean {
    const lower = text.toLowerCase();
    return (
      lower.includes("which role would you like me to interview you for") ||
      lower.includes("which role would you like me to interview for") ||
      lower.includes("choose one") ||
      lower.includes("these roles seem to match your background")
    );
  }

  detectInterviewStart(_text: string, userMessage: string): boolean {
    const lower = userMessage.toLowerCase().trim();
    const yesSignals = [
      "yes",
      "sure",
      "let's go",
      "lets go",
      "let's do it",
      "lets do it",
      "go ahead",
      "start",
      "begin",
      "yeah",
      "yep",
      "yup",
      "absolutely",
      "ok",
      "okay",
      "sounds good",
      "do it",
      "i'm ready",
      "interview me",
      "run the interview",
    ];

    return yesSignals.some((signal) => lower.includes(signal));
  }

  detectDebriefStart(text: string): boolean {
    const lower = text.toLowerCase();
    const signals = [
      "that covers the main areas i wanted to evaluate",
      "that's a wrap on the interview",
      "that is a wrap on the interview",
      "let me now share my honest feedback",
      "here is your feedback",
      "communication:",
      "depth:",
      "technical accuracy:",
    ];

    return signals.some((signal) => lower.includes(signal));
  }

  extractScoreCard(text: string): ScoreCard | null {
    const extract = (keys: string[]): number => {
      for (const key of keys) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(
          `[*_\\s]*${escapedKey}[*_\\s]*:\\s*([0-9]+)\\s*\\/\\s*([0-9]+)`,
          "i"
        );
        const match = text.match(pattern);

        if (!match?.[1] || !match?.[2]) {
          continue;
        }

        const score = Number.parseInt(match[1], 10);
        const scale = Number.parseInt(match[2], 10);

        if (Number.isNaN(score) || Number.isNaN(scale) || scale <= 0) {
          continue;
        }

        if (scale === 10) {
          return Math.min(10, Math.max(0, score));
        }

        if (scale === 5) {
          return Math.min(10, Math.max(0, score * 2));
        }
      }

      return 0;
    };

    const scores: ScoreCard = {
      communication: extract(["Communication", "Communication Clarity"]),
      depth: extract(["Depth", "Depth & Specificity", "Depth and Specificity"]),
      confidence: extract(["Confidence", "Confidence & Presence", "Confidence and Presence"]),
      technicalAccuracy: extract(["Technical Accuracy", "Role-Specific Knowledge", "Role Specific Knowledge"]),
      handlingToughQuestions: extract(["Handling Tough Questions", "Tough Questions"]),
    };

    return Object.values(scores).some((value) => value > 0) ? scores : null;
  }
}
