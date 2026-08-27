import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { AnonymousCookieStore } from "@/lib/access";
import { resolveCurrentAnonymousPrincipal } from "@/lib/access";
import { prisma } from "@/lib/db";
import { decodeTrialEventCursor, listEventsAfter } from "@/lib/events";
import { createTrialEventStream } from "@/lib/trial-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Owner-authorized SSE stream of TrialEvent rows. Unknown and foreign trial
// ids return the identical 404; a run id alone never grants access.
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const cookieStore = (await cookies()) as unknown as AnonymousCookieStore;
  const principal = await resolveCurrentAnonymousPrincipal(cookieStore);

  if (!principal) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const trial = await prisma.trial.findFirst({
    where: { id, anonymousSessionId: principal.anonymousSessionId },
    select: { id: true },
  });

  if (!trial) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const lastEventId = request.headers.get("last-event-id");
  const initialCursor = lastEventId ? decodeTrialEventCursor(lastEventId) : null;

  const stream = createTrialEventStream({
    listEvents: (cursor) => listEventsAfter(trial.id, cursor),
    initialCursor,
    signal: request.signal,
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
