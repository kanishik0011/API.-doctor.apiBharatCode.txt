import { describe, expect, it } from "vitest";
import { redactText, sanitizeApiCase, sanitizeUrl } from "./sanitize";
import { DEMO_SCENARIOS } from "./demos";

describe("secret redaction", () => {
  it("redacts bearer tokens and inline secrets", () => {
    expect(redactText("Authorization: Bearer ey.secret.value password=hunter2")).toBe("Authorization: Bearer [REDACTED] password=[REDACTED]");
  });

  it("preserves generic authentication terminology", () => {
    expect(redactText("Bearer token is required; use a valid bearer credential.")).toBe("Bearer token is required; use a valid bearer credential.");
  });

  it("redacts sensitive headers without mutating the input", () => {
    const input = { ...DEMO_SCENARIOS[0].apiCase, headers: [{ key: "Authorization", value: "Bearer real-token" }, { key: "Accept", value: "application/json" }] };
    const output = sanitizeApiCase(input);
    expect(output.headers[0].value).toBe("[REDACTED]");
    expect(output.headers[1].value).toBe("application/json");
    expect(input.headers[0].value).toBe("Bearer real-token");
  });

  it("redacts nested JSON secrets while preserving non-sensitive values", () => {
    const redacted = JSON.parse(redactText('{"user":{"password":"hunter2","profile":{"access_token":"abc"}},"name":"Asha"}'));
    expect(redacted).toEqual({ user: { password: "[REDACTED]", profile: { access_token: "[REDACTED]" } }, name: "Asha" });
  });

  it("redacts credential-like query parameters and log fragments", () => {
    const url = sanitizeUrl("https://api.example.com/items?token=secret-value&page=2");
    expect(url).not.toContain("secret-value");
    expect(url).toContain("page=2");
    expect(redactText('upstream said {"client_secret":"hidden"}; Authorization: Basic dXNlcjpwYXNz')).not.toMatch(/hidden|dXNlcjpwYXNz/);
  });
});
