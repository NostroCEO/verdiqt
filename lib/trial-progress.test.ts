import { describe, expect, it } from "vitest";

import {
  hasWorkerProgress,
  mergeEvidenceById,
  phaseIndexFor,
  phaseStates,
  stageStates,
} from "@/lib/trial-progress";

describe("phase state machine", () => {
  it("maps statuses to phases", () => {
    expect(phaseIndexFor("QUEUED")).toBe(0);
    expect(phaseIndexFor("NORMALIZING")).toBe(0);
    expect(phaseIndexFor("GATHERING")).toBe(1);
    expect(phaseIndexFor("SCORING")).toBe(1);
    expect(phaseIndexFor("COMPLETE")).toBe(2);
  });

  it("marks earlier phases DONE once the run advances (founder rule)", () => {
    expect(phaseStates("SCORING", true)).toEqual(["done", "active", "pending"]);
    expect(phaseStates("COMPLETE", true)).toEqual(["done", "done", "active"]);
    expect(phaseStates("QUEUED", true)).toEqual(["active", "pending", "pending"]);
    expect(phaseStates(null, false)).toEqual(["active", "pending", "pending"]);
    expect(phaseStates("FAILED", true)).toEqual(["done", "failed", "pending"]);
  });

  it("stage checklist walks pending, running, done", () => {
    const during = stageStates("CLASSIFYING");
    expect(during.NORMALIZING).toBe("done");
    expect(during.GATHERING).toBe("done");
    expect(during.CLASSIFYING).toBe("running");
    expect(during.SCORING).toBe("pending");

    const complete = stageStates("COMPLETE");
    expect(Object.values(complete).every((state) => state === "done")).toBe(true);
  });
});

describe("worker progress signal", () => {
  it("counts ANY progress evidence, never SSE alone", () => {
    expect(
      hasWorkerProgress({ status: "GATHERING", evidenceCount: 0, sawStageEvent: false }),
    ).toBe(true);
    expect(
      hasWorkerProgress({ status: "QUEUED", evidenceCount: 3, sawStageEvent: false }),
    ).toBe(true);
    expect(
      hasWorkerProgress({ status: "QUEUED", evidenceCount: 0, sawStageEvent: true }),
    ).toBe(true);
    expect(
      hasWorkerProgress({ status: "QUEUED", evidenceCount: 0, sawStageEvent: false }),
    ).toBe(false);
  });
});

describe("evidence merge", () => {
  it("keeps existing item identity and appends only new ids", () => {
    const current = [{ id: "a" }, { id: "b" }];
    const merged = mergeEvidenceById(current, [{ id: "a" }, { id: "b" }, { id: "c" }]);

    expect(merged.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(merged[0]).toBe(current[0]);
  });

  it("returns the same reference when nothing changed", () => {
    const current = [{ id: "a" }];
    expect(mergeEvidenceById(current, [{ id: "a" }])).toBe(current);
  });
});
