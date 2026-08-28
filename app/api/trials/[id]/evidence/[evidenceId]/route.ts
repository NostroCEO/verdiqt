import { Actor, PipelineRunKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getOwnedTrial } from "@/lib/trials/access";
import { createRevisionedRun } from "@/lib/trials/rescore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({ humanState: z.enum(["PINNED", "REJECTED", "NEUTRAL"]) })
  .strict();

// UI-only endpoint: pin or reject one evidence item, emit the human event,
// and open a revisioned RESCORE run so the verdict reflects the human act.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; evidenceId: string }> },
) {
  const { id, evidenceId } = await context.params;

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

  const trial = await getOwnedTrial(id, { id: true });
  if (!trial) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const updated = await prisma.evidence.updateMany({
    where: { id: evidenceId, trialId: id },
    data: { humanState: parsed.data.humanState },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { pipelineRevision } = await createRevisionedRun(
    id,
    PipelineRunKind.RESCORE,
    parsed.data.humanState === "PINNED"
      ? "evidence_pinned"
      : parsed.data.humanState === "REJECTED"
        ? "evidence_rejected"
        : "evidence_reset",
    Actor.HUMAN,
    { evidenceId },
  );

  return NextResponse.json({ pipeline_revision: pipelineRevision });
}
