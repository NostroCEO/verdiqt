import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  anonymousSession: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    anonymousSession: mocks.anonymousSession,
  },
}));

import {
  ANONYMOUS_SESSION_COOKIE,
  createAnonymousCapability,
  hashCapability,
  resolveAnonymousPrincipal,
  resolveCurrentAnonymousPrincipal,
} from "@/lib/access";

function cookieStoreWith(value?: string) {
  return {
    get: vi.fn(() => (value === undefined ? undefined : { value })),
    set: vi.fn(),
  };
}

describe("anonymous principal resolvers", () => {
  afterEach(() => {
    mocks.anonymousSession.findUnique.mockReset();
    mocks.anonymousSession.create.mockReset();
    mocks.anonymousSession.update.mockReset();
    vi.unstubAllEnvs();
  });

  it("reuses a valid session, slides the TTL, and re-sets the cookie", async () => {
    const capability = createAnonymousCapability();
    const now = new Date("2026-08-27T12:00:00.000Z");
    const store = cookieStoreWith(capability);
    mocks.anonymousSession.findUnique.mockResolvedValue({
      id: "anon_1",
      expiresAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    mocks.anonymousSession.update.mockResolvedValue({ id: "anon_1" });

    const principal = await resolveAnonymousPrincipal(store, now);

    expect(principal).toEqual({ kind: "anonymous", anonymousSessionId: "anon_1" });
    expect(mocks.anonymousSession.findUnique).toHaveBeenCalledWith({
      where: { capabilityHash: hashCapability(capability) },
      select: { id: true, expiresAt: true },
    });
    expect(mocks.anonymousSession.update).toHaveBeenCalledWith({
      where: { id: "anon_1" },
      data: { expiresAt: new Date("2026-09-26T12:00:00.000Z") },
    });
    expect(store.set).toHaveBeenCalledWith(
      ANONYMOUS_SESSION_COOKIE,
      capability,
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
    expect(mocks.anonymousSession.create).not.toHaveBeenCalled();
  });

  it("creates a fresh session for an expired capability and stores only the hash", async () => {
    const staleCapability = createAnonymousCapability();
    const now = new Date("2026-08-27T12:00:00.000Z");
    const store = cookieStoreWith(staleCapability);
    mocks.anonymousSession.findUnique.mockResolvedValue({
      id: "anon_old",
      expiresAt: new Date("2026-08-01T00:00:00.000Z"),
    });
    mocks.anonymousSession.create.mockResolvedValue({ id: "anon_new" });

    const principal = await resolveAnonymousPrincipal(store, now);

    expect(principal.anonymousSessionId).toBe("anon_new");
    const createArg = mocks.anonymousSession.create.mock.calls[0][0];
    expect(createArg.data.capabilityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(createArg)).not.toContain(staleCapability);
    const newCookieValue = store.set.mock.calls[0][1];
    expect(newCookieValue).not.toBe(staleCapability);
    expect(hashCapability(newCookieValue)).toBe(createArg.data.capabilityHash);
  });

  it("creates a session when the cookie is missing or malformed", async () => {
    for (const store of [cookieStoreWith(undefined), cookieStoreWith("short!!")]) {
      mocks.anonymousSession.create.mockResolvedValue({ id: "anon_created" });

      const principal = await resolveAnonymousPrincipal(store, new Date());

      expect(principal.anonymousSessionId).toBe("anon_created");
      expect(mocks.anonymousSession.findUnique).not.toHaveBeenCalled();
      mocks.anonymousSession.create.mockReset();
      mocks.anonymousSession.findUnique.mockReset();
    }
  });

  it("resolve-only variant returns null instead of creating sessions", async () => {
    const missing = await resolveCurrentAnonymousPrincipal(cookieStoreWith(undefined));
    expect(missing).toBeNull();

    const capability = createAnonymousCapability();
    mocks.anonymousSession.findUnique.mockResolvedValue({
      id: "anon_expired",
      expiresAt: new Date("2026-08-01T00:00:00.000Z"),
    });
    const expired = await resolveCurrentAnonymousPrincipal(
      cookieStoreWith(capability),
      new Date("2026-08-27T12:00:00.000Z"),
    );

    expect(expired).toBeNull();
    expect(mocks.anonymousSession.create).not.toHaveBeenCalled();
  });

  it("marks the cookie secure under production NODE_ENV", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const store = cookieStoreWith(undefined);
    mocks.anonymousSession.create.mockResolvedValue({ id: "anon_prod" });

    await resolveAnonymousPrincipal(store, new Date());

    expect(store.set).toHaveBeenCalledWith(
      ANONYMOUS_SESSION_COOKIE,
      expect.any(String),
      expect.objectContaining({ secure: true }),
    );
  });
});
