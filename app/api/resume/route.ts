import { resumeParser, sessionStore } from "@/lib/container";
import { InterviewSession } from "@/lib/domain/InterviewSession";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;
    const sessionId = formData.get("sessionId") as string | null;

    if (!file || !sessionId) {
      return Response.json({ error: "resume and sessionId required" }, { status: 400 });
    }

    const normalizedType = normalizeResumeType(file);

    if (!normalizedType) {
      return Response.json({ error: "Only PDF or TXT files are supported." }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resumeText = await resumeParser.parse(buffer, normalizedType, file.name);

    let session = sessionStore.get(sessionId);
    if (!session) {
      session = new InterviewSession(sessionId);
    }

    session.setResume(resumeText);
    sessionStore.set(session);

    return Response.json({ success: true, fileName: file.name, resumeText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process resume";
    return Response.json({ error: message }, { status: 500 });
  }
}

function normalizeResumeType(file: File): "application/pdf" | "text/plain" | null {
  const fileType = file.type.toLowerCase().trim();
  const fileName = file.name.toLowerCase().trim();

  if (
    fileType === "application/pdf" ||
    fileType === "application/x-pdf" ||
    fileName.endsWith(".pdf")
  ) {
    return "application/pdf";
  }

  if (
    fileType === "text/plain" ||
    fileType === "text/txt" ||
    fileName.endsWith(".txt")
  ) {
    return "text/plain";
  }

  return null;
}
