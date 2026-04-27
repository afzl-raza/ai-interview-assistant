import { getOrchestrator, sessionStore } from "@/lib/container";
import { InterviewSession } from "@/lib/domain/InterviewSession";

function sseData(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: Request) {
  try {
    const { sessionId, message, resumeText } = await req.json();

    if (!sessionId || !message) {
      return Response.json({ error: "sessionId and message required" }, { status: 400 });
    }

    if (typeof resumeText === "string" && resumeText.trim()) {
      let session = sessionStore.get(sessionId);
      if (!session) {
        session = new InterviewSession(sessionId);
      }

      if (!session.hasResume) {
        session.setResume(resumeText);
      }

      sessionStore.set(session);
    }

    const encoder = new TextEncoder();
    const orchestrator = getOrchestrator();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await orchestrator.processMessage(
            sessionId,
            message,
            (text) => controller.enqueue(encoder.encode(sseData({ type: "chunk", text })))
          );

          controller.enqueue(
            encoder.encode(
              sseData({ type: "meta", phase: result.phase, scoreCard: result.scoreCard })
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const messageText = error instanceof Error ? error.message : "Chat request failed";
          controller.enqueue(encoder.encode(sseData({ type: "error", error: messageText })));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Invalid request";
    return Response.json({ error: messageText }, { status: 400 });
  }
}
