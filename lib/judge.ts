import { createHmac, timingSafeEqual } from "node:crypto";

export const JUDGE_COOKIE = "verdiqt_judge";
const JUDGE_TTL_DAYS = 30;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is required for judge access");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

// Constant-time comparison of the submitted code; the raw code is accepted
// ONLY from the /judge page form body, never from URLs, headers, or tools.
export function isValidJudgeCode(submitted: string) {
  const expected = process.env.JUDGE_ACCESS_CODE;
  if (!expected || !submitted) return false;

  const a = createHmac("sha256", secret()).update(submitted).digest();
  const b = createHmac("sha256", secret()).update(expected).digest();
  return timingSafeEqual(a, b);
}

// The cookie value carries only an expiry and its signature: no code, no
// identity, no authority beyond bypassing the anonymous creation limit.
export function mintJudgeCookieValue(now = new Date()) {
  const expires = now.getTime() + JUDGE_TTL_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}

export function isValidJudgeCookie(value: string | undefined, now = new Date()) {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return false;
  }

  return Number(payload) > now.getTime();
}
