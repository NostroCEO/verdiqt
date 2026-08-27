import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  createQueue: vi.fn(),
  send: vi.fn(),
}));

vi.mock("pg-boss", () => ({
  default: class MockPgBoss {
    start = mocks.start;
    createQueue = mocks.createQueue;
    send = mocks.send;
  },
}));

type BossGlobals = typeof globalThis & {
  verdiqtBoss?: unknown;
  verdiqtBossStart?: unknown;
};

function resetBossGlobals() {
  const globals = globalThis as BossGlobals;
  delete globals.verdiqtBoss;
  delete globals.verdiqtBossStart;
}

import { enqueueTrial, getStartedBoss, RUN_TRIAL_QUEUE } from "@/lib/queue";

describe("trial queue", () => {
  beforeEach(() => {
    resetBossGlobals();
    vi.stubEnv("DIRECT_DATABASE_URL", "postgres://direct.test/db");
    mocks.start.mockResolvedValue(undefined);
    mocks.createQueue.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetBossGlobals();
    mocks.start.mockReset();
    mocks.createQueue.mockReset();
    mocks.send.mockReset();
    vi.unstubAllEnvs();
  });

  it("starts pg-boss once and ensures the run-trial queue exists", async () => {
    await getStartedBoss();
    await getStartedBoss();

    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.createQueue).toHaveBeenCalledTimes(1);
    expect(mocks.createQueue).toHaveBeenCalledWith(RUN_TRIAL_QUEUE);
  });

  it("sends the job with the deterministic singleton key", async () => {
    mocks.send.mockResolvedValue("job_1");

    const result = await enqueueTrial({
      pipelineRunId: "run_1",
      jobKey: "trial:t1:revision:1",
    });

    expect(result).toEqual({ jobId: "job_1", deduped: false });
    expect(mocks.send).toHaveBeenCalledWith(
      RUN_TRIAL_QUEUE,
      { pipelineRunId: "run_1" },
      expect.objectContaining({
        singletonKey: "trial:t1:revision:1",
        retryLimit: 3,
        retryBackoff: true,
        expireInMinutes: 30,
        retentionDays: 7,
      }),
    );
  });

  it("reports a singleton conflict as an explicit dedupe, not a silent drop", async () => {
    mocks.send.mockResolvedValue(null);

    const result = await enqueueTrial({
      pipelineRunId: "run_1",
      jobKey: "trial:t1:revision:1",
    });

    expect(result).toEqual({ jobId: null, deduped: true });
  });

  it("recovers after a failed cold start instead of staying poisoned", async () => {
    mocks.start.mockRejectedValueOnce(new Error("db down"));

    await expect(getStartedBoss()).rejects.toThrow("db down");

    mocks.start.mockResolvedValue(undefined);
    await expect(getStartedBoss()).resolves.toBeDefined();
    expect(mocks.start).toHaveBeenCalledTimes(2);
  });
});
