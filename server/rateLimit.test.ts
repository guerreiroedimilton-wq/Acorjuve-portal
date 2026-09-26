import { describe, expect, it } from "vitest";
import { consumeRateLimit } from "./_core/rateLimit";

function req(ip: string) {
  return { ip } as any;
}

describe("rate limiting", () => {
  it("blocks requests after the configured limit", () => {
    const scope = `test-${Date.now()}`;
    const first = consumeRateLimit(req("198.51.100.10"), scope, 2, 60_000);
    const second = consumeRateLimit(req("198.51.100.10"), scope, 2, 60_000);
    const third = consumeRateLimit(req("198.51.100.10"), scope, 2, 60_000);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });

  it("keeps separate client IP buckets", () => {
    const scope = `test-${Date.now()}-ip`;
    expect(consumeRateLimit(req("198.51.100.11"), scope, 1, 60_000).allowed).toBe(true);
    expect(consumeRateLimit(req("198.51.100.12"), scope, 1, 60_000).allowed).toBe(true);
  });
});
