import { describe, expect, it } from "vitest";
import { parseCurl, toCurl } from "./curl";

describe("parseCurl", () => {
  it("parses a common multiline JSON request", () => {
    const parsed = parseCurl(`curl -X POST 'https://api.example.com/users' \\
      -H 'Content-Type: application/json' \\
      --data-raw '{"name":"Asha"}'`);
    expect(parsed).toEqual({
      method: "POST",
      url: "https://api.example.com/users",
      headers: [{ key: "Content-Type", value: "application/json" }],
      body: '{"name":"Asha"}',
    });
  });

  it("infers POST when data is present", () => {
    expect(parseCurl("curl https://example.com -d 'hello'").method).toBe("POST");
  });

  it("rejects malformed input", () => {
    expect(() => parseCurl("wget https://example.com")).toThrow("start with curl");
    expect(() => parseCurl("curl -H nope https://example.com")).toThrow("Invalid header");
  });

  it("round trips generated commands", () => {
    const request = { method: "PATCH" as const, url: "https://example.com/a", headers: [{ key: "X-Key", value: "abc" }], body: '{"ok":true}' };
    expect(parseCurl(toCurl(request))).toEqual(request);
  });
});
