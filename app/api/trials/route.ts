import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import type { AnonymousCookieStore } from "@/lib/access";
import { startTrial } from "@/lib/trials/start";

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
