import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pipelineRun: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  trial: { update: vi.fn() },
  emitEvent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    pipelineRun: mocks.pipelineRun,
    trial: mocks.trial,
  },
}));

vi.mock("@/lib/events", () => ({
  emitEvent: mocks.emitEvent,
}));

import { claimRun, runPipeline } from "@/worker/pipeline";

describe("claimRun", () => {
  afterEach(() => {
    mocks.pipelineRun.updateMany.mockReset();
  });

  it("claims exactly one QUEUED run and sets the lease", async () => {
    mocks.pipelineRun.updateMany.mockResolvedValue({ count: 1 });

    await expect(claimRun("run_1")).resolves.toBe(true);
    expect(mocks.pipelineRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run_1", status: "QUEUED" },
        data: expect.objectContaining({
          status: "RUNNING",
          startedAt: expect.any(Date),
          leaseExpiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it("reports duplicate deliveries as unclaimed", async () => {
    mocks.pipelineRun.updateMany.mockResolvedValue({ count: 0 });

    await expect(claimRun("run_1")).resolves.toBe(false);
  });
});

describe("runPipeline stub", () => {
  afterEach(() => {
    mocks.pipelineRun.findUnique.mockReset();
    mocks.pipelineRun.update.mockReset();
    mocks.trial.update.mockReset();
    mocks.emitEvent.mockReset();
  });

  it("exits safely for unknown or non-running runs", async () => {
    mocks.pipelineRun.findUnique.mockResolvedValue(null);
    await runPipeline("missing", { stageDelayMs: 0 });

    mocks.pipelineRun.findUnique.mockResolvedValue({
      id: "run_1",
      revision: 1,
      status: "COMPLETE",
      trialId: "trial_1",
    });
    await runPipeline("run_1", { stageDelayMs: 0 });

    expect(mocks.trial.update).not.toHaveBeenCalled();
    expect(mocks.emitEvent).not.toHaveBeenCalled();
  });

  it("walks NORMALIZING to COMPLETE with dedupe-keyed events", async () => {
    mocks.pipelineRun.findUnique.mockResolvedValue({
      id: "run_1",
      revision: 1,
      status: "RUNNING",
      trialId: "trial_1",
    });
    mocks.trial.update.mockResolvedValue({});
    mocks.pipelineRun.update.mockResolvedValue({});
    mocks.emitEvent.mockResolvedValue({});

    await runPipeline("run_1", { stageDelayMs: 0 });

    expect(mocks.trial.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: { status: "NORMALIZING" } }),
    );
    expect(mocks.trial.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETE",
          compositeScore: 50,
          completedRevision: 1,
        }),
      }),
    );
    expect(mocks.pipelineRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETE" }),
      }),
    );
    expect(mocks.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeKey: "run_1:stage:NORMALIZING" }),
    );
    expect(mocks.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeKey: "run_1:trial_completed" }),
    );
  });

  it("marks the run and trial failed and rethrows on stage errors", async () => {
    mocks.pipelineRun.findUnique.mockResolvedValue({
      id: "run_1",
      revision: 1,
      status: "RUNNING",
      trialId: "trial_1",
    });
    mocks.trial.update
      .mockRejectedValueOnce(new Error("db write failed"))
      .mockResolvedValue({});
    mocks.pipelineRun.update.mockResolvedValue({});
    mocks.emitEvent.mockResolvedValue({});

    await expect(runPipeline("run_1", { stageDelayMs: 0 })).rejects.toThrow(
      "db write failed",
    );

    expect(mocks.pipelineRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
    expect(mocks.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeKey: "run_1:trial_failed" }),
    );
  });
});
