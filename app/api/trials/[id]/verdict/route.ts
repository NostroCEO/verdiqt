import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getOwnedTrial } from "@/lib/trials/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tool #5: the full scored verdict; 409 not_complete while running.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const trial = await getOwnedTrial(id, {
    id: true,
    status: true,
    compositeScore: true,
    verdict: true,
    pivotDirection: true,
    weights: true,
    nextStep: true,
  });

  if (!trial) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (trial.status !== "COMPLETE") {
    return NextResponse.json(
      { error: "not_complete", status: trial.status },
      { status: 409 },
    );
  }

  const scores = await prisma.dimensionScore.findMany({
    where: { trialId: id },
    orderBy: { dimension: "asc" },
  });

  return NextResponse.json({
    run_id: trial.id,
    composite_score: trial.compositeScore,
    verdict: trial.verdict,
    pivot_direction: trial.pivotDirection,
    weights: trial.weights,
    dimensions: scores.map((score) => ({
      dimension: score.dimension,
      score: score.score,
      rationale: score.rationale,
      evidence_ids: score.evidenceIds,
    })),
    next_step: trial.nextStep,
  });
}
