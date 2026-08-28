import { Actor, PipelineRunKind } from "@prisma/client";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getOwnedTrial } from "@/lib/trials/access";
import { createRevisionedRun } from "@/lib/trials/rescore";
import { validateWeights } from "@/lib/verdict/weights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// UI-only endpoint: replace the six weights (validated to sum 100) and open
// a revisioned RESCORE run so the composite recomputes from stored evidence.
export async function PUT(
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

  const weights = (json as { weights?: unknown })?.weights;
  if (!validateWeights(weights)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const trial = await getOwnedTrial(id, { id: true });
  if (!trial) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.trial.update({
    where: { id },
    data: { weights: weights as Prisma.InputJsonObject },
  });

  const { pipelineRevision } = await createRevisionedRun(
    id,
    PipelineRunKind.RESCORE,
    "weights_changed",
    Actor.HUMAN,
    { weights },
  );

  return NextResponse.json({ pipeline_revision: pipelineRevision });
}
