import { IRoleDetector } from "../interfaces";

export class RoleDetector implements IRoleDetector {
  private readonly rolePatterns: Array<[RegExp, string]> = [
    [/\bsoftware engineer\b|\bswe\b|\bdeveloper\b|\bfrontend\b|\bbackend\b|\bfull stack\b/, "Software Engineer"],
    [/\bsales\b|\baccount executive\b|\bbdr\b|\bsdr\b|\bbusiness development\b/, "Sales"],
    [/\bretail\b|\bstore manager\b|\bcustomer service\b|\bsales associate\b/, "Retail"],
    [/\bgeneralist\b|\bany role\b/, "Generalist"],
  ];

  detectPreferredRole(userMessage: string): string | null {
    const lower = userMessage.toLowerCase();
    const matches = this.rolePatterns.filter(([pattern]) => pattern.test(lower));

    // If the user is asking for help choosing among multiple roles,
    // do not treat the first matching role as an explicit selection.
    if (
      matches.length > 1 &&
      (/help me choose|choose between|which role|what role|options|or/.test(lower))
    ) {
      return null;
    }

    for (const [, role] of matches) {
      return role;
    }

    return null;
  }

  looksLikeInterviewRequest(userMessage: string): boolean {
    return /interview|mock interview|practice|start|begin|go ahead|lets|let's|role/i.test(userMessage);
  }
}
