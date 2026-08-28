import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { currentPrincipal } from "@/lib/trials/access";
import { DIMENSIONS } from "@/lib/verdict/weights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    runIds: z.array(z.string()).min(2).max(5).refine(
      (value) => new Set(value).size === value.length,
      { message: "run_ids must be unique" },
    ),
  })
  .strict();

// Tool #7: side-by-side comparison of completed, owner-accessible trials.
// Any unknown, foreign, or incomplete id fails the whole request with the
// same 404 so nothing about other sessions' trials can be probed.
export async function POST(request: Request) {
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

  const principal = await currentPrincipal();
  if (!principal) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const trials = await prisma.trial.findMany({
    where: {
      id: { in: parsed.data.runIds },
      anonymousSessionId: principal.anonymousSessionId,
      status: "COMPLETE",
    },
    select: {
      id: true,
      compositeScore: true,
      verdict: true,
      normalizedIdea: { select: { oneLiner: true } },
      scores: { select: { dimension: true, score: true } },
    },
  });

  if (trials.length !== parsed.data.runIds.length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const byId = new Map(trials.map((trial) => [trial.id, trial]));
  const ordered = parsed.data.runIds.map((id) => byId.get(id)!);

  const strongest: Record<string, string> = {};
  for (const dimension of DIMENSIONS) {
    let best = ordered[0];
    for (const trial of ordered) {
      const score = trial.scores.find((s) => s.dimension === dimension)?.score ?? 0;
      const bestScore = best.scores.find((s) => s.dimension === dimension)?.score ?? 0;
      if (score > bestScore) best = trial;
    }
    strongest[dimension] = best.id;
  }

  return NextResponse.json({
    trials: ordered.map((trial) => ({
      run_id: trial.id,
      one_liner: trial.normalizedIdea?.oneLiner ?? "",
      composite_score: trial.compositeScore,
      verdict: trial.verdict,
      dimensions: Object.fromEntries(
        trial.scores.map((score) => [score.dimension, score.score]),
      ),
    })),
    strongest_per_dimension: strongest,
  });
}
