import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveAnonymousPrincipal: vi.fn(),
  enqueueTrial: vi.fn(),
  transaction: vi.fn(),
  tx: {
    trial: { create: vi.fn() },
    pipelineRun: { create: vi.fn() },
    trialEvent: { create: vi.fn() },
  },
}));

vi.mock("@/lib/access", () => ({
  resolveAnonymousPrincipal: mocks.resolveAnonymousPrincipal,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/queue", () => ({
  enqueueTrial: mocks.enqueueTrial,
}));

import { DEFAULT_TRIAL_WEIGHTS, startTrial } from "@/lib/trials/start";

describe("startTrial", () => {
  afterEach(() => {
    mocks.resolveAnonymousPrincipal.mockReset();
    mocks.enqueueTrial.mockReset();
    mocks.transaction.mockReset();
    mocks.tx.trial.create.mockReset();
    mocks.tx.pipelineRun.create.mockReset();
    mocks.tx.trialEvent.create.mockReset();
  });

  it("creates a revision-one trial, records an event, and enqueues one job", async () => {
    const cookieStore = { get: vi.fn(), set: vi.fn() };
    mocks.resolveAnonymousPrincipal.mockResolvedValue({
      kind: "anonymous",
      anonymousSessionId: "anon_123",
    });
    mocks.transaction.mockImplementation((callback) => callback(mocks.tx));
    mocks.tx.trial.create.mockResolvedValue({
      id: "trial_123",
      status: "QUEUED",
    });
    mocks.tx.pipelineRun.create.mockResolvedValue({
      id: "pipeline_123",
      jobKey: "trial:trial_123:revision:1",
    });
    mocks.tx.trialEvent.create.mockResolvedValue({ id: "event_123" });
    mocks.enqueueTrial.mockResolvedValue({ jobId: "job_123" });

    const result = await startTrial({
      ideaText: "A changelog writer for indie SaaS teams",
      cookieStore,
    });

    expect(result).toEqual({
      run_id: "trial_123",
      status: "QUEUED",
      dashboard_url: "/trial/trial_123",
    });
    expect(mocks.tx.trial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          anonymousSessionId: "anon_123",
          ideaText: "A changelog writer for indie SaaS teams",
          status: "QUEUED",
          weights: DEFAULT_TRIAL_WEIGHTS,
          pipelineRevision: 1,
          completedRevision: 0,
        }),
      }),
    );
    expect(mocks.tx.pipelineRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          trialId: "trial_123",
          revision: 1,
          kind: "FULL",
          jobKey: "trial:trial_123:revision:1",
        },
        select: { id: true, jobKey: true },
      }),
    );
    expect(mocks.tx.trialEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trialId: "trial_123",
          pipelineRunId: "pipeline_123",
          actor: "SYSTEM",
          kind: "trial_queued",
          dedupeKey: "pipeline_123:trial_queued",
          payload: { revision: 1 },
        }),
      }),
    );
    expect(mocks.enqueueTrial).toHaveBeenCalledWith({
      pipelineRunId: "pipeline_123",
      jobKey: "trial:trial_123:revision:1",
    });
  });

  it("rejects ambiguous direct service calls", async () => {
    const cookieStore = { get: vi.fn(), set: vi.fn() };

    await expect(
      startTrial({
        ideaText: "One",
        repoUrl: "https://github.com/openai/openai-node",
        cookieStore,
      }),
    ).rejects.toThrow("start_trial_requires_exactly_one_input");
  });
});
