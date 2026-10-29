import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { analyzeWithBharatCode, ProviderError } from "@/lib/bharatcode";
import { createDemoAnalysis } from "@/lib/demos";
import { requestClientKey, takeRateLimit } from "@/lib/rate-limit";
import { analyzeRequestSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 45;

const MAX_REQUEST_BYTES = 160_000;
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { ...noStoreHeaders, ...headers } });
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) return json({ error: "Request is too large. Keep bodies and logs under 50 KB each.", code: "PAYLOAD_TOO_LARGE" }, 413);
  try {
    const rawText = await request.text();
    if (new TextEncoder().encode(rawText).byteLength > MAX_REQUEST_BYTES) return json({ error: "Request is too large. Keep bodies and logs under 50 KB each.", code: "PAYLOAD_TOO_LARGE" }, 413);
    const raw: unknown = JSON.parse(rawText);
    const input = analyzeRequestSchema.parse(raw);
    const limit = input.demoMode ? 30 : 6;
    const rate = takeRateLimit(`${requestClientKey(request.headers)}:${input.demoMode ? "demo" : "live"}`, limit);
    const rateHeaders = { "X-RateLimit-Limit": String(limit), "X-RateLimit-Remaining": String(rate.remaining) };
    if (!rate.allowed) return json({ error: "Too many analysis requests. Wait before trying again.", code: "RATE_LIMITED" }, 429, { ...rateHeaders, "Retry-After": String(rate.retryAfterSeconds) });
    if (input.demoMode) return json({ analysis: createDemoAnalysis(input.apiCase), source: "demo" }, 200, rateHeaders);
    const analysis = await analyzeWithBharatCode(input.apiCase);
    return json({ analysis, source: "bharatcode" }, 200, rateHeaders);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Request body must be valid JSON.", code: "INVALID_JSON" }, 400);
    if (error instanceof ZodError) return json({ error: "Some request fields are invalid.", code: "VALIDATION", issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, 400);
    if (error instanceof ProviderError) {
      const status = error.code === "CONFIG" || error.code === "BUSY" ? 503 : error.code === "AUTH" ? 502 : error.code === "RATE_LIMIT" ? 429 : error.code === "TIMEOUT" ? 504 : 502;
      return json({ error: error.message, code: error.code, ...(error.requestId ? { providerRequestId: error.requestId } : {}) }, status);
    }
    return json({ error: "Analysis failed unexpectedly. No target request was executed.", code: "INTERNAL" }, 500);
  }
}
