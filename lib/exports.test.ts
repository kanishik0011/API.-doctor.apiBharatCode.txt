import { describe, expect, it } from "vitest";
import ts from "typescript";
import { createDemoAnalysis, DEMO_SCENARIOS } from "./demos";
import { generateJest, generatePostman } from "./exports";

describe("test export generation", () => {
  const apiCase = DEMO_SCENARIOS[1].apiCase;
  const analysis = createDemoAnalysis(apiCase);

  it("creates a Jest-compatible source artifact without evaluating it", () => {
    const source = generateJest(apiCase, analysis);
    expect(source).toContain("describe(");
    expect(source).toContain("expect(response.status).toBe(201)");
    expect(source).toContain("API_BASE_URL");
    const parsed = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { allowJs: true, target: ts.ScriptTarget.ES2022 } });
    expect(parsed.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)).toEqual([]);
  });

  it("creates a valid Postman v2.1 collection", () => {
    const collection = JSON.parse(generatePostman(apiCase, analysis));
    expect(collection.info.schema).toContain("v2.1.0");
    expect(collection.item[0].event[0].script.exec).toBeInstanceOf(Array);
    const script = collection.item[0].event[0].script.exec.join("\n");
    expect(script).toContain("to.be.a(\"string\")");
    expect(script).toContain("to.eql(\"asha@example.com\")");
  });
});
