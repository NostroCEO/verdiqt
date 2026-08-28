import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { microCached } from "@/lib/micro-cache";
import { getOwnedTrial } from "@/lib/trials/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const filterSchema = z
  .object({
    dimension: z
      .enum(["PROBLEM_SEVERITY", "DEMAND_SIGNALS", "COMPETITION", "MONETIZATION", "DISTRIBUTION", "BUILD_COST"])
      .optional(),
    source: z
      .enum(["WEB_SEARCH", "REDDIT", "HACKERNEWS", "PRODUCT_HUNT", "GITHUB"])
      .optional(),
  })
  .strict();

// Tool #3: list evidence with the human's pin or reject state per item.
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const parsed = filterSchema.safeParse({
    dimension: url.searchParams.get("dimension") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const trial = await getOwnedTrial(id, { id: true });
  if (!trial) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Polled every 2.5s during research; evidence arrives in bursts seconds
  // apart, so 2s of staleness is invisible while the burst refetches dedupe.
  const rows = await microCached(
    `evidence:${id}:${parsed.data.dimension ?? ""}:${parsed.data.source ?? ""}`,
    2000,
    () =>
      prisma.evidence.findMany({
        where: {
          trialId: id,
          ...(parsed.data.dimension ? { dimension: parsed.data.dimension } : {}),
          ...(parsed.data.source ? { source: parsed.data.source } : {}),
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 200,
      }),
  );

  return NextResponse.json({
    evidence: rows.map((row) => ({
      id: row.id,
      source: row.source,
      url: row.url,
      title: row.title,
      snippet: row.snippet,
      dimension: row.dimension,
      strength: row.strength,
      human_state: row.humanState,
    })),
  });
}
