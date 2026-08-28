import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pipelineRun: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  trial: { findUnique: vi.fn(), update: vi.fn() },
  normalizedIdea: { findUnique: vi.fn(), upsert: vi.fn() },
  evidence: { findMany: vi.fn(), upsert: vi.fn() },
  dimensionScore: { upsert: vi.fn() },
  emitEvent: vi.fn(),
  normalizeIdea: vi.fn(),
  gatherAll: vi.fn(),
  classifyEvidence: vi.fn(),
  scoreDimension: vi.fn(),
  retrieveKnowledge: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    pipelineRun: mocks.pipelineRun,
    trial: mocks.trial,
    normalizedIdea: mocks.normalizedIdea,
    evidence: mocks.evidence,
    dimensionScore: mocks.dimensionScore,
  },
}));
vi.mock("@/lib/events", () => ({ emitEvent: mocks.emitEvent }));
vi.mock("@/lib/verdict/normalize", () => ({ normalizeIdea: mocks.normalizeIdea }));
vi.mock("@/lib/evidence/gather", () => ({ gatherAll: mocks.gatherAll }));
vi.mock("@/lib/verdict/classify", () => ({ classifyEvidence: mocks.classifyEvidence }));
vi.mock("@/lib/verdict/score", () => ({ scoreDimension: mocks.scoreDimension }));
vi.mock("@/lib/brain/retrieve", () => ({ retrieveKnowledge: mocks.retrieveKnowledge }));

import { claimRun, runPipeline } from "@/worker/pipeline";

const idea = {
  oneLiner: "x",
  audience: "y",
  problem: "z",
  category: "devtools",
  keywords: ["k"],
};

function primeHappyPath({ revision = 1, kind = "FULL" } = {}) {
  mocks.pipelineRun.findUnique.mockResolvedValue({
    id: "run_1",
    revision,
    kind,
    status: "RUNNING",
    trialId: "trial_1",
    trial: { ideaText: "an idea", repoUrl: null },
  });
  mocks.trial.findUnique.mockImplementation(async (args: { select?: Record<string, boolean> }) =>
    args.select?.pipelineRevision
      ? { pipelineRevision: revision }
      : { weights: { PROBLEM_SEVERITY: 20, DEMAND_SIGNALS: 20, COMPETITION: 15, MONETIZATION: 20, DISTRIBUTION: 15, BUILD_COST: 10 } },
  );
  mocks.trial.update.mockResolvedValue({});
  mocks.normalizedIdea.findUnique.mockResolvedValue(null);
  mocks.normalizedIdea.upsert.mockResolvedValue({});
  mocks.normalizeIdea.mockResolvedValue(idea);
  mocks.gatherAll.mockResolvedValue([
    { source: "HACKERNEWS", url: "https://x/1", title: "t", snippet: "s" },
  ]);
  mocks.classifyEvidence.mockResolvedValue({
    items: [
      { source: "HACKERNEWS", url: "https://x/1", title: "t", snippet: "s", dimension: "DEMAND_SIGNALS", strength: 4 },
    ],
    failedBatches: 0,
  });
  mocks.evidence.upsert.mockResolvedValue({});
  mocks.evidence.findMany.mockResolvedValue([
    { id: "e1", humanState: "NEUTRAL", source: "HACKERNEWS", url: "https://x/1", title: "t", snippet: "s", dimension: "DEMAND_SIGNALS", strength: 4, createdAt: new Date() },
  ]);
  mocks.retrieveKnowledge.mockResolvedValue([]);
  mocks.scoreDimension.mockResolvedValue({ score: 72, rationale: "r [ev:e1]", evidenceIds: ["e1"] });
  mocks.dimensionScore.upsert.mockResolvedValue({});
  mocks.pipelineRun.update.mockResolvedValue({});
  mocks.emitEvent.mockResolvedValue({});
}

function resetAll() {
  for (const group of Object.values(mocks)) {
    if (typeof group === "function") {
      (group as ReturnType<typeof vi.fn>).mockReset();
    } else {
      for (const fn of Object.values(group)) {
        (fn as ReturnType<typeof vi.fn>).mockReset();
      }
    }
  }
}

describe("claimRun", () => {
  afterEach(resetAll);

  it("claims exactly one QUEUED run", async () => {
    mocks.pipelineRun.updateMany.mockResolvedValue({ count: 1 });
    await expect(claimRun("run_1")).resolves.toBe(true);
    mocks.pipelineRun.updateMany.mockResolvedValue({ count: 0 });
    await expect(claimRun("run_1")).resolves.toBe(false);
  });
});

describe("runPipeline (real stages)", () => {
  afterEach(resetAll);

  it("FULL walks normalize, gather, classify, score all six, compose, complete", async () => {
    primeHappyPath();

    await runPipeline("run_1");

    expect(mocks.normalizeIdea).toHaveBeenCalledTimes(1);
    expect(mocks.gatherAll).toHaveBeenCalledTimes(1);
    expect(mocks.classifyEvidence).toHaveBeenCalledTimes(1);
    expect(mocks.scoreDimension).toHaveBeenCalledTimes(6);
    expect(mocks.evidence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          trialId_fingerprint: expect.objectContaining({ trialId: "trial_1" }),
        }),
      }),
    );

    const terminalWrite = mocks.trial.update.mock.calls.at(-1)?.[0];
    expect(terminalWrite.data).toMatchObject({
      status: "COMPLETE",
      compositeScore: 72,
      verdict: "BUILD",
      completedRevision: 1,
    });
    expect(terminalWrite.data.nextStep).toMatchObject({ id: "ship_it" });
    expect(mocks.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "trial_completed", dedupeKey: "run_1:trial_completed" }),
    );
  });

  it("RESCORE skips gathering and classification, reusing stored evidence", async () => {
    primeHappyPath({ kind: "RESCORE" });

    await runPipeline("run_1");

    expect(mocks.gatherAll).not.toHaveBeenCalled();
    expect(mocks.classifyEvidence).not.toHaveBeenCalled();
    expect(mocks.scoreDimension).toHaveBeenCalledTimes(6);
  });

  it("a superseded revision marks itself SUPERSEDED and never writes the trial", async () => {
    primeHappyPath();
    mocks.trial.findUnique.mockImplementation(async (args: { select?: Record<string, boolean> }) =>
      args.select?.pipelineRevision ? { pipelineRevision: 2 } : { weights: null },
    );

    await runPipeline("run_1");

    expect(mocks.pipelineRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SUPERSEDED" }) }),
    );
    expect(mocks.trial.update).not.toHaveBeenCalled();
  });

  it("a stage failure marks run and trial FAILED with the error code and rethrows", async () => {
    primeHappyPath();
    mocks.normalizeIdea.mockRejectedValue(new Error("llm_schema_violation:NormalizedIdea"));

    await expect(runPipeline("run_1")).rejects.toThrow("llm_schema_violation");

    expect(mocks.pipelineRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorCode: expect.stringContaining("llm_schema_violation"),
        }),
      }),
    );
    expect(mocks.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "trial_failed" }),
    );
  });
});
