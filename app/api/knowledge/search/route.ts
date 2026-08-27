import { NextResponse } from "next/server";
import { z } from "zod";

import { retrieveKnowledge } from "@/lib/brain/retrieve";
import { checkRateLimit, hashIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIMENSIONS = [
  "PROBLEM_SEVERITY",
  "DEMAND_SIGNALS",
  "COMPETITION",
  "MONETIZATION",
  "DISTRIBUTION",
  "BUILD_COST",
] as const;

const querySchema = z
  .object({
    q: z.string().min(1).max(200),
    tags: z
      .array(z.enum(DIMENSIONS))
      .max(6)
      .refine((value) => new Set(value).size === value.length, {
        message: "tags must be unique",
      })
      .optional(),
    limit: z.coerce.number().int().min(1).max(10).default(6),
  })
  .strict();

const SEARCHES_PER_DAY = 60;

// Tool 12's route. Bounded public rate limit: full-text retrieval is cheap
// but the endpoint is public, so it stays capped per IP per day.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    tags: url.searchParams.getAll("tags").length
      ? url.searchParams.getAll("tags")
      : undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", detail: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const { allowed } = await checkRateLimit(hashIp(`knowledge:${ip}`), SEARCHES_PER_DAY);

  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_hint: "Try again tomorrow." },
      { status: 429 },
    );
  }

  const passages = await retrieveKnowledge(
    parsed.data.q,
    parsed.data.tags,
    parsed.data.limit,
  );

  return NextResponse.json({
    passages: passages.map((passage) => ({
      content: passage.content,
      source_doc: passage.sourceDoc,
      heading_index: passage.headingIndex,
      tags: passage.tags,
      similarity: passage.similarity,
    })),
  });
}
