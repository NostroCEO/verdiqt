import { Actor, PipelineRunKind, TrialStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { isValidJudgeCookie, JUDGE_COOKIE } from "@/lib/judge";
import { enqueueTrial } from "@/lib/queue";
import { checkRateLimit, hashIp } from "@/lib/ratelimit";
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

  // A refine spawns a full pipeline run, so it MUST share the same daily
  // quota as POST /api/trials (security audit 2026-08-28): otherwise an
  // agent that owns one trial could refine in a loop and burn the shared
  // free inference budget. The judge cookie bypasses only this ceiling.
  const cookieStore = await cookies();
  const judge = isValidJudgeCookie(cookieStore.get(JUDGE_COOKIE)?.value);
  if (!judge) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "local";
    const limit = Number(process.env.RATE_LIMIT_TRIALS_PER_DAY ?? "100");
    if (limit > 0) {
      const { allowed } = await checkRateLimit(hashIp(`trials:${ip}`), limit);
      if (!allowed) {
        return NextResponse.json(
          {
            error: "rate_limited",
            retry_hint: "The daily limit resets at midnight UTC.",
          },
          { status: 429 },
        );
      }
    }
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
