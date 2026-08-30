import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  startTrial: vi.fn(),
  checkRateLimit: vi.fn(),
  isValidJudgeCookie: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@/lib/trials/start", () => ({
  startTrial: mocks.startTrial,
}));

vi.mock("@/lib/ratelimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ratelimit")>();
  return { ...actual, checkRateLimit: mocks.checkRateLimit };
});

vi.mock("@/lib/judge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/judge")>();
  return { ...actual, isValidJudgeCookie: mocks.isValidJudgeCookie };
});

import { POST } from "@/app/api/trials/route";

const originalPublicTrialsEnabled = process.env.PUBLIC_TRIALS_ENABLED;
const originalGlobalLimit = process.env.RATE_LIMIT_TRIALS_GLOBAL_PER_DAY;

function restoreEnv(key: string, original: string | undefined) {
  if (original === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = original;
}

function trialRequest(body: unknown) {
  return new Request("http://localhost/api/trials", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/trials", () => {
  afterEach(() => {
    mocks.cookies.mockReset();
    mocks.startTrial.mockReset();
    mocks.checkRateLimit.mockReset();
    mocks.isValidJudgeCookie.mockReset();

    restoreEnv("PUBLIC_TRIALS_ENABLED", originalPublicTrialsEnabled);
    restoreEnv("RATE_LIMIT_TRIALS_GLOBAL_PER_DAY", originalGlobalLimit);
  });

  it("rejects invalid JSON before any launch-gated work can run", async () => {
    const response = await POST(
      new Request("http://localhost/api/trials", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_json",
      hint: "Send a JSON body.",
    });
  });

  it("requires exactly one trial input", async () => {
    const response = await POST(
      trialRequest({
        ideaText: "A changelog writer for indie SaaS teams",
        repoUrl: "https://github.com/openai/openai-node",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_input",
      issues: [
        {
          path: "_root",
          message: "Provide exactly one of ideaText or repoUrl.",
        },
      ],
    });
  });

  it("keeps public trial creation closed until the privacy launch gate opens", async () => {
    process.env.PUBLIC_TRIALS_ENABLED = "false";

    const response = await POST(
      trialRequest({
        repoUrl: "https://github.com/openai/openai-node",
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "launch_gated" });
    expect(mocks.startTrial).not.toHaveBeenCalled();
  });

  it("rate limits anonymous creation and lets the judge cookie bypass only that", async () => {
    process.env.PUBLIC_TRIALS_ENABLED = "true";
    mocks.cookies.mockResolvedValue({ get: vi.fn(), set: vi.fn() });
    mocks.isValidJudgeCookie.mockReturnValue(false);
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, count: 6 });

    const limited = await POST(trialRequest({ ideaText: "an idea" }));
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ error: "rate_limited" });
    expect(mocks.startTrial).not.toHaveBeenCalled();

    mocks.isValidJudgeCookie.mockReturnValue(true);
    mocks.startTrial.mockResolvedValue({
      run_id: "t1",
      status: "QUEUED",
      dashboard_url: "/trial/t1",
    });

    const judged = await POST(trialRequest({ ideaText: "an idea" }));
    expect(judged.status).toBe(202);
    expect(mocks.checkRateLimit).toHaveBeenCalledTimes(1);
  });

  it("enforces the global daily ceiling after the per-IP limit and lets judges bypass it", async () => {
    process.env.PUBLIC_TRIALS_ENABLED = "true";
    process.env.RATE_LIMIT_TRIALS_GLOBAL_PER_DAY = "25";
    mocks.cookies.mockResolvedValue({ get: vi.fn(), set: vi.fn() });
    mocks.isValidJudgeCookie.mockReturnValue(false);
    // Per-IP passes, then the shared global ceiling rejects.
    mocks.checkRateLimit
      .mockResolvedValueOnce({ allowed: true, count: 3 })
      .mockResolvedValueOnce({ allowed: false, count: 26 });

    const limited = await POST(trialRequest({ ideaText: "an idea" }));
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ error: "rate_limited" });
    expect(mocks.checkRateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.startTrial).not.toHaveBeenCalled();

    // The judge cookie bypasses both the per-IP limit and the global ceiling.
    mocks.checkRateLimit.mockClear();
    mocks.isValidJudgeCookie.mockReturnValue(true);
    mocks.startTrial.mockResolvedValue({
      run_id: "t2",
      status: "QUEUED",
      dashboard_url: "/trial/t2",
    });

    const judged = await POST(trialRequest({ ideaText: "an idea" }));
    expect(judged.status).toBe(202);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it("starts a queued trial through the shared service when the launch gate is open", async () => {
    process.env.PUBLIC_TRIALS_ENABLED = "true";
    const cookieStore = { get: vi.fn(), set: vi.fn() };
    mocks.cookies.mockResolvedValue(cookieStore);
    mocks.isValidJudgeCookie.mockReturnValue(false);
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, count: 1 });
    mocks.startTrial.mockResolvedValue({
      run_id: "trial_123",
      status: "QUEUED",
      dashboard_url: "/trial/trial_123",
    });

    const response = await POST(
      trialRequest({
        ideaText: "A changelog writer for indie SaaS teams",
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      run_id: "trial_123",
      status: "QUEUED",
      dashboard_url: "/trial/trial_123",
    });
    expect(mocks.startTrial).toHaveBeenCalledWith({
      ideaText: "A changelog writer for indie SaaS teams",
      cookieStore,
    });
  });

  it("returns a typed error if the queue cannot accept the trial", async () => {
    process.env.PUBLIC_TRIALS_ENABLED = "true";
    mocks.cookies.mockResolvedValue({ get: vi.fn(), set: vi.fn() });
    mocks.startTrial.mockRejectedValue(new Error("queue unavailable"));

    const response = await POST(
      trialRequest({
        repoUrl: "https://github.com/openai/openai-node",
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "trial_start_failed",
      hint: "The validation queue could not accept this trial.",
    });
  });
});
