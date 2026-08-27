import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rateLimitHit: { upsert: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: { rateLimitHit: mocks.rateLimitHit },
}));

import { checkRateLimit, hashIp, utcDay } from "@/lib/ratelimit";

describe("rate limiting", () => {
  afterEach(() => {
    mocks.rateLimitHit.upsert.mockReset();
  });

  it("increments atomically on the (ipHash, day) key and allows under the limit", async () => {
    mocks.rateLimitHit.upsert.mockResolvedValue({ count: 3 });
    const now = new Date("2026-08-27T23:59:00.000Z");

    const result = await checkRateLimit("hash1", 5, now);

    expect(result).toEqual({ allowed: true, count: 3 });
    expect(mocks.rateLimitHit.upsert).toHaveBeenCalledWith({
      where: { ipHash_day: { ipHash: "hash1", day: "2026-08-27" } },
      create: { ipHash: "hash1", day: "2026-08-27", count: 1 },
      update: { count: { increment: 1 } },
    });
  });

  it("denies once the count passes the limit", async () => {
    mocks.rateLimitHit.upsert.mockResolvedValue({ count: 6 });

    const result = await checkRateLimit("hash1", 5);

    expect(result.allowed).toBe(false);
  });

  it("hashes ips and buckets by UTC day", () => {
    expect(hashIp("1.2.3.4")).toMatch(/^[0-9a-f]{64}$/);
    expect(utcDay(new Date("2026-08-27T00:00:01.000Z"))).toBe("2026-08-27");
  });
});
