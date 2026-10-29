# API Doctor AI — Error-to-Test Agent

API Doctor AI turns the evidence from a failed HTTP request into a structured diagnosis, a proposed corrected request, reproducible test artifacts, and deterministic verification results. It was built for the **BharatCode Build League** in the **Coding & Developer Tools** category.

Repository: [kanishik0011/API.-doctor.apiBharatCode.txt](https://github.com/kanishik0011/API.-doctor.apiBharatCode.txt)

The product is deliberately not a remote API executor. It never sends requests to user-supplied URLs. Users can export tests to run against systems they control, then paste the actual status and response body back into the browser-based assertion runner.

## Who it is for and what is different

API and backend developers, support engineers, and QA teams can use the workspace to turn a concrete failure into a reviewable debugging package. Unlike a generic chatbot, the app validates the AI output against a strict schema, separates observations from hypotheses, generates Jest/Postman artifacts deterministically, and labels verification only from assertions run against response data the user actually supplies.

## The problem

Debugging an API failure usually means correlating a cURL command, response, logs, contract assumptions, and test tooling by hand. Generic chat assistants may blur facts and guesses or imply that a suggested edit is verified. API Doctor AI keeps the workflow auditable:

1. Capture the request and observed failure.
2. Separate observed facts, possible causes, and recommended actions.
3. Propose a corrected request without inventing credentials or schemas.
4. Generate tests from a validated intermediate specification.
5. Run deterministic assertions only against response data the user supplies.
6. Export a Markdown report with explicit unverified assumptions.

## Features

- Manual request builder for GET, POST, PUT, PATCH, and DELETE
- cURL import for common command formats
- Response status/body and backend log capture
- Server-only BharatCode `qwen-3.8-27b` integration
- Zod validation for request input and every AI response
- Explicit facts / hypotheses / actions presentation with confidence
- Corrected, copyable cURL request with placeholders for unknown secrets
- Validated test specs containing status, JSON paths, types, and optional values
- Deterministic Jest-compatible and Postman Collection v2.1 exports
- Browser-local response assertion runner with PASS / FAIL / NOT RUN states
- Redacted downloadable Markdown debugging reports
- Three built-in scenarios: JWT 401, validation 422, and backend 500
- Clearly labeled deterministic local demo mode when no provider key is available
- Responsive, keyboard-accessible dark developer UI

## Architecture

```text
Browser workspace
  ├─ Request/cURL input
  ├─ Test and report generators (deterministic)
  └─ Local response assertion engine (no eval, no remote fetch)
            │
            ▼
POST /api/analyze
  ├─ payload size limit + Zod validation
  ├─ explicit deterministic demo path
  └─ secret redaction → BharatCode client → defensive JSON parsing → Zod
```

Key source areas:

```text
app/                    Next.js App Router pages and route handlers
components/workspace.tsx  Complete product workspace
lib/bharatcode.ts       Provider client, timeout, error mapping, output parsing
lib/sanitize.ts         Secret redaction
lib/curl.ts             cURL parser and serializer
lib/demos.ts            Demo cases and deterministic diagnoses
lib/assertions.ts       Local deterministic verification
lib/exports.ts          Jest and Postman generators
lib/report.ts           Redacted Markdown reports
lib/types.ts            Zod schemas and shared types
tests (co-located)      Vitest unit and route tests
```

## Technology

Next.js App Router, React 19, strict TypeScript, Tailwind CSS, Lucide icons, Zod, Next.js Route Handlers, Vitest, and the BharatCode chat completions API. No database, authentication service, or arbitrary target proxy is used.

## BharatCode integration

The route handler follows the current [BharatCode Build API contract](https://bharatcode.ai/build):

```text
POST https://bharatcode.ai/api/model/v1/chat/completions
Model: qwen-3.8-27b
Authorization: Bearer BHARATCODE_API_KEY
```

Credentials never enter browser code. Before a provider call, sensitive header values, URL credentials/query secrets, nested JSON secrets, and common inline bearer/API-key/token/password patterns are replaced with `[REDACTED]`. Provider calls have a 30-second timeout, a maximum of one retry for 429/503 responses, and actionable handling for missing/invalid credentials, rate limits, busy services, truncated output, malformed JSON, and schema-invalid output. Failed live calls never fall back to demo output.

The public analysis route applies per-client, in-memory request limits (30 demo or 6 live analyses per minute). This is useful abuse resistance for a single process, but serverless instances do not share memory; production deployments that face meaningful traffic should add a distributed limiter at the edge or with a shared store.

## Local setup

Requirements: an active Node.js LTS release (Node 20.19+, 22.13+, or 24+) and npm. Odd-numbered Node 21 is not supported by several development dependencies.

```bash
git clone https://github.com/kanishik0011/API.-doctor.apiBharatCode.txt.git
cd API.-doctor.apiBharatCode.txt
npm install
npm run dev
```

The application starts in Local demo mode without credentials. To use live analysis, copy `.env.example` to `.env.local` (`Copy-Item .env.example .env.local` in PowerShell or `cp .env.example .env.local` on macOS/Linux), then add the real server-side key:

```dotenv
BHARATCODE_API_KEY=your_key_here
BHARATCODE_BASE_URL=https://bharatcode.ai/api/model/v1
BHARATCODE_MODEL=qwen-3.8-27b
```

Open [http://localhost:3000](http://localhost:3000). The application works without a paid key in explicitly labeled **Local demo mode**.

## Tests and quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --omit=dev
```

Tests cover cURL parsing, malformed inputs, secret redaction, validated model output, deterministic assertion results, Jest/Postman export generation, and route error behavior. External BharatCode access is not needed for unit tests.

## Demo walkthrough

1. Click one of the three scenario cards at the top.
2. Keep **Local demo mode** on and select **Analyze API**.
3. Inspect facts, possible causes, actions, and corrected cURL separately.
4. Open **Test cases** and copy/download either export.
5. Open **Test runner**, paste a response actually received, and run assertions.
6. Open **Report** and download the Markdown incident report.

For submission screenshots, capture the populated request/analysis split view and the test runner after executing both a matching and a deliberately mismatched response. Do not imply that demo diagnoses came from the live model.

## Deployment to Vercel

1. After the release pull request is merged, in Vercel choose **Add New → Project** and import this repository.
2. Keep the repository root as the Vercel Root Directory.
3. Add `BHARATCODE_API_KEY`, `BHARATCODE_BASE_URL`, and `BHARATCODE_MODEL` under Project Settings → Environment Variables.
4. Deploy. Vercel detects Next.js and uses `npm run build` automatically.
5. Confirm `/api/status` reports the provider as configured and exercise one non-sensitive test case.

No deployment is performed by the source-publication process.

## Security notes

- Never paste production credentials, personal data, or full sensitive logs.
- Provider credentials are server-only and ignored by Git.
- User-supplied URLs are displayed and exported, never fetched by the hosted app.
- Generated JavaScript is text only and is never evaluated in the application.
- Reports use the same redaction pass as provider input.
- Input lengths, header counts, status ranges, methods, URLs, and AI output are validated.
- Redaction is defense in depth, not a substitute for removing sensitive data before submission.

## Known limitations

- The cURL parser targets common command forms, not every shell dialect or cURL flag.
- JSON paths use simple dot notation and do not yet support escaped dots or array expressions.
- The assertion runner validates supplied status and JSON only; it does not check response headers or make network requests.
- AI quality depends on supplied evidence and the BharatCode service. A valid schema does not make a hypothesis factual.
- Exported test placeholders and assumed success statuses must be reviewed against the real API contract before execution.
- The in-memory public-route limiter is instance-local and is not a substitute for a distributed production rate limiter.

## License

MIT — see [LICENSE](./LICENSE).
