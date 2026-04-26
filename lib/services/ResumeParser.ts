export class ResumeParser {
  async parse(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === "text/plain") {
      return buffer.toString("utf8").trim();
    }

    if (mimeType === "application/pdf") {
      const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
      const pdfParse = pdfParseModule.default;
      const parsed = await pdfParse(buffer);
      return parsed.text.trim();
    }

    throw new Error("Unsupported file type");
  }
}

