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
      await prisma.anonymousSession.update({
        where: { id: existingSession.id },
        data: { expiresAt: anonymousSessionExpiresAt(now) },
      });
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
  const existingSession = await prisma.anonymousSession.findUnique({
    where: { capabilityHash: currentHash },
    select: { id: true, expiresAt: true },
  });

  if (!existingSession || existingSession.expiresAt <= now) {
    return null;
  }

  await prisma.anonymousSession.update({
    where: { id: existingSession.id },
    data: { expiresAt: anonymousSessionExpiresAt(now) },
  });
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
