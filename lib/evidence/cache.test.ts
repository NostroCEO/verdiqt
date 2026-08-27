import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiCache: { findUnique: vi.fn(), upsert: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: { apiCache: mocks.apiCache },
}));

import { cachedFetch, CACHE_TTL_HOURS } from "@/lib/evidence/cache";

describe("cachedFetch", () => {
  afterEach(() => {
    mocks.apiCache.findUnique.mockReset();
    mocks.apiCache.upsert.mockReset();
  });

  it("calls the fetcher once, stores under a sha256 key with the TTL, then serves from cache", async () => {
    const now = new Date("2026-08-27T12:00:00.000Z");
    const fn = vi.fn(async () => ({ items: [1, 2] }));
    mocks.apiCache.findUnique.mockResolvedValue(null);
    mocks.apiCache.upsert.mockResolvedValue({});

    const first = await cachedFetch("HACKERNEWS", "query: saas", 24, fn, now);

    expect(first).toEqual({ items: [1, 2] });
    expect(fn).toHaveBeenCalledTimes(1);
    const upsertArg = mocks.apiCache.upsert.mock.calls[0][0];
    expect(upsertArg.where.key).toMatch(/^[0-9a-f]{64}$/);
    expect(upsertArg.create.source).toBe("HACKERNEWS");
    expect(upsertArg.create.expiresAt).toEqual(
      new Date("2026-08-28T12:00:00.000Z"),
    );

    mocks.apiCache.findUnique.mockResolvedValue({
      key: upsertArg.where.key,
      source: "HACKERNEWS",
      payload: { items: [1, 2] },
      expiresAt: new Date("2026-08-28T12:00:00.000Z"),
    });

    const second = await cachedFetch("HACKERNEWS", "query: saas", 24, fn, now);
    expect(second).toEqual({ items: [1, 2] });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("refetches after expiry", async () => {
    const fn = vi.fn(async () => "fresh");
    mocks.apiCache.findUnique.mockResolvedValue({
      key: "k",
      source: "GITHUB",
      payload: "stale",
      expiresAt: new Date("2026-08-27T11:59:59.000Z"),
    });
    mocks.apiCache.upsert.mockResolvedValue({});

    const result = await cachedFetch(
      "GITHUB",
      "repo:acme/x",
      12,
      fn,
      new Date("2026-08-27T12:00:00.000Z"),
    );

    expect(result).toBe("fresh");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(mocks.apiCache.upsert).toHaveBeenCalled();
  });

  it("keys by source and query together so sources never collide", async () => {
    const fn = vi.fn(async () => "x");
    mocks.apiCache.findUnique.mockResolvedValue(null);
    mocks.apiCache.upsert.mockResolvedValue({});
    const now = new Date("2026-08-27T12:00:00.000Z");

    await cachedFetch("REDDIT", "same-query", 12, fn, now);
    await cachedFetch("HACKERNEWS", "same-query", 24, fn, now);

    const [a, b] = mocks.apiCache.upsert.mock.calls.map((c) => c[0].where.key);
    expect(a).not.toBe(b);
  });

  it("exports the architecture TTL table", () => {
    expect(CACHE_TTL_HOURS).toEqual({
      WEB_SEARCH: 24,
      REDDIT: 12,
      HACKERNEWS: 24,
      PRODUCT_HUNT: 24,
      GITHUB: 12,
      GITHUB_METADATA: 1,
    });
  });
});
