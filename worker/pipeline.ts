import { Actor, PipelineRunStatus, TrialStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";

const LEASE_MINUTES = 5;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Task 4 stub pipeline: NORMALIZING then COMPLETE with a fixed composite
// score, staged events one second apart. Task 11 replaces the body with the
// real five stages; the claim/idempotency contract below is permanent.
// Delivery is at-least-once: every write is conditional or dedupe-keyed, so
// a duplicate or resumed delivery cannot double-apply.
export async function runPipeline(
  pipelineRunId: string,
  { stageDelayMs = 1000 }: { stageDelayMs?: number } = {},
) {
  const run = await prisma.pipelineRun.findUnique({
    where: { id: pipelineRunId },
    select: {
      id: true,
      revision: true,
      status: true,
      trialId: true,
    },
  });

  // Unknown or already-terminal deliveries exit safely.
  if (!run || run.status !== PipelineRunStatus.RUNNING) {
    return;
  }

  try {
    await prisma.trial.update({
      where: { id: run.trialId },
      data: { status: TrialStatus.NORMALIZING },
    });
    await emitEvent({
      trialId: run.trialId,
      pipelineRunId: run.id,
      actor: Actor.SYSTEM,
      kind: "stage_started",
      dedupeKey: `${run.id}:stage:NORMALIZING`,
      payload: { stage: "NORMALIZING", revision: run.revision },
    });

    await sleep(stageDelayMs);

    await prisma.trial.update({
      where: { id: run.trialId },
      data: {
        status: TrialStatus.COMPLETE,
        compositeScore: 50,
        completedRevision: run.revision,
        completedAt: new Date(),
      },
    });
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: PipelineRunStatus.COMPLETE,
        completedAt: new Date(),
      },
    });
    await emitEvent({
      trialId: run.trialId,
      pipelineRunId: run.id,
      actor: Actor.SYSTEM,
      kind: "trial_completed",
      dedupeKey: `${run.id}:trial_completed`,
      payload: { revision: run.revision, compositeScore: 50 },
    });
  } catch (error) {
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { status: PipelineRunStatus.FAILED, completedAt: new Date() },
    });
    await prisma.trial.update({
      where: { id: run.trialId },
      data: { status: TrialStatus.FAILED },
    });
    await emitEvent({
      trialId: run.trialId,
      pipelineRunId: run.id,
      actor: Actor.SYSTEM,
      kind: "trial_failed",
      dedupeKey: `${run.id}:trial_failed`,
      payload: { revision: run.revision },
    });
    throw error;
  }
}

// Conditional claim: only a QUEUED run transitions to RUNNING, exactly once.
// Duplicate pg-boss deliveries find zero rows to claim and exit safely.
export async function claimRun(pipelineRunId: string) {
  const claimed = await prisma.pipelineRun.updateMany({
    where: { id: pipelineRunId, status: PipelineRunStatus.QUEUED },
    data: {
      status: PipelineRunStatus.RUNNING,
      startedAt: new Date(),
      leaseExpiresAt: new Date(Date.now() + LEASE_MINUTES * 60 * 1000),
    },
  });

  return claimed.count === 1;
}
