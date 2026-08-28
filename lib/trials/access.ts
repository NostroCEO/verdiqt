import { cookies } from "next/headers";

import type { AnonymousCookieStore } from "@/lib/access";
import { resolveCurrentAnonymousPrincipal } from "@/lib/access";
import { prisma } from "@/lib/db";

// Owner-scoped trial lookup shared by every /api/trials/[id]/* route.
// Missing principal, unknown id, and another owner's id are all `null`,
// so callers return one identical 404 and enumeration learns nothing.
export async function getOwnedTrial<T extends object>(
  id: string,
  select: T,
) {
  const cookieStore = (await cookies()) as unknown as AnonymousCookieStore;
  const principal = await resolveCurrentAnonymousPrincipal(cookieStore);

  if (!principal) return null;

  return prisma.trial.findFirst({
    where: { id, anonymousSessionId: principal.anonymousSessionId },
    select,
  });
}

export async function currentPrincipal() {
  const cookieStore = (await cookies()) as unknown as AnonymousCookieStore;
  return resolveCurrentAnonymousPrincipal(cookieStore);
}
