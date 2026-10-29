import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeWithBharatCode, extractAnalysis, ProviderError } from "./bharatcode";
import { createDemoAnalysis, DEMO_SCENARIOS } from "./demos";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AI response validation", () => {
  it("accepts a complete analysis inside a JSON fence", () => {
    const analysis = createDemoAnalysis(DEMO_SCENARIOS[0].apiCase);
    expect(extractAnalysis(`\`\`\`json\n${JSON.stringify(analysis)}\n\`\`\``).category).toBe("Authentication");
  });

  it("rejects incomplete and malformed output with an actionable provider error", () => {
    expect(() => extractAnalysis('{"summary":"not enough"}')).toThrow(ProviderError);
    expect(() => extractAnalysis("not json")).toThrow(/unreadable JSON/);
  });

  it("uses the mocked provider and never sends a raw bearer token", async () => {
    vi.stubEnv("BHARATCODE_API_KEY", "provider-key");
    const apiCase = { ...DEMO_SCENARIOS[0].apiCase, headers: [{ key: "Authorization", value: "Bearer raw-secret-token" }] };
    const expected = createDemoAnalysis(apiCase);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(expected) }, finish_reason: "stop" }] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(analyzeWithBharatCode(apiCase)).resolves.toEqual(expected);
    const requestBody = String((fetchMock.mock.calls[0][1] as RequestInit).body);
    expect(requestBody).toContain("[REDACTED]");
    expect(requestBody).not.toContain("raw-secret-token");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("maps mocked provider rate limits to an actionable error", async () => {
    vi.stubEnv("BHARATCODE_API_KEY", "provider-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response("busy", { status: 429, headers: { "Retry-After": "0", "x-request-id": "req-rate" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(analyzeWithBharatCode(DEMO_SCENARIOS[0].apiCase)).rejects.toMatchObject({ code: "RATE_LIMIT", requestId: "req-rate" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries one busy response and accepts the next valid response", async () => {
    vi.stubEnv("BHARATCODE_API_KEY", "provider-key");
    const expected = createDemoAnalysis(DEMO_SCENARIOS[2].apiCase);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503, headers: { "Retry-After": "0" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(expected) }, finish_reason: "stop" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(analyzeWithBharatCode(DEMO_SCENARIOS[2].apiCase)).resolves.toEqual(expected);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    { status: 401, code: "AUTH" },
    { status: 500, code: "NETWORK" },
  ])("maps provider HTTP $status to $code without retrying", async ({ status, code }) => {
    vi.stubEnv("BHARATCODE_API_KEY", "provider-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response("error", { status, headers: { "x-request-id": `req-${status}` } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(analyzeWithBharatCode(DEMO_SCENARIOS[0].apiCase)).rejects.toMatchObject({ code, requestId: `req-${status}` });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects a length-truncated completion", async () => {
    vi.stubEnv("BHARATCODE_API_KEY", "provider-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "{}" }, finish_reason: "length" }] }), { status: 200 })));
    await expect(analyzeWithBharatCode(DEMO_SCENARIOS[0].apiCase)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("aborts a provider request after the configured timeout", async () => {
    vi.useFakeTimers();
    vi.stubEnv("BHARATCODE_API_KEY", "provider-key");
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })));
    const expectation = expect(analyzeWithBharatCode(DEMO_SCENARIOS[0].apiCase)).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(30_000);
    await expectation;
  });
});
