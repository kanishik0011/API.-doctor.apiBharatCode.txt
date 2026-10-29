import type { AnalysisResponse, ApiCase } from "@/lib/types";

export const ANALYSIS_TIMEOUT_MS = 45_000;

type ErrorPayload = { error?: unknown };
type AnalysisRequestOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

function responseError(status: number, payload: ErrorPayload | null): string {
  if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
  if (status === 400) return "The analysis request is invalid. Review the highlighted fields and try again.";
  if (status === 413) return "The analysis request is too large. Reduce the supplied body or logs and try again.";
  if (status === 429) return "Too many analysis requests. Wait a moment and try again.";
  if (status === 503) return "Live analysis is not configured or the provider is unavailable. Check the server configuration and try again.";
  if (status === 504) return "The analysis provider timed out. Try again in a moment.";
  return `The API Doctor server could not complete the analysis (HTTP ${status}).`;
}

export async function requestAnalysis(
  apiCase: ApiCase,
  demoMode: boolean,
  { fetchImpl = fetch, timeoutMs = ANALYSIS_TIMEOUT_MS }: AnalysisRequestOptions = {},
): Promise<AnalysisResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiCase, demoMode }),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: (AnalysisResponse & ErrorPayload) | null = null;
    try {
      payload = text ? JSON.parse(text) as AnalysisResponse & ErrorPayload : null;
    } catch {
      throw new Error("The API Doctor server returned an unreadable response. Check the server logs and try again.");
    }
    if (!response.ok || typeof payload?.error === "string") throw new Error(responseError(response.status, payload));
    if (!payload?.analysis || !payload.source) throw new Error("The API Doctor server returned an incomplete analysis. Check the server logs and try again.");
    return payload;
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw new Error("The analysis request timed out. The server or BharatCode provider may be unavailable. Try again.");
    }
    if (error instanceof TypeError) {
      throw new Error("Cannot reach the API Doctor server. Start or restart it with npm run dev, wait for Ready, then reload this page.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
