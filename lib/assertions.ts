import type { AssertionResult, TestSpec } from "@/lib/types";

function valueAtPath(root: unknown, path: string): { found: boolean; value: unknown } {
  if (path === "$" || path === "") return { found: true, value: root };
  let value: unknown = root;
  for (const segment of path.replace(/^\$\.?/, "").split(".")) {
    if (value === null || typeof value !== "object" || !(segment in value)) return { found: false, value: undefined };
    value = (value as Record<string, unknown>)[segment];
  }
  return { found: true, value };
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function notRunResults(specs: TestSpec[]): AssertionResult[] {
  return specs.map((spec) => ({ testId: spec.id, name: spec.name, status: "not-run", expected: `HTTP ${spec.expectedStatus}`, actual: "Not run", failures: [] }));
}

export function runAssertions(specs: TestSpec[], actualStatus: number, bodyText: string): AssertionResult[] {
  let body: unknown;
  let parseError = "";
  try { body = bodyText.trim() ? JSON.parse(bodyText) : null; }
  catch { parseError = "Response body is not valid JSON."; body = undefined; }

  return specs.map((spec) => {
    const failures: string[] = [];
    if (actualStatus !== spec.expectedStatus) failures.push(`Expected HTTP ${spec.expectedStatus}, received HTTP ${actualStatus}.`);
    if (spec.assertions.length && parseError) failures.push(parseError);
    if (!parseError) {
      for (const assertion of spec.assertions) {
        const located = valueAtPath(body, assertion.path);
        if (!located.found) {
          if (assertion.required) failures.push(`Required field “${assertion.path}” is missing.`);
          continue;
        }
        const actualType = typeOf(located.value);
        if (actualType !== assertion.type) failures.push(`Field “${assertion.path}” expected ${assertion.type}, received ${actualType}.`);
        if ("expectedValue" in assertion && !Object.is(located.value, assertion.expectedValue)) failures.push(`Field “${assertion.path}” expected ${JSON.stringify(assertion.expectedValue)}, received ${JSON.stringify(located.value)}.`);
      }
    }
    return { testId: spec.id, name: spec.name, status: failures.length ? "fail" : "pass", expected: `HTTP ${spec.expectedStatus}; ${spec.assertions.length} field assertion${spec.assertions.length === 1 ? "" : "s"}`, actual: `HTTP ${actualStatus}${parseError ? "; non-JSON body" : ""}`, failures };
  });
}
