import { afterEach, describe, expect, it } from "vitest";
import { requestClientKey, resetRateLimitsForTests, takeRateLimit } from "./rate-limit";

afterEach(resetRateLimitsForTests);

describe("analysis rate limiting", () => {
  it("allows the configured quota and then blocks with a retry interval", () => {
    expect(takeRateLimit("client", 2, 1_000)).toMatchObject({ allowed: true, remaining: 1 });
    expect(takeRateLimit("client", 2, 1_001)).toMatchObject({ allowed: true, remaining: 0 });
    expect(takeRateLimit("client", 2, 1_002)).toMatchObject({ allowed: false, remaining: 0, retryAfterSeconds: 60 });
  });

  it("uses the first forwarded address without retaining the full header", () => {
    expect(requestClientKey(new Headers({ "x-forwarded-for": "203.0.113.8, 10.0.0.1" }))).toBe("203.0.113.8");
  });
});
