import { afterEach, describe, expect, it, vi } from "vitest";
import { requestAnalysis } from "./analysis-client";
import { createDemoAnalysis, DEMO_SCENARIOS } from "./demos";

afterEach(() => vi.useRealTimers());

describe("analysis API client", () => {
  const apiCase = DEMO_SCENARIOS[2].apiCase;

  it("returns a valid local-demo analysis", async () => {
    const analysis = createDemoAnalysis(apiCase);
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ analysis, source: "demo" }), { status: 200 }));

    await expect(requestAnalysis(apiCase, true, { fetchImpl })).resolves.toEqual({ analysis, source: "demo" });
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toMatchObject({ demoMode: true, apiCase: { responseStatus: 500 } });
  });

  it("turns a browser network failure into an actionable safe message", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch: socket details"));

    await expect(requestAnalysis(apiCase, true, { fetchImpl })).rejects.toThrow(
      "Cannot reach the API Doctor server. Start or restart it with npm run dev, wait for Ready, then reload this page.",
    );
  });

  it("aborts and reports a timed-out request", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));

    const expectation = expect(requestAnalysis(apiCase, true, { fetchImpl, timeoutMs: 1_000 })).rejects.toThrow("The analysis request timed out.");
    await vi.advanceTimersByTimeAsync(1_000);
    await expectation;
  });

  it("preserves a safe API error and rejects unreadable responses", async () => {
    const rejected = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Request body must be valid JSON." }), { status: 400 }));
    await expect(requestAnalysis(apiCase, true, { fetchImpl: rejected })).rejects.toThrow("Request body must be valid JSON.");

    const unreadable = vi.fn().mockResolvedValue(new Response("not-json", { status: 502 }));
    await expect(requestAnalysis(apiCase, true, { fetchImpl: unreadable })).rejects.toThrow("returned an unreadable response");
  });
});
