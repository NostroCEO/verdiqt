import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  startTrial: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@/lib/trials/start", () => ({
  startTrial: mocks.startTrial,
}));

import { POST } from "@/app/api/trials/route";

const originalPublicTrialsEnabled = process.env.PUBLIC_TRIALS_ENABLED;

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

    if (originalPublicTrialsEnabled === undefined) {
      delete process.env.PUBLIC_TRIALS_ENABLED;
      return;
    }

    process.env.PUBLIC_TRIALS_ENABLED = originalPublicTrialsEnabled;
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

  it("starts a queued trial through the shared service when the launch gate is open", async () => {
    process.env.PUBLIC_TRIALS_ENABLED = "true";
    const cookieStore = { get: vi.fn(), set: vi.fn() };
    mocks.cookies.mockResolvedValue(cookieStore);
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
