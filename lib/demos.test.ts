import { describe, expect, it } from "vitest";
import { analysisSchema, apiCaseSchema } from "./types";
import { createDemoAnalysis, DEMO_SCENARIOS } from "./demos";

describe("built-in demo workflows", () => {
  it("provides valid 401, 422, and 500 end-to-end inputs and analyses", () => {
    expect(DEMO_SCENARIOS.map((scenario) => scenario.apiCase.responseStatus)).toEqual([401, 422, 500]);
    for (const scenario of DEMO_SCENARIOS) {
      expect(apiCaseSchema.safeParse(scenario.apiCase).success).toBe(true);
      const analysis = createDemoAnalysis(scenario.apiCase);
      expect(analysisSchema.safeParse(analysis).success).toBe(true);
      expect(analysis.observedFacts.length).toBeGreaterThan(0);
      expect(analysis.testSpecs.length).toBeGreaterThan(0);
    }
  });
});
