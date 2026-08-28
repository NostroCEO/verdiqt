import { Actor, PipelineRunKind, TrialStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { enqueueTrial } from "@/lib/queue";
import { DEFAULT_TRIAL_WEIGHTS } from "@/lib/trials/start";
import { getOwnedTrial } from "@/lib/trials/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({ pivotText: z.string().min(1).max(2000) })
  .strict();

// Tool #6: re-run validation on a pivoted version as a NEW linked trial,
// never replacing the parent, so compare_ideas can hold both side by side.
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

  const parent = await getOwnedTrial(id, {
    id: true,
    anonymousSessionId: true,
  });
  if (!parent || !parent.anonymousSessionId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const trial = await tx.trial.create({
      data: {
        anonymousSessionId: parent.anonymousSessionId,
        ideaText: parsed.data.pivotText,
        parentTrialId: parent.id,
        status: TrialStatus.QUEUED,
        weights: { ...DEFAULT_TRIAL_WEIGHTS },
        pipelineRevision: 1,
        completedRevision: 0,
      },
      select: { id: true },
    });
    const run = await tx.pipelineRun.create({
      data: {
        trialId: trial.id,
        revision: 1,
        kind: PipelineRunKind.FULL,
        jobKey: `trial:${trial.id}:revision:1`,
      },
      select: { id: true, jobKey: true },
    });
    await tx.trialEvent.create({
      data: {
        trialId: trial.id,
        pipelineRunId: run.id,
        actor: Actor.AGENT,
        kind: "trial_refined",
        dedupeKey: `${run.id}:trial_refined`,
        payload: { parentTrialId: parent.id, revision: 1 },
      },
    });
    return { trial, run };
  });

  await enqueueTrial({
    pipelineRunId: created.run.id,
    jobKey: created.run.jobKey,
  });

  return NextResponse.json(
    { new_run_id: created.trial.id, parent_run_id: parent.id },
    { status: 202 },
  );
}
