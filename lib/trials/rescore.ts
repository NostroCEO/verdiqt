import { Actor, PipelineRunKind, TrialStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { enqueueTrial } from "@/lib/queue";

// One transaction bumps the trial to a fresh revision and records the run;
// the (trialId, revision) unique key plus the jobKey singleton make a
// concurrent duplicate trigger collapse into the existing run.
export async function createRevisionedRun(
  trialId: string,
  kind: PipelineRunKind,
  eventKind: string,
  actor: Actor,
  payload: Record<string, unknown>,
) {
  const created = await prisma.$transaction(async (tx) => {
    const trial = await tx.trial.update({
      where: { id: trialId },
      data: {
        pipelineRevision: { increment: 1 },
        status: TrialStatus.QUEUED,
      },
      select: { pipelineRevision: true },
    });

    const revision = trial.pipelineRevision;
    const jobKey = `trial:${trialId}:revision:${revision}`;

    const run = await tx.pipelineRun.create({
      data: { trialId, revision, kind, jobKey },
      select: { id: true, jobKey: true, revision: true },
    });

    await tx.trialEvent.create({
      data: {
        trialId,
        pipelineRunId: run.id,
        actor,
        kind: eventKind,
        dedupeKey: `${run.id}:${eventKind}`,
        payload: { ...payload, revision },
      },
    });

    return run;
  });

  await enqueueTrial({ pipelineRunId: created.id, jobKey: created.jobKey });
  return { pipelineRevision: created.revision };
}

export { emitEvent };
