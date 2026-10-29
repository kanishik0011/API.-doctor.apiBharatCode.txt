import { describe, expect, it } from "vitest";
import { runAssertions } from "./assertions";
import type { TestSpec } from "./types";

const spec: TestSpec = { id: "created", name: "Resource created", expectedStatus: 201, assertions: [{ path: "data.id", type: "string", required: true }, { path: "data.active", type: "boolean", required: true, expectedValue: true }], explanation: "Checks the response." };

describe("deterministic assertions", () => {
  it("passes only matching status, fields, types, and values", () => {
    expect(runAssertions([spec], 201, '{"data":{"id":"u_1","active":true}}')[0].status).toBe("pass");
  });

  it("reports every deterministic mismatch", () => {
    const result = runAssertions([spec], 200, '{"data":{"id":4,"active":false}}')[0];
    expect(result.status).toBe("fail");
    expect(result.failures).toHaveLength(3);
  });

  it("never passes invalid JSON when fields are asserted", () => {
    expect(runAssertions([spec], 201, "not-json")[0].failures).toContain("Response body is not valid JSON.");
  });
});
