import { describe, expect, it } from "vitest";
import { notRunResults, runAssertions } from "./assertions";
import { createDemoAnalysis, DEMO_SCENARIOS } from "./demos";
import { generateReport } from "./report";

describe("Markdown report generation", () => {
  it("includes timestamp, assumptions, and accurate NOT RUN state without secrets", () => {
    const apiCase = { ...DEMO_SCENARIOS[0].apiCase, url: "https://api.example.com/profile?token=query-secret", headers: [{ key: "Cookie", value: "session=cookie-secret" }], body: '{"password":"body-secret"}' };
    const analysis = createDemoAnalysis(apiCase);
    analysis.correctedRequest.headers.push({ key: "Authorization", value: "Bearer generated-secret" });
    const report = generateReport(apiCase, analysis, "demo", notRunResults(analysis.testSpecs), new Date("2026-01-02T03:04:05.000Z"));
    expect(report).toContain("2026-01-02T03:04:05.000Z");
    expect(report).toContain("NOT-RUN");
    expect(report).toContain("Unverified assumptions");
    expect(report).not.toMatch(/query-secret|cookie-secret|body-secret|generated-secret/);
  });

  it("records deterministic pass and fail evidence", () => {
    const apiCase = DEMO_SCENARIOS[0].apiCase;
    const analysis = createDemoAnalysis(apiCase);
    const report = generateReport(apiCase, analysis, "demo", runAssertions(analysis.testSpecs, 401, apiCase.responseBody));
    expect(report).toContain("FAIL");
    expect(report).toContain("PASS");
    expect(report).toContain("Expected HTTP 200, received HTTP 401");
  });
});
