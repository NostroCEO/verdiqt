import { prisma } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 12 * 60 * 60 * 1000;
const SESSION_GRACE_DAYS = 7;
const SESSIONS_PER_SWEEP = 200;

const globalForRetention = globalThis as typeof globalThis & {
  verdiqtRetentionTimer?: ReturnType<typeof setInterval>;
};

// Founder demand (2026-08-28): archived cases must never make the DB heavy.
// Live data is untouched — a case stays readable for as long as its owner's
// capability cookie lives (30 days, sliding). Only sessions that have been
// EXPIRED for a further 7-day grace window are swept, at which point no
// cookie on earth can reach their trials; children cascade from Trial.
export async function runRetentionSweep(now = new Date()) {
  const results = { apiCache: 0, rateLimits: 0, sessions: 0, trials: 0 };

  const staleCache = await prisma.apiCache.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  results.apiCache = staleCache.count;

  // RateLimitHit rows are keyed by UTC day strings; anything before
  // yesterday can never be read again.
  const cutoffDay = new Date(now.getTime() - 2 * DAY_MS)
    .toISOString()
    .slice(0, 10);
  const staleHits = await prisma.rateLimitHit.deleteMany({
    where: { day: { lt: cutoffDay } },
  });
  results.rateLimits = staleHits.count;

  const sessionCutoff = new Date(now.getTime() - SESSION_GRACE_DAYS * DAY_MS);
  const deadSessions = await prisma.anonymousSession.findMany({
    where: { expiresAt: { lt: sessionCutoff } },
    select: { id: true },
    take: SESSIONS_PER_SWEEP,
  });

  if (deadSessions.length > 0) {
    const ids = deadSessions.map((session) => session.id);
    const trials = await prisma.trial.deleteMany({
      where: { anonymousSessionId: { in: ids } },
    });
    await prisma.anonymousSession.deleteMany({ where: { id: { in: ids } } });
    results.trials = trials.count;
    results.sessions = ids.length;
  }

  return results;
}

export function startRetentionLoop() {
  if (globalForRetention.verdiqtRetentionTimer) return;

  const sweep = () =>
    runRetentionSweep()
      .then((result) => {
        console.log(
          `retention sweep: cache=${result.apiCache} rate=${result.rateLimits} sessions=${result.sessions} trials=${result.trials}`,
        );
      })
      .catch((error) => {
        console.error("retention sweep failed", error);
      });

  // First sweep two minutes after boot (never in the request path), then
  // twice a day. unref keeps the timer from pinning the process open.
  const initial = setTimeout(sweep, 2 * 60 * 1000);
  initial.unref?.();
  globalForRetention.verdiqtRetentionTimer = setInterval(sweep, SWEEP_INTERVAL_MS);
  globalForRetention.verdiqtRetentionTimer.unref?.();
}
