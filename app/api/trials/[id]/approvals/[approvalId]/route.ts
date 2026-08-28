import { Actor, ApprovalState, PipelineRunKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { getOwnedTrial } from "@/lib/trials/access";
import { createRevisionedRun } from "@/lib/trials/rescore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({ action: z.enum(["approve", "reject"]) })
  .strict();

function approvalDimension(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>).dimension;
  return typeof value === "string" ? value : null;
}

// The human closes the loop on an agent's deep-scan request: approve opens
// exactly one revisioned DEEP_SCAN run (the conditional PENDING transition
// makes double-clicks and races collapse into the first decision), reject
// records the refusal. Owner-scoped like every trial route.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; approvalId: string }> },
) {
  const { id, approvalId } = await context.params;

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

  const trial = await getOwnedTrial(id, { id: true });
  if (!trial) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const approval = await prisma.approval.findFirst({
    where: { id: approvalId, trialId: id },
    select: { id: true, state: true, payload: true },
  });
  if (!approval) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const nextState =
    parsed.data.action === "approve"
      ? ApprovalState.APPROVED
      : ApprovalState.REJECTED;

  const transitioned = await prisma.approval.updateMany({
    where: { id: approvalId, state: ApprovalState.PENDING_HUMAN_APPROVAL },
    data: { state: nextState, decidedAt: new Date() },
  });

  if (transitioned.count === 0) {
    return NextResponse.json(
      { error: "already_decided", state: approval.state },
      { status: 409 },
    );
  }

  const dimension = approvalDimension(approval.payload);

  if (parsed.data.action === "reject") {
    await emitEvent({
      trialId: id,
      actor: Actor.HUMAN,
      kind: "human_rejected",
      dedupeKey: `approval:${approvalId}:human_rejected`,
      payload: { approvalId, dimension },
    });
    return NextResponse.json({ state: "REJECTED" });
  }

  const { pipelineRevision } = await createRevisionedRun(
    id,
    PipelineRunKind.DEEP_SCAN,
    "human_approved",
    Actor.HUMAN,
    { approvalId, dimension },
  );

  return NextResponse.json({
    state: "APPROVED",
    pipeline_revision: pipelineRevision,
  });
}
