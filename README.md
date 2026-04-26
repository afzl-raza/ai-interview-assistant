# Alex Interview Partner

Alex Interview Partner is a dark-mode mock interview web app built with Next.js. It supports role-based interview practice for Software Engineer, Sales, Retail, and Generalist roles, with optional resume upload for more personalized question selection.

The product is designed to feel like a realistic interview simulator rather than a generic chatbot. Alex helps the user choose a role, conducts a structured interview with adaptive follow-ups, and ends with a feedback scorecard.

## Core features

- Role-based mock interviews without requiring a resume
- Optional resume upload using PDF or TXT files
- Resume-aware role suggestions and personalized questioning
- Adaptive interviewer behavior for four user personas:
  - Confused
  - Efficient
  - Chatty
  - Edge Case
- Browser-native voice input and voice output
- Structured feedback with scores out of 10
- Pluggable LLM provider support

## Tech stack

- Frontend: Next.js App Router + React + Tailwind CSS
- Backend: Next.js API routes
- Voice input: Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)
- Voice output: `speechSynthesis`
- LLM providers:
  - `ollama`
  - `gemini`
  - `groq`
  - `deepseek`
  - `anthropic`

## Setup instructions

### 1. Open the project

```powershell
cd C:\Users\LENOVO\Downloads\BLOOP_PROJECT\ai-interview-assistant
```

### 2. Install dependencies

```powershell
npm install
```

### 3. Create the local environment file

```powershell
Copy-Item .env.example .env.local
```

### 4. Choose one provider

Recommended for demo recording and stable local testing:

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3
```

Gemini:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Groq:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

DeepSeek:

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

Anthropic:

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

### 5. Start the app

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

If port `3000` is already in use, Next.js may start on `3001` instead. In that case, open the port shown in the terminal.

## Ollama setup

If you want the most stable local demo flow:

1. Install Ollama from [ollama.com](https://ollama.com)
2. Pull a model

```powershell
ollama pull llama3
```

3. Make sure Ollama is running
4. Use this `.env.local` config

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3
```

5. Run the app with `npm run dev`

This mode is recommended for local testing and video recording because it avoids rate limits and billing interruptions.

## How the app works

The user can start in one of two ways:

1. Start directly without a resume
2. Upload a resume and let Alex suggest matching roles

Once the role is clear:

1. Alex asks for the candidate's name
2. Alex begins the interview
3. Alex adapts question depth based on the user's answers
4. Alex ends with a structured feedback scorecard

## Architecture notes

The app uses a thin frontend and a service-oriented backend flow.

```text
app/page.tsx
  -> renders chat UI, voice controls, resume upload, and feedback

app/api/chat/route.ts
  -> receives user message
  -> calls InterviewOrchestrator
  -> streams SSE chunks back to the client

app/api/resume/route.ts
  -> accepts PDF/TXT upload
  -> parses resume text
  -> stores it in the active session

InterviewOrchestrator
  -> reads session state
  -> chooses the correct prompt
  -> calls the active LLM client
  -> updates phase and scorecard state

PromptBuilder
  -> creates stage-specific system prompts

ResponseParser
  -> detects role options, debrief start, and scorecard values

RoleDetector
  -> extracts likely role intent from user messages

LLMClientFactory
  -> selects the active provider using LLM_PROVIDER
```

## Project structure

```text
app/
  api/
    chat/route.ts
    resume/route.ts
  globals.css
  layout.tsx
  page.tsx

lib/
  domain/InterviewSession.ts
  services/
    AnthropicLLMClient.ts
    DeepSeekLLMClient.ts
    GeminiLLMClient.ts
    GroqLLMClient.ts
    LLMClientFactory.ts
    OllamaLLMClient.ts
    OpenAICompatibleLLMClient.ts
    PromptBuilder.ts
    ResponseParser.ts
    ResumeParser.ts
    RoleDetector.ts
    SessionStore.ts
  usecases/InterviewOrchestrator.ts
  container.ts
  interfaces.ts
```

## Design decisions

### 1. Resume upload is optional

The primary assignment flow is role-based interview practice. Resume upload is treated as an enhancement, not a requirement, so users can start quickly without extra friction.

### 2. Provider-flexible LLM architecture

The LLM layer is isolated behind a shared `ILLMClient` contract. This keeps the interview logic stable while allowing provider changes without rewriting the UI or orchestrator.

### 3. Local-first demo reliability

Ollama support was added because local testing and recorded demos are much more stable when they do not depend on rate limits, API billing, or cloud latency.

### 4. Prompt-driven interview quality

Most of the product behavior comes from prompt design rather than hardcoded branching. Alex is instructed to:

- ask one question at a time
- adapt to weak, average, or strong answers
- handle different user personas
- increase difficulty over time
- confirm before ending early
- produce parseable feedback out of 10

### 5. Clean separation of concerns

The project uses a lightweight SOLID-friendly structure:

- `InterviewOrchestrator` coordinates interview flow
- `PromptBuilder` owns prompt creation
- `ResponseParser` owns response interpretation
- `RoleDetector` owns role-intent detection
- provider clients only own API communication

This keeps the code easier to test, reason about, and extend.

## Deployment

### GitHub

Inside the project folder:

```powershell
git init
git add .
git commit -m "Build Alex Interview Partner"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-interview-assistant.git
git push -u origin main
```

Important:

- do not commit `.env.local`
- rotate any API keys that were ever pasted into screenshots or exposed during testing

### Vercel

1. Push the repository to GitHub
2. Import it into Vercel
3. Add environment variables for the provider you want to use
4. Deploy

Example for Gemini:

```text
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Example for Groq:

```text
LLM_PROVIDER=groq
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-8b-instant
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

Note:

- `ollama` is intended for local usage unless you host your own Ollama server
- session data is currently in memory, so redeploys and server restarts clear active sessions

## Known limitations

- Session storage is in-memory only
- Voice input depends on browser support and microphone permissions
- Local provider quality and speed vary by hardware
- Feedback parsing depends on providers following the instructed output format

## Recommended demo flow

For the cleanest assignment demo:

- use `ollama` or one stable cloud provider consistently
- keep resume upload as the optional second path
- demonstrate the four personas briefly rather than running four long interviews
- show the feedback scorecard at least once
