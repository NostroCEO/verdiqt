import { describe, expect, it } from "vitest";

import {
  ANONYMOUS_SESSION_TTL_DAYS,
  anonymousCookieOptions,
  anonymousSessionExpiresAt,
  createAnonymousCapability,
  hashCapability,
  isAnonymousCapability,
} from "@/lib/access";

describe("anonymous access helpers", () => {
  it("generates a valid random capability and stores only its hash", () => {
    const capability = createAnonymousCapability();

    expect(isAnonymousCapability(capability)).toBe(true);
    expect(hashCapability(capability)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashCapability(capability)).toBe(hashCapability(capability));
  });

  it("uses a bounded anonymous session cookie", () => {
    expect(anonymousCookieOptions()).toEqual(
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: ANONYMOUS_SESSION_TTL_DAYS * 24 * 60 * 60,
      }),
    );
  });

  it("computes the anonymous session expiry from the supplied clock", () => {
    const now = new Date("2026-08-27T00:00:00.000Z");

    expect(anonymousSessionExpiresAt(now).toISOString()).toBe(
      "2026-09-26T00:00:00.000Z",
    );
  });
});
