import { createHash } from "node:crypto";

import { prisma } from "@/lib/db";

export function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}

export function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

// Atomic upsert-increment on the (ipHash, day) unique key: concurrent
// requests each get a distinct count, so the limit cannot be raced past.
export async function checkRateLimit(
  ipHash: string,
  limit: number,
  now = new Date(),
): Promise<{ allowed: boolean; count: number }> {
  const hit = await prisma.rateLimitHit.upsert({
    where: { ipHash_day: { ipHash, day: utcDay(now) } },
    create: { ipHash, day: utcDay(now), count: 1 },
    update: { count: { increment: 1 } },
  });

  return { allowed: hit.count <= limit, count: hit.count };
}
