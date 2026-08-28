import { createHash } from "node:crypto";

import {
  Actor,
  PipelineRunKind,
  PipelineRunStatus,
  TrialStatus,
  type Dimension,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { gatherAll } from "@/lib/evidence/gather";
import type { EvidenceEmitter, NormalizedIdea } from "@/lib/evidence/types";
import { retrieveGrounding } from "@/lib/brain/retrieve";
import { TRIAL_CAPS } from "@/lib/llm";
import { classifyEvidence } from "@/lib/verdict/classify";
import { benchReview } from "@/lib/verdict/bench";
import {
  composeVerdict,
  pivotDirectionFor,
  selectNextStep,
  verdictForComposite,
  type DimensionScores,
} from "@/lib/verdict/compose";
import { normalizeIdea } from "@/lib/verdict/normalize";
import { scoreDimension, type ScorableEvidence } from "@/lib/verdict/score";
import { DIMENSIONS, validateWeights, DEFAULT_WEIGHTS } from "@/lib/verdict/weights";

const LEASE_MINUTES = 5;

type RunContext = {
  runId: string;
  revision: number;
  kind: PipelineRunKind;
  trialId: string;
};

function fingerprint(source: string, url: string) {
  return createHash("sha256").update(`${source}:${url}`).digest("hex");
}

function sourceHash(input: { ideaText?: string | null; repoUrl?: string | null }) {
  return createHash("sha256")
    .update(`${input.ideaText ?? ""}:${input.repoUrl ?? ""}`)
    .digest("hex");
}

async function setStage(ctx: RunContext, stage: TrialStatus) {
  await prisma.trial.update({
    where: { id: ctx.trialId },
    data: { status: stage },
  });
  await emitEvent({
    trialId: ctx.trialId,
    pipelineRunId: ctx.runId,
    actor: Actor.SYSTEM,
    kind: "stage_started",
    dedupeKey: `${ctx.runId}:stage:${stage}`,
    payload: { stage, revision: ctx.revision },
  });
}

function makeEmitter(ctx: RunContext): EvidenceEmitter {
  return (kind, payload) => {
    void emitEvent({
      trialId: ctx.trialId,
      pipelineRunId: ctx.runId,
      actor: Actor.SYSTEM,
      kind,
      dedupeKey: `${ctx.runId}:src:${payload.source}:${kind}:${payload.reason ?? ""}`,
      payload,
    }).catch(() => {
      // Event emission must never fail a stage.
    });
  };
}

// A stale revision must never overwrite a newer result: the guard runs at
// claim time and again immediately before the terminal write.
async function isSuperseded(ctx: RunContext) {
  const trial = await prisma.trial.findUnique({
    where: { id: ctx.trialId },
    select: { pipelineRevision: true },
  });
  return !trial || trial.pipelineRevision > ctx.revision;
}

async function markSuperseded(ctx: RunContext) {
  await prisma.pipelineRun.update({
    where: { id: ctx.runId },
    data: { status: PipelineRunStatus.SUPERSEDED, completedAt: new Date() },
  });
}

async function stageNormalize(
  ctx: RunContext,
  trial: { ideaText: string | null; repoUrl: string | null },
): Promise<NormalizedIdea> {
  await setStage(ctx, TrialStatus.NORMALIZING);

  const existing = await prisma.normalizedIdea.findUnique({
    where: { trialId: ctx.trialId },
  });
  const hash = sourceHash(trial);

  if (existing && existing.sourceHash === hash) {
    return {
      oneLiner: existing.oneLiner,
      audience: existing.audience,
      problem: existing.problem,
      category: existing.category,
      keywords: existing.keywords,
    };
  }

  const idea = await normalizeIdea({
    ideaText: trial.ideaText ?? undefined,
    repoUrl: trial.repoUrl ?? undefined,
  });

  await prisma.normalizedIdea.upsert({
    where: { trialId: ctx.trialId },
    create: { trialId: ctx.trialId, sourceHash: hash, ...idea },
    update: { sourceHash: hash, ...idea },
  });

  return idea;
}

async function stageGatherAndClassify(ctx: RunContext, idea: NormalizedIdea) {
  const emit = makeEmitter(ctx);

  await setStage(ctx, TrialStatus.GATHERING);
  const raw = (await gatherAll(idea, emit)).slice(
    0,
    TRIAL_CAPS.maxEvidenceItemsPerTrial,
  );

  // Observability: per-source yields become events, so a zero-yield source
  // is visible in the trial feed instead of silently narrowing coverage.
  const counts = new Map<string, number>();
  for (const item of raw) {
    counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
  }
  for (const [source, count] of counts) {
    emit("source_gathered", { source, count });
  }

  await setStage(ctx, TrialStatus.CLASSIFYING);
  const { items } = await classifyEvidence(idea, raw, emit);

  // Deterministic upsert by (trialId, fingerprint): re-delivery and deep
  // scans never duplicate rows, and human pin/reject states survive.
  for (const item of items) {
    await prisma.evidence.upsert({
      where: {
        trialId_fingerprint: {
          trialId: ctx.trialId,
          fingerprint: fingerprint(item.source, item.url),
        },
      },
      create: {
        trialId: ctx.trialId,
        source: item.source,
        url: item.url,
        title: item.title,
        snippet: item.snippet,
        dimension: item.dimension as Dimension,
        strength: item.strength,
        fingerprint: fingerprint(item.source, item.url),
      },
      update: {
        snippet: item.snippet,
        strength: item.strength,
      },
    });
  }
}

async function stageScoreAndCompose(ctx: RunContext, idea: NormalizedIdea) {
  await setStage(ctx, TrialStatus.SCORING);

  const trial = await prisma.trial.findUnique({
    where: { id: ctx.trialId },
    select: { weights: true },
  });
  const weights = validateWeights(trial?.weights)
    ? (trial?.weights as DimensionScores)
    : DEFAULT_WEIGHTS;

  const allEvidence = await prisma.evidence.findMany({
    where: { trialId: ctx.trialId },
    orderBy: { createdAt: "asc" },
  });

  const scores = {} as DimensionScores;
  const rationales = {} as Record<Dimension, string>;

  for (const dimension of DIMENSIONS) {
    // Ten strongest items are plenty for one dimension's scoring prompt;
    // larger prompts were blowing through the free tier's per-minute token
    // window across six back-to-back calls (observed live 2026-08-28).
    const dimensionEvidence: ScorableEvidence[] = allEvidence
      .filter((row) => row.dimension === dimension)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10)
      .map((row) => ({
        id: row.id,
        humanState: row.humanState,
        source: row.source,
        url: row.url,
        title: row.title,
        snippet: row.snippet,
        dimension: row.dimension,
        strength: row.strength,
      }));

    const knowledge = await retrieveGrounding(
      [idea.category, ...idea.keywords],
      [dimension],
      4,
    ).catch((error: unknown) => {
      console.error("knowledge retrieval failed", error);
      return [];
    });

    // The knowledge stage is visible like every other source (founder rule:
    // the user sees where information comes from); zero-yield is a signal,
    // never a silent shrug.
    void emitEvent({
      trialId: ctx.trialId,
      pipelineRunId: ctx.runId,
      actor: Actor.SYSTEM,
      kind: "knowledge_retrieved",
      dedupeKey: `${ctx.runId}:knowledge:${dimension}`,
      payload: { revision: ctx.revision, dimension, count: knowledge.length },
    }).catch(() => {});

    const result = await scoreDimension(idea, dimension, dimensionEvidence, knowledge);
    scores[dimension] = result.score;
    rationales[dimension] = result.rationale;

    await prisma.dimensionScore.upsert({
      where: { trialId_dimension: { trialId: ctx.trialId, dimension } },
      create: {
        trialId: ctx.trialId,
        dimension,
        score: result.score,
        rationale: result.rationale,
        evidenceIds: result.evidenceIds,
      },
      update: {
        score: result.score,
        rationale: result.rationale,
        evidenceIds: result.evidenceIds,
      },
    });
  }

  const composed = composeVerdict(scores, weights);

  // Judge 2, the bench (founder directive 2026-08-28): a second agent reads
  // the whole case file and delivers the FINAL verdict, so phase 3 is an
  // objective per-case ruling. The panel's math stays the anchor: the bench
  // adjusts within +-8 and the thresholds re-apply in code. A bench failure
  // falls back to the panel result — it never kills the trial.
  void emitEvent({
    trialId: ctx.trialId,
    pipelineRunId: ctx.runId,
    actor: Actor.SYSTEM,
    kind: "bench_deliberating",
    dedupeKey: `${ctx.runId}:bench_deliberating`,
    payload: { revision: ctx.revision, stage: "BENCH_REVIEW" },
  }).catch(() => {});

  const bench = await benchReview({
    idea,
    dimensions: DIMENSIONS.map((dimension) => ({
      dimension,
      score: scores[dimension],
      rationale: rationales[dimension] ?? "",
    })),
    mathComposite: composed.compositeScore,
    evidenceCount: allEvidence.length,
  }).catch((error: unknown) => {
    console.error("bench review failed", error);
    return null;
  });

  let compositeScore = composed.compositeScore;
  let verdict = composed.verdict;
  let pivotDirection = composed.pivotDirection;
  let nextStep: Record<string, unknown> = composed.nextStep as unknown as Record<
    string,
    unknown
  >;

  if (bench) {
    compositeScore = Math.max(
      0,
      Math.min(100, composed.compositeScore + bench.compositeAdjustment),
    );
    verdict = verdictForComposite(compositeScore);
    pivotDirection = pivotDirectionFor(scores, verdict);
    nextStep = {
      ...selectNextStep(scores, weights, verdict),
      bench_opinion: bench.opinion,
      bench_confidence: bench.confidence,
    };
  }

  if (await isSuperseded(ctx)) {
    await markSuperseded(ctx);
    return null;
  }

  await prisma.trial.update({
    where: { id: ctx.trialId },
    data: {
      status: TrialStatus.COMPLETE,
      compositeScore,
      verdict,
      pivotDirection,
      nextStep: nextStep as Prisma.InputJsonObject,
      completedRevision: ctx.revision,
      completedAt: new Date(),
    },
  });
  await prisma.pipelineRun.update({
    where: { id: ctx.runId },
    data: { status: PipelineRunStatus.COMPLETE, completedAt: new Date() },
  });
  await emitEvent({
    trialId: ctx.trialId,
    pipelineRunId: ctx.runId,
    actor: Actor.SYSTEM,
    kind: "trial_completed",
    dedupeKey: `${ctx.runId}:trial_completed`,
    payload: {
      revision: ctx.revision,
      compositeScore,
      verdict,
    },
  });

  return { ...composed, compositeScore, verdict, pivotDirection };
}

// Real five-stage pipeline. FULL runs everything; RESCORE reuses stored
// evidence (human pins, rejections, and weight changes re-enter here);
// DEEP_SCAN re-gathers (cache-cheap) before rescoring. The claim contract
// and dedupe-keyed events make at-least-once delivery safe end to end.
export async function runPipeline(pipelineRunId: string) {
  const run = await prisma.pipelineRun.findUnique({
    where: { id: pipelineRunId },
    select: {
      id: true,
      revision: true,
      kind: true,
      status: true,
      trialId: true,
      trial: { select: { ideaText: true, repoUrl: true } },
    },
  });

  if (!run || run.status !== PipelineRunStatus.RUNNING) {
    return;
  }

  const ctx: RunContext = {
    runId: run.id,
    revision: run.revision,
    kind: run.kind,
    trialId: run.trialId,
  };

  if (await isSuperseded(ctx)) {
    await markSuperseded(ctx);
    return;
  }

  try {
    const idea = await stageNormalize(ctx, run.trial);

    if (run.kind !== PipelineRunKind.RESCORE) {
      await stageGatherAndClassify(ctx, idea);
    }

    await stageScoreAndCompose(ctx, idea);
  } catch (error) {
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: PipelineRunStatus.FAILED,
        completedAt: new Date(),
        errorCode: error instanceof Error ? error.message.slice(0, 120) : "unknown",
      },
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
