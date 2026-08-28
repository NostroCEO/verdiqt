import { NextResponse } from "next/server";

import { getOwnedTrial } from "@/lib/trials/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tool #8: the single recommended next validation action.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const trial = await getOwnedTrial(id, {
    id: true,
    status: true,
    nextStep: true,
  });

  if (!trial) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (trial.status !== "COMPLETE" || !trial.nextStep) {
    return NextResponse.json(
      { error: "not_complete", status: trial.status },
      { status: 409 },
    );
  }

  return NextResponse.json({ next_step: trial.nextStep });
}
