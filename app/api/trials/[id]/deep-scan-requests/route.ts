import { Actor, ApprovalKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { getOwnedTrial } from "@/lib/trials/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPROVAL_TTL_HOURS = 24;

const bodySchema = z
  .object({
    dimension: z.enum(["PROBLEM_SEVERITY", "DEMAND_SIGNALS", "COMPETITION", "MONETIZATION", "DISTRIBUTION", "BUILD_COST"]),
    reason: z.string().max(300).optional(),
  })
  .strict();

// Tool #4: NEVER executes a scan. Creates the persistent PENDING approval;
// only the page-owned approval route can transition it. A duplicate pending
// request for the same owner, trial revision, and dimension returns the
// same approval even when the display-only reason changes.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const trial = await getOwnedTrial(id, {
    id: true,
    anonymousSessionId: true,
    pipelineRevision: true,
  });
  if (!trial || !trial.anonymousSessionId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const dedupeKey = `deep_scan:${trial.id}:${trial.pipelineRevision}:${parsed.data.dimension}`;

  const approval = await prisma.approval.upsert({
    where: { dedupeKey },
    create: {
      kind: ApprovalKind.DEEP_SCAN,
      trialId: trial.id,
      anonymousSessionId: trial.anonymousSessionId,
      requestedBy: Actor.AGENT,
      requestedRevision: trial.pipelineRevision,
      payload: {
        dimension: parsed.data.dimension,
        reason: parsed.data.reason ?? null,
      },
      dedupeKey,
      expiresAt: new Date(Date.now() + APPROVAL_TTL_HOURS * 60 * 60 * 1000),
    },
    update: {},
    select: { id: true, state: true },
  });

  await emitEvent({
    trialId: trial.id,
    actor: Actor.AGENT,
    kind: "deep_scan_requested",
    dedupeKey: `${approval.id}:deep_scan_requested`,
    payload: { dimension: parsed.data.dimension, approvalId: approval.id },
  });

  return NextResponse.json(
    { approval_id: approval.id, state: approval.state },
    { status: 202 },
  );
}
