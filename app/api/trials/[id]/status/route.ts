import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { TrialStatus } from "@prisma/client";

import type { AnonymousCookieStore } from "@/lib/access";
import { resolveCurrentAnonymousPrincipal } from "@/lib/access";
import { prisma } from "@/lib/db";

const stageOrder: TrialStatus[] = [
  "NORMALIZING",
  "GATHERING",
  "CLASSIFYING",
  "SCORING",
  "COMPLETE",
];

function completedStages(status: TrialStatus) {
  const stageIndex = stageOrder.indexOf(status);

  if (stageIndex === -1) {
    return [];
  }

  if (status === "COMPLETE") {
    return stageOrder;
  }

  return stageOrder.slice(0, stageIndex);
}

// Agent responses are contract-bound (docs/WEBMCP_TOOLS.md): snake_case keys
// only, and event payloads are projected to known keys so nothing a worker
// writes later can leak into tool results by default.
const allowedPayloadKeys = ["revision", "dimension", "source", "stage", "count"] as const;

function projectPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const record = payload as Record<string, unknown>;
  const projected: Record<string, unknown> = {};

  for (const key of allowedPayloadKeys) {
    if (record[key] !== undefined) {
      projected[key] = record[key];
    }
  }

  return projected;
}

function payloadDimension(payload: unknown): string | null {
  const value = projectPayload(payload).dimension;
  return typeof value === "string" ? value : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const cookieStore = (await cookies()) as unknown as AnonymousCookieStore;
  const principal = await resolveCurrentAnonymousPrincipal(cookieStore);

  if (!principal) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const trial = await prisma.trial.findFirst({
    where: {
      id,
      anonymousSessionId: principal.anonymousSessionId,
    },
    select: {
      id: true,
      status: true,
      pipelineRevision: true,
      completedRevision: true,
      compositeScore: true,
      verdict: true,
      createdAt: true,
      completedAt: true,
      _count: { select: { evidence: true } },
      approvals: {
        where: { state: "PENDING_HUMAN_APPROVAL" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          kind: true,
          state: true,
          requestedRevision: true,
          payload: true,
          createdAt: true,
        },
      },
      events: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          actor: true,
          kind: true,
          payload: true,
          createdAt: true,
        },
      },
    },
  });

  if (!trial) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // A FAILED trial names its reason (our own typed error strings, safe to
  // expose): nobody should have to guess why a run died.
  let errorCode: string | null = null;
  if (trial.status === "FAILED") {
    const failedRun = await prisma.pipelineRun.findFirst({
      where: { trialId: trial.id, status: "FAILED" },
      orderBy: { revision: "desc" },
      select: { errorCode: true },
    });
    errorCode = failedRun?.errorCode ?? null;
  }

  const humanActions = await prisma.trialEvent.findMany({
    where: { trialId: trial.id, actor: "HUMAN" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 10,
    select: {
      id: true,
      kind: true,
      payload: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    run_id: trial.id,
    status: trial.status,
    pipeline_revision: trial.pipelineRevision,
    completed_revision: trial.completedRevision,
    stages_done: completedStages(trial.status),
    evidence_count: trial._count.evidence,
    composite_score: trial.compositeScore,
    verdict: trial.verdict,
    pending_approvals: trial.approvals.map((approval) => ({
      approval_id: approval.id,
      kind: approval.kind,
      state: approval.state,
      dimension: payloadDimension(approval.payload),
    })),
    latest_events: trial.events.map((event) => ({
      id: event.id,
      actor: event.actor,
      kind: event.kind,
      payload: projectPayload(event.payload),
      created_at: event.createdAt,
    })),
    human_actions: humanActions.map((event) => ({
      id: event.id,
      kind: event.kind,
      payload: projectPayload(event.payload),
      created_at: event.createdAt,
    })),
    created_at: trial.createdAt,
    completed_at: trial.completedAt,
    error_code: errorCode,
  });
}
