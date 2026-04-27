"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "role_suggested" | "interviewing" | "debrief";
type UploadStatus = "idle" | "uploading" | "done" | "error";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ResumeUploadResponse = {
  success: boolean;
  fileName: string;
  resumeText: string;
};

type ScoreCard = {
  communication: number;
  depth: number;
  confidence: number;
  technicalAccuracy: number;
  handlingToughQuestions: number;
};

const SCORE_LABELS: Record<keyof ScoreCard, string> = {
  communication: "Communication",
  depth: "Depth",
  confidence: "Confidence",
  technicalAccuracy: "Technical Accuracy",
  handlingToughQuestions: "Tough Questions",
};

function createSessionId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getPhaseMeta(phase: Phase) {
  switch (phase) {
    case "role_suggested":
      return {
        label: "Role options ready",
        pct: 34,
        accent: "from-violet-500 via-fuchsia-400 to-sky-400",
      };
    case "interviewing":
      return {
        label: "Interview live",
        pct: 72,
        accent: "from-indigo-500 via-violet-400 to-sky-400",
      };
    case "debrief":
      return {
        label: "Feedback ready",
        pct: 100,
        accent: "from-fuchsia-500 via-violet-400 to-sky-400",
      };
    default:
      return {
        label: "Setup",
        pct: 10,
        accent: "from-violet-300 via-indigo-300 to-sky-300",
      };
  }
}

function cls(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function SidebarCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cls(
        "paper-panel soft-border surface-glow rounded-[28px] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/25",
        className
      )}
    >
      <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-violet-600/70">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Home() {
  const [sessionId, setSessionId] = useState(createSessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [scoreCard, setScoreCard] = useState<ScoreCard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [micStatusMessage, setMicStatusMessage] = useState("");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState("");
  const [uploadedFile, setUploadedFile] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  function speak(text: string) {
    if (!voiceOn || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const speechText = text.replace(/[*#`_~]/g, "").replace(/\s+/g, " ").trim();
    if (!speechText || speechText.startsWith("Error:")) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1.2;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((voice) =>
      /Google UK English Male|Daniel|Aaron|Microsoft Ryan/i.test(voice.name)
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.setTimeout(() => window.speechSynthesis.speak(utterance), 220);
  }

  async function readJsonError(res: Response) {
    try {
      const data = await res.json();
      return data?.error || `Request failed with status ${res.status}`;
    } catch {
      return `Request failed with status ${res.status}`;
    }
  }

  async function sendMessage(userText: string, options?: { resumeText?: string }) {
    const trimmed = userText.trim();
    if (!trimmed || isLoading) {
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: trimmed }, { role: "assistant", content: "" }]);
    setIsLoading(true);
    setIsThinking(true);

    let assistantText = "";
    let eventBuffer = "";
    let sawChunk = false;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: trimmed,
          resumeText: options?.resumeText,
        }),
      });

      if (!res.ok) {
        throw new Error(await readJsonError(res));
      }

      if (!res.body) {
        throw new Error("Streaming response body is missing.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        eventBuffer += decoder.decode(value, { stream: true });
        const events = eventBuffer.split("\n\n");
        eventBuffer = events.pop() || "";

        for (const event of events) {
          const lines = event
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .filter((line) => line.startsWith("data: "));

          for (const line of lines) {
            const payload = line.slice(6);
            if (payload === "[DONE]") {
              continue;
            }

            const parsed = JSON.parse(payload);

            if (parsed.type === "chunk") {
              sawChunk = true;
              setIsThinking(false);
              assistantText += parsed.text;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: assistantText };
                return next;
              });
            }

            if (parsed.type === "meta") {
              if (parsed.phase) {
                setPhase(parsed.phase as Phase);
              }
              if (parsed.scoreCard) {
                setScoreCard(parsed.scoreCard as ScoreCard);
              }
            }

            if (parsed.type === "error") {
              throw new Error(parsed.error || "The interview request failed.");
            }
          }
        }
      }

      if (!sawChunk) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: "I did not receive a usable response from the server. Please try again.",
          };
          return next;
        });
        return;
      }

      if (assistantText.trim()) {
        speak(assistantText);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: `Error: ${message}` };
        return next;
      });
    } finally {
      setIsThinking(false);
      setIsLoading(false);
    }
  }

  async function handleUpload(file: File) {
    setUploadStatus("uploading");
    setUploadError("");

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("sessionId", sessionId);

    try {
      const res = await fetch("/api/resume", { method: "POST", body: formData });
      if (!res.ok) {
        throw new Error(await readJsonError(res));
      }

      const data = (await res.json()) as ResumeUploadResponse;

      setUploadedFile(file.name);
      setUploadStatus("done");
      await sendMessage(
        `I've uploaded my resume (${file.name}). Please suggest a few matching roles and let me choose one for the interview.`,
        { resumeText: data.resumeText }
      );
    } catch (error) {
      setUploadStatus("error");
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  function handleSend() {
    if (!input.trim()) {
      return;
    }

    const outgoing = input;
    setInput("");
    void sendMessage(outgoing);
  }

  function toggleVoiceInput() {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setMicStatusMessage("Voice input works best in Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setMicStatusMessage("Listening stopped.");
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setMicStatusMessage("Listening...");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      const trimmedTranscript = transcript.trim();
      setIsListening(false);

      if (!trimmedTranscript) {
        setMicStatusMessage("I could not hear anything clearly. Please try again.");
        return;
      }

      setInput("");
      setMicStatusMessage("Voice captured. Sending now...");
      void sendMessage(trimmedTranscript);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);

      if (event?.error === "aborted") {
        setMicStatusMessage("Listening stopped.");
        return;
      }

      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setMicStatusMessage("Microphone access is blocked. Allow microphone permission in the browser and try again.");
        return;
      }

      if (event?.error === "no-speech") {
        setMicStatusMessage("No speech was detected. Please try again.");
        return;
      }

      if (event?.error === "audio-capture") {
        setMicStatusMessage("No microphone was detected. Check your device and try again.");
        return;
      }

      if (event?.error) {
        setMicStatusMessage(`Voice capture issue: ${event.error}. Please try again.`);
        return;
      }

      setMicStatusMessage("Voice capture ran into an issue. Please try again.");
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setMicStatusMessage("");

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setMicStatusMessage("Voice input could not start. Please try again.");
    }
  }

  function resetInterview() {
    setSessionId(createSessionId());
    setMessages([]);
    setInput("");
    setPhase("idle");
    setScoreCard(null);
    setIsLoading(false);
    setIsThinking(false);
    setUploadStatus("idle");
    setUploadError("");
    setUploadedFile("");
    setMicStatusMessage("");
    setIsListening(false);
    recognitionRef.current?.stop?.();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  const chatStarted = messages.length > 0;
  const phaseMeta = getPhaseMeta(phase);
  const averageScore = scoreCard
    ? (
        Object.values(scoreCard).reduce((sum, value) => sum + value, 0) /
        Object.values(scoreCard).length
      ).toFixed(1)
    : null;

  return (
    <main className="relative min-h-screen overflow-hidden text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-90" />

      <header className="sticky top-0 z-30 border-b border-violet-500/10 bg-[#f6f1ff]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-6 px-5 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="float-soft flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-300/35 bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 text-lg font-extrabold text-white shadow-glow">
              AI
            </div>
            <div className="min-w-0">
              <div className="font-serif text-[1.9rem] font-semibold leading-none tracking-[-0.03em] text-slate-900">
                Alex Interview Partner
              </div>
              <p className="mt-2 max-w-3xl truncate text-[0.8rem] uppercase tracking-[0.22em] text-violet-700/70 md:text-[0.84rem]">
                Mock interviews for SWE, Sales, Retail, and Generalist roles, with optional resume context
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden min-w-[210px] rounded-2xl border border-violet-400/15 bg-white/70 px-4 py-3 shadow-halo md:block">
              <div className="mb-2 flex items-center justify-between text-[0.72rem] uppercase tracking-[0.18em] text-violet-600/75">
                <span>{phaseMeta.label}</span>
                <span>{phaseMeta.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-violet-200/70">
                <div
                  className={cls("h-full rounded-full bg-gradient-to-r transition-all duration-500", phaseMeta.accent)}
                  style={{ width: `${phaseMeta.pct}%` }}
                />
              </div>
            </div>

            <button
              className={cls(
                "rounded-2xl border px-4 py-3 text-sm font-semibold tracking-[0.01em] transition duration-300",
                voiceOn
                  ? "border-violet-400/20 bg-violet-500 text-white shadow-glow hover:border-violet-400/30 hover:bg-violet-600"
                  : "border-violet-300/20 bg-white/70 text-violet-900 hover:border-violet-400/30 hover:bg-white"
              )}
              onClick={() => setVoiceOn((current) => !current)}
            >
              {voiceOn ? "Voice on" : "Voice off"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-88px)] max-w-[1680px] grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_336px]">
        <section className="flex min-h-0 flex-col border-r border-violet-500/10">
          {!chatStarted ? (
            <div className="flex flex-1 items-center justify-center px-5 py-10 lg:px-8">
              <div className="fade-up node-outline relative w-full max-w-5xl overflow-hidden rounded-[36px] soft-border paper-panel surface-glow">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(146,124,214,0.16),_transparent_28%),radial-gradient(circle_at_80%_10%,_rgba(110,184,255,0.12),_transparent_20%)]" />
                <div className="relative grid gap-10 px-7 py-8 md:px-10 md:py-10 xl:grid-cols-[1.2fr_0.9fr]">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-100/90 px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.22em] text-violet-700">
                      Conversational interview simulator
                    </div>
                    <h1 className="mt-6 max-w-[12ch] font-serif text-5xl font-semibold leading-[0.92] tracking-[-0.05em] text-slate-900 sm:text-6xl">
                      Practice like the real interview starts in ten minutes.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-8 text-slate-700 md:text-lg">
                      Alex helps you rehearse role-specific interviews with sharper follow-ups, cleaner feedback,
                      and optional resume context for personalized questions.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        className="rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white shadow-glow transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(110,84,204,0.26)]"
                        onClick={() =>
                          void sendMessage(
                            "I want to practice a mock interview. Help me choose between Software Engineer, Sales, Retail, or Generalist."
                          )
                        }
                        disabled={isLoading}
                      >
                        Start interview now
                      </button>
                      <button
                        className="rounded-2xl border border-violet-300/20 bg-white/85 px-5 py-3 text-sm font-semibold text-violet-900 transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-white"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadStatus === "uploading"}
                      >
                        {uploadStatus === "uploading" ? "Uploading resume..." : "Upload resume"}
                      </button>
                    </div>

                    <div className="mt-10 flex flex-wrap gap-2">
                      {["Software Engineer", "Sales", "Retail", "Generalist"].map((role) => (
                        <button
                          key={role}
                          type="button"
                          className="rounded-full border border-violet-300/20 bg-white/70 px-4 py-2 text-sm font-medium text-violet-900 transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white hover:text-slate-900"
                          onClick={() => void sendMessage(`I want to practice for a ${role} interview.`)}
                          disabled={isLoading}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="workflow-panel rounded-[28px] border border-violet-300/15 p-6 backdrop-blur-sm">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-violet-100/75">
                        Optional resume upload
                      </div>
                      <p className="mt-4 text-sm leading-7 text-violet-50/92">
                        Add a PDF or TXT resume if you want Alex to suggest matching roles and anchor questions to
                        your real projects, skills, and experience.
                      </p>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          className="rounded-2xl border border-white/15 bg-white/12 px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:border-white/25 hover:bg-white/18"
                          onClick={() => void sendMessage("I do not have a resume. Please help me choose a role for the mock interview.")}
                          disabled={isLoading}
                        >
                          Start without resume
                        </button>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt"
                        hidden
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void handleUpload(file);
                          }
                        }}
                      />

                      {uploadStatus === "done" && (
                        <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/8 px-4 py-3 text-sm text-emerald-100">
                          Uploaded: {uploadedFile}
                        </div>
                      )}
                      {uploadStatus === "error" && (
                        <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/8 px-4 py-3 text-sm text-rose-100">
                          {uploadError}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[28px] border border-violet-300/20 bg-white/76 p-6 shadow-halo">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-violet-600/70">
                        Product quality
                      </div>
                      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                        <p>One-question interview rhythm with adaptive follow-ups.</p>
                        <p>Role-aware prompts for SWE, Sales, Retail, and Generalist practice.</p>
                        <p>Structured debrief with pressure-tested communication scoring.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 lg:px-8">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={cls("fade-up flex gap-4", message.role === "user" && "justify-end")}
                  >
                    {message.role === "assistant" && (
                      <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-300/25 bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 font-bold text-white shadow-glow">
                        A
                      </div>
                    )}

                    <div
                      className={cls(
                        "max-w-[82%] rounded-[26px] px-5 py-4 shadow-halo transition duration-300",
                        message.role === "user"
                          ? "border border-violet-300/20 bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 text-white"
                          : "paper-panel soft-border text-slate-900"
                      )}
                    >
                      <div className="whitespace-pre-wrap text-[1.02rem] leading-8 tracking-[-0.01em]">
                        {message.content || (
                          <span className="inline-flex items-center gap-1.5 text-violet-400">
                            <span
                              className="h-2 w-2 rounded-full bg-white/50"
                              style={{ animation: "pulse-dot 1s infinite ease-in-out" }}
                            />
                            <span
                              className="h-2 w-2 rounded-full bg-white/50"
                              style={{ animation: "pulse-dot 1s 0.12s infinite ease-in-out" }}
                            />
                            <span
                              className="h-2 w-2 rounded-full bg-white/50"
                              style={{ animation: "pulse-dot 1s 0.24s infinite ease-in-out" }}
                            />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="fade-up flex gap-4">
                    <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-300/25 bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 font-bold text-white shadow-glow">
                      A
                    </div>
                    <div className="paper-panel soft-border max-w-[420px] rounded-[26px] px-5 py-4 shadow-halo">
                      <div className="flex items-center gap-2">
                        {[0, 0.12, 0.24].map((delay) => (
                          <span
                            key={delay}
                            className="h-2.5 w-2.5 rounded-full bg-violet-400/80"
                            style={{ animation: `pulse-dot 1s ${delay}s infinite ease-in-out` }}
                          />
                        ))}
                        <span className="ml-2 text-sm uppercase tracking-[0.18em] text-violet-600/75">Alex is thinking</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              <div className="border-t border-violet-500/10 bg-white/35 px-5 py-5 backdrop-blur-xl lg:px-8">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-[0.78rem] uppercase tracking-[0.18em] text-violet-600/70">
                  <span>{uploadedFile ? `Resume loaded: ${uploadedFile}` : "No resume attached"}</span>
                  <span>
                    {phase === "role_suggested"
                      ? "Choose one suggested role to begin"
                      : phase === "debrief"
                        ? "Ask for more detailed feedback if you want another pass"
                        : "Enter sends - Shift+Enter adds a new line"}
                  </span>
                </div>

                {micStatusMessage && (
                  <div className="mb-3 rounded-2xl border border-violet-300/20 bg-violet-100/80 px-4 py-3 text-sm text-violet-800">
                    {micStatusMessage}
                  </div>
                )}

                <div className="paper-panel soft-border surface-glow rounded-[30px] p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={
                        phase === "role_suggested"
                          ? "Choose a role, like Software Engineer or Sales."
                          : "Type your answer here."
                      }
                      className="min-h-[116px] flex-1 resize-none rounded-[22px] border border-transparent bg-transparent px-4 py-4 text-[1.02rem] leading-8 tracking-[-0.01em] text-slate-900 outline-none placeholder:text-violet-500/65"
                    />

                    <div className="flex items-center justify-between gap-3 px-2 pb-2 lg:flex-col lg:items-stretch lg:justify-end">
                      <button
                        className={cls(
                          "rounded-2xl border px-5 py-3 text-sm font-semibold transition duration-300",
                          isListening
                            ? "border-fuchsia-300/30 bg-fuchsia-500 text-white shadow-[0_14px_40px_rgba(177,87,255,0.18)]"
                            : "border-violet-300/20 bg-white/80 text-violet-900 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white"
                        )}
                        onClick={toggleVoiceInput}
                        type="button"
                      >
                        {isListening ? "Stop listening" : "Mic"}
                      </button>

                      <button
                        className="rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white shadow-glow transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(110,84,204,0.26)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        type="button"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-5 px-5 py-5 lg:px-5 lg:py-6">
          <SidebarCard title="System shape">
            <p className="text-[0.98rem] leading-8 text-slate-700">
              Voice-forward interview practice with adaptive prompting, optional resume context, and a provider-flexible backend designed for stable testing and polished demos.
            </p>
          </SidebarCard>

          <SidebarCard title="Current phase">
            <div className="space-y-4">
              <div>
                <div className="font-serif text-3xl font-semibold tracking-[-0.04em] text-slate-900">{phaseMeta.label}</div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Alex adapts the interview state, follow-up pressure, and feedback depth as the session progresses.
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-violet-200/70">
                <div
                  className={cls("h-full rounded-full bg-gradient-to-r transition-all duration-500", phaseMeta.accent)}
                  style={{ width: `${phaseMeta.pct}%` }}
                />
              </div>
              <button
                className="w-full rounded-2xl border border-violet-300/20 bg-white/75 px-4 py-3 text-sm font-semibold text-violet-900 transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white"
                onClick={resetInterview}
              >
                Start new interview
              </button>
            </div>
          </SidebarCard>

          <SidebarCard title="Feedback" className="min-h-[280px]">
            {!scoreCard ? (
              <div className="space-y-4">
                <p className="text-[0.98rem] leading-8 text-slate-700">
                  The scorecard appears when Alex finishes evaluating the main areas of the interview.
                </p>
                <div className="rounded-[22px] border border-violet-300/18 bg-violet-50/65 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600/70">Scoring lens</p>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    {Object.values(SCORE_LABELS).map((label) => (
                      <div key={label} className="flex items-center justify-between">
                        <span>{label}</span>
                        <span className="text-violet-500/70">Pending</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-[24px] border border-violet-300/18 bg-gradient-to-br from-violet-100/95 to-sky-50/95 p-5">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-violet-600/70">Overall score</div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="font-serif text-6xl font-semibold leading-none tracking-[-0.05em] text-slate-900">
                      {averageScore}
                    </span>
                    <span className="mb-1 text-lg text-violet-600/70">/10</span>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {(Object.keys(SCORE_LABELS) as Array<keyof ScoreCard>).map((key) => (
                    <div key={key}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-700">{SCORE_LABELS[key]}</span>
                        <span className="font-semibold text-slate-900">{scoreCard[key]}/10</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-violet-200/70">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-500 to-sky-400"
                          style={{ width: `${scoreCard[key] * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SidebarCard>
        </aside>
      </div>
    </main>
  );
}
