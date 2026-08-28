import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import type { AnonymousCookieStore } from "@/lib/access";
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
      const limit = Number(process.env.RATE_LIMIT_TRIALS_PER_DAY ?? "5");
      const { allowed } = await checkRateLimit(hashIp(`trials:${ip}`), limit);

      if (!allowed) {
        return NextResponse.json(
          {
            error: "rate_limited",
            retry_hint:
              "The anonymous limit resets at midnight UTC. Judges can unlock at /judge.",
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
