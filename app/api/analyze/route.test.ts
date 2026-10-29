import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DEMO_SCENARIOS } from "@/lib/demos";
import { resetRateLimitsForTests } from "@/lib/rate-limit";
import { POST } from "./route";

afterEach(() => { vi.unstubAllEnvs(); resetRateLimitsForTests(); });

function request(body: unknown) {
  return new NextRequest("http://localhost/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

function rawRequest(body: string) {
  return new NextRequest("http://localhost/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body });
}

describe("POST /api/analyze", () => {
  it("returns explicitly sourced deterministic demo output", async () => {
    const response = await POST(request({ apiCase: DEMO_SCENARIOS[0].apiCase, demoMode: true }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ source: "demo", analysis: { category: "Authentication" } });
  });

  it("returns validation details for malformed requests", async () => {
    const response = await POST(request({ apiCase: { url: "bad" }, demoMode: true }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects malformed JSON without treating it as a provider failure", async () => {
    const response = await POST(rawRequest("{not-json"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_JSON" });
  });

  it("rejects oversized bodies even without relying on content-length", async () => {
    const response = await POST(rawRequest("x".repeat(160_001)));
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  });

  it("does not silently use demo output when live mode has no key", async () => {
    vi.stubEnv("BHARATCODE_API_KEY", "");
    const response = await POST(request({ apiCase: DEMO_SCENARIOS[0].apiCase, demoMode: false }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "CONFIG" });
  });
});
