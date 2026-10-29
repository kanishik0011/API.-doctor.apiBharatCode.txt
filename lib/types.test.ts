import { describe, expect, it } from "vitest";
import { apiCaseSchema } from "./types";

describe("API case validation", () => {
  it("rejects malformed and unsupported requests", () => {
    const result = apiCaseSchema.safeParse({ method: "TRACE", url: "localhost", headers: [], body: "", responseStatus: 999, responseBody: "", logs: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects credentials embedded in request URLs", () => {
    const result = apiCaseSchema.safeParse({ method: "GET", url: "https://user:password@example.com/data", headers: [], body: "", responseStatus: 401, responseBody: "", logs: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.message.includes("Credentials embedded"))).toBe(true);
  });
});
