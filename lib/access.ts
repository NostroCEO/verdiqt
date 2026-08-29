import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";

export const ANONYMOUS_SESSION_COOKIE = "verdiqt_anon";
export const ANONYMOUS_SESSION_TTL_DAYS = 30;

const CAPABILITY_LENGTH = 43;
const CAPABILITY_PATTERN = /^[A-Za-z0-9_-]+$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AnonymousCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
};

export type AnonymousCookieStore = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: AnonymousCookieOptions): void;
};

export type Principal = {
  kind: "anonymous";
  anonymousSessionId: string;
};

// The poll routes resolve the principal on every request (status 5s,
// evidence 2.5s, SSE connects); the capabilityHash -> session mapping is
// immutable apart from its sliding expiry, so a short in-process cache
// removes one DB read per poll with no correctness risk.
const PRINCIPAL_CACHE_TTL_MS = 60 * 1000;
const PRINCIPAL_CACHE_MAX = 1000;
const principalCache = new Map<
  string,
  { id: string; expiresAt: number; cachedAt: number }
>();

// The 30-day expiry slides on every request; rewriting the row on every
// 2.5s poll is pure write churn. Refresh at most once per 6 hours — the
// visible TTL never drops below 30 days minus 6 hours.
const EXPIRY_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

function shouldRefreshExpiry(expiresAt: Date, now: Date) {
  const fullTtl = ANONYMOUS_SESSION_TTL_DAYS * DAY_MS;
  return expiresAt.getTime() - now.getTime() < fullTtl - EXPIRY_REFRESH_INTERVAL_MS;
}

export function createAnonymousCapability() {
  return randomBytes(32).toString("base64url");
}

export function hashCapability(capability: string) {
  return createHash("sha256").update(capability).digest("hex");
}

export function isAnonymousCapability(value: string) {
  return (
    value.length === CAPABILITY_LENGTH && CAPABILITY_PATTERN.test(value)
  );
}

export function anonymousSessionExpiresAt(now = new Date()) {
  return new Date(now.getTime() + ANONYMOUS_SESSION_TTL_DAYS * DAY_MS);
}

export function anonymousCookieOptions(): AnonymousCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ANONYMOUS_SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

export async function resolveAnonymousPrincipal(
  cookieStore: AnonymousCookieStore,
  now = new Date(),
): Promise<Principal> {
  const currentCapability = cookieStore.get(ANONYMOUS_SESSION_COOKIE)?.value;

  if (currentCapability && isAnonymousCapability(currentCapability)) {
    const currentHash = hashCapability(currentCapability);
    const existingSession = await prisma.anonymousSession.findUnique({
      where: { capabilityHash: currentHash },
      select: { id: true, expiresAt: true },
    });

    if (existingSession && existingSession.expiresAt > now) {
      if (shouldRefreshExpiry(existingSession.expiresAt, now)) {
        await prisma.anonymousSession.update({
          where: { id: existingSession.id },
          data: { expiresAt: anonymousSessionExpiresAt(now) },
        });
        principalCache.delete(currentHash);
      }
      cookieStore.set(
        ANONYMOUS_SESSION_COOKIE,
        currentCapability,
        anonymousCookieOptions(),
      );

      return {
        kind: "anonymous",
        anonymousSessionId: existingSession.id,
      };
    }
  }

  const capability = createAnonymousCapability();
  const session = await prisma.anonymousSession.create({
    data: {
      capabilityHash: hashCapability(capability),
      expiresAt: anonymousSessionExpiresAt(now),
    },
    select: { id: true },
  });

  cookieStore.set(
    ANONYMOUS_SESSION_COOKIE,
    capability,
    anonymousCookieOptions(),
  );

  return {
    kind: "anonymous",
    anonymousSessionId: session.id,
  };
}

export async function resolveCurrentAnonymousPrincipal(
  cookieStore: AnonymousCookieStore,
  now = new Date(),
): Promise<Principal | null> {
  const currentCapability = cookieStore.get(ANONYMOUS_SESSION_COOKIE)?.value;

  if (!currentCapability || !isAnonymousCapability(currentCapability)) {
    return null;
  }

  const currentHash = hashCapability(currentCapability);

  const cached = principalCache.get(currentHash);
  if (
    cached &&
    cached.cachedAt + PRINCIPAL_CACHE_TTL_MS > now.getTime() &&
    cached.expiresAt > now.getTime()
  ) {
    return { kind: "anonymous", anonymousSessionId: cached.id };
  }

  const existingSession = await prisma.anonymousSession.findUnique({
    where: { capabilityHash: currentHash },
    select: { id: true, expiresAt: true },
  });

  if (!existingSession || existingSession.expiresAt <= now) {
    principalCache.delete(currentHash);
    return null;
  }

  if (shouldRefreshExpiry(existingSession.expiresAt, now)) {
    await prisma.anonymousSession.update({
      where: { id: existingSession.id },
      data: { expiresAt: anonymousSessionExpiresAt(now) },
    });
  }
  cookieStore.set(
    ANONYMOUS_SESSION_COOKIE,
    currentCapability,
    anonymousCookieOptions(),
  );

  if (principalCache.size > PRINCIPAL_CACHE_MAX) {
    const now = Date.now();
    for (const [key, entry] of principalCache) {
      if (entry.cachedAt + PRINCIPAL_CACHE_TTL_MS <= now) {
        principalCache.delete(key);
      }
    }
    if (principalCache.size > PRINCIPAL_CACHE_MAX) {
      const quarter = Math.ceil(PRINCIPAL_CACHE_MAX / 4);
      let evicted = 0;
      for (const key of principalCache.keys()) {
        if (evicted >= quarter) break;
        principalCache.delete(key);
        evicted++;
      }
    }
  }
  principalCache.set(currentHash, {
    id: existingSession.id,
    expiresAt: existingSession.expiresAt.getTime(),
    cachedAt: now.getTime(),
  });

  return {
    kind: "anonymous",
    anonymousSessionId: existingSession.id,
  };
}
