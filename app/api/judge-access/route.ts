import { NextResponse } from "next/server";

import { isValidJudgeCode, JUDGE_COOKIE, mintJudgeCookieValue } from "@/lib/judge";
import { checkRateLimit, hashIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXCHANGE_ATTEMPTS_PER_DAY = 10;

// Exchanges the judge code (form-only, never a URL) for the signed cookie.
// Failed exchanges are rate limited so the code cannot be brute forced.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const code = form?.get("code");

  // Last XFF entry = appended by the trusted proxy; the first is
  // client-supplied and spoofable (same rule as the trials route), so a
  // brute-forcer cannot rotate fake headers past the attempt limit.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "local";
  const { allowed } = await checkRateLimit(
    hashIp(`judge:${ip}`),
    EXCHANGE_ATTEMPTS_PER_DAY,
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_hint: "Try again tomorrow." },
      { status: 429 },
    );
  }

  if (typeof code !== "string" || !isValidJudgeCode(code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  // Relative Location, resolved by the browser against the PUBLIC origin.
  // Building an absolute URL from request.url broke behind Render's proxy:
  // the internal origin is localhost:10000, and judges were redirected there
  // (founder bug report 2026-08-31).
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/trial" },
  });
  response.cookies.set(JUDGE_COOKIE, mintJudgeCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
