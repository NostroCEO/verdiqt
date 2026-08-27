import { createHash } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type CacheSource =
  | "WEB_SEARCH"
  | "REDDIT"
  | "HACKERNEWS"
  | "PRODUCT_HUNT"
  | "GITHUB"
  | "GITHUB_METADATA";

// Per-source TTLs from docs/ARCHITECTURE.md; GITHUB_METADATA is the Task 17
// repository-list cache. OpenAI SDK calls never use this helper (embeddings
// get their own embedWithCache path in Task 8).
export const CACHE_TTL_HOURS: Record<CacheSource, number> = {
  WEB_SEARCH: 24,
  REDDIT: 12,
  HACKERNEWS: 24,
  PRODUCT_HUNT: 24,
  GITHUB: 12,
  GITHUB_METADATA: 1,
};

const HOUR_MS = 60 * 60 * 1000;

function cacheKey(source: CacheSource, key: string) {
  return createHash("sha256").update(`${source}:${key}`).digest("hex");
}

export async function cachedFetch<T>(
  source: CacheSource,
  key: string,
  ttlHours: number,
  fn: () => Promise<T>,
  now = new Date(),
): Promise<T> {
  const hashedKey = cacheKey(source, key);

  const hit = await prisma.apiCache.findUnique({ where: { key: hashedKey } });
  if (hit && hit.expiresAt > now) {
    return hit.payload as T;
  }

  const payload = await fn();
  const expiresAt = new Date(now.getTime() + ttlHours * HOUR_MS);

  await prisma.apiCache.upsert({
    where: { key: hashedKey },
    create: {
      key: hashedKey,
      source,
      payload: payload as Prisma.InputJsonValue,
      expiresAt,
    },
    update: {
      payload: payload as Prisma.InputJsonValue,
      expiresAt,
    },
  });

  return payload;
}
