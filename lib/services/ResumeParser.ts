export class ResumeParser {
  async parse(
    buffer: Buffer,
    mimeType: "application/pdf" | "text/plain",
    fileName?: string
  ): Promise<string> {
    if (mimeType === "text/plain") {
      const text = buffer.toString("utf8").replace(/\u0000/g, "").trim();

      if (!text) {
        throw new Error(`The uploaded text resume${fileName ? ` (${fileName})` : ""} appears to be empty.`);
      }

      return text;
    }

    if (mimeType === "application/pdf") {
      const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
      const pdfParse = pdfParseModule.default;
      const parsed = await pdfParse(buffer);
      const text = parsed.text.replace(/\u0000/g, "").trim();

      if (!text) {
        throw new Error(
          `The uploaded PDF${fileName ? ` (${fileName})` : ""} did not contain readable text. Please try a text-based PDF or convert it to TXT.`
        );
      }

      return text;
    }

    throw new Error("Unsupported file type");
  }
}
