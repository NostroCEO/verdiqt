import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import type { AnonymousCookieStore } from "@/lib/access";
import { resolveCurrentAnonymousPrincipal } from "@/lib/access";
import { prisma } from "@/lib/db";
import { isValidJudgeCookie, JUDGE_COOKIE } from "@/lib/judge";
import { checkRateLimit, hashIp } from "@/lib/ratelimit";
import { startTrial } from "@/lib/trials/start";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startTrialSchema = z
  .object({
    ideaText: z.string().trim().min(1).max(2000).optional(),
    repoUrl: z.string().url().optional(),
  })
  .strict()
  .superRefine((input, context) => {
    const suppliedInputs =
      Number(typeof input.ideaText === "string") +
      Number(typeof input.repoUrl === "string");

    if (suppliedInputs !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of ideaText or repoUrl.",
        path: [],
      });
    }
  });

function validationIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "_root",
    message: issue.message,
  }));
}

// The session's case archive (eng review R3): strictly scoped to the
// caller's anonymous session. No principal means an empty list, never an
// error, because a list has no enumeration surface to protect.
export async function GET() {
  const cookieStore = (await cookies()) as unknown as AnonymousCookieStore;
  const principal = await resolveCurrentAnonymousPrincipal(cookieStore);

  if (!principal) {
    return NextResponse.json({ trials: [] });
  }

  const trials = await prisma.trial.findMany({
    where: { anonymousSessionId: principal.anonymousSessionId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      ideaText: true,
      repoUrl: true,
      status: true,
      verdict: true,
      compositeScore: true,
      createdAt: true,
      normalizedIdea: { select: { oneLiner: true } },
    },
  });

  return NextResponse.json({
    trials: trials.map((trial) => ({
      run_id: trial.id,
      case_label:
        trial.normalizedIdea?.oneLiner ??
        trial.ideaText?.slice(0, 64) ??
        trial.repoUrl ??
        "Untitled case",
      status: trial.status,
      verdict: trial.verdict,
      composite_score: trial.compositeScore,
      created_at: trial.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", hint: "Send a JSON body." },
      { status: 400 },
    );
  }

  const parsed = startTrialSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: validationIssues(parsed.error) },
      { status: 400 },
    );
  }

  if (process.env.PUBLIC_TRIALS_ENABLED !== "true") {
    return NextResponse.json({ error: "launch_gated" }, { status: 503 });
  }

  try {
    const cookieStore = (await cookies()) as unknown as AnonymousCookieStore;

    // The judge cookie bypasses ONLY the anonymous creation limit; it grants
    // no ownership, no approvals, nothing else.
    const judge = isValidJudgeCookie(cookieStore.get(JUDGE_COOKIE)?.value);
    if (!judge) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
      const limit = Number(process.env.RATE_LIMIT_TRIALS_PER_DAY ?? "15");
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
    const trial = await startTrial({ ...parsed.data, cookieStore });

    return NextResponse.json(trial, { status: 202 });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Unable to start trial.", error);
    }

    return NextResponse.json(
      {
        error: "trial_start_failed",
        hint: "The validation queue could not accept this trial.",
      },
      { status: 503 },
    );
  }
}
