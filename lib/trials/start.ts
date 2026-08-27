import {
  Actor,
  PipelineRunKind,
  TrialStatus,
  type Dimension,
  type Prisma,
} from "@prisma/client";

import {
  resolveAnonymousPrincipal,
  type AnonymousCookieStore,
} from "@/lib/access";
import { prisma } from "@/lib/db";
import { enqueueTrial } from "@/lib/queue";

export const DEFAULT_TRIAL_WEIGHTS: Record<Dimension, number> = {
  PROBLEM_SEVERITY: 20,
  DEMAND_SIGNALS: 20,
  COMPETITION: 15,
  MONETIZATION: 20,
  DISTRIBUTION: 15,
  BUILD_COST: 10,
};

export type StartTrialInput = {
  ideaText?: string;
  repoUrl?: string;
  cookieStore: AnonymousCookieStore;
};

export async function startTrial(input: StartTrialInput) {
  const suppliedInputs =
    Number(typeof input.ideaText === "string") +
    Number(typeof input.repoUrl === "string");

  if (suppliedInputs !== 1) {
    throw new Error("start_trial_requires_exactly_one_input");
  }

  const principal = await resolveAnonymousPrincipal(input.cookieStore);
  const created = await prisma.$transaction(async (tx) => {
    const trial = await tx.trial.create({
      data: {
        anonymousSessionId: principal.anonymousSessionId,
        ideaText: input.ideaText,
        repoUrl: input.repoUrl,
        status: TrialStatus.QUEUED,
        weights: { ...DEFAULT_TRIAL_WEIGHTS } satisfies Prisma.InputJsonObject,
        pipelineRevision: 1,
        completedRevision: 0,
      },
      select: { id: true, status: true },
    });
    const jobKey = `trial:${trial.id}:revision:1`;
    const pipelineRun = await tx.pipelineRun.create({
      data: {
        trialId: trial.id,
        revision: 1,
        kind: PipelineRunKind.FULL,
        jobKey,
      },
      select: { id: true, jobKey: true },
    });

    await tx.trialEvent.create({
      data: {
        trialId: trial.id,
        pipelineRunId: pipelineRun.id,
        actor: Actor.SYSTEM,
        kind: "trial_queued",
        dedupeKey: `${pipelineRun.id}:trial_queued`,
        payload: { revision: 1 },
      },
    });

    return { trial, pipelineRun };
  });

  await enqueueTrial({
    pipelineRunId: created.pipelineRun.id,
    jobKey: created.pipelineRun.jobKey,
  });

  return {
    run_id: created.trial.id,
    status: created.trial.status,
    dashboard_url: `/trial/${created.trial.id}`,
  };
}
