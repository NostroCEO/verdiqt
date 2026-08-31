import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  structuredCall: vi.fn(),
}));

vi.mock("@/lib/llm", () => ({
  structuredCall: mocks.structuredCall,
}));

import { scoreDimension, type ScorableEvidence } from "@/lib/verdict/score";
import { classifyEvidence, CLASSIFY_BATCH_SIZE } from "@/lib/verdict/classify";
import type { NormalizedIdea, RawEvidence } from "@/lib/evidence/types";

const idea: NormalizedIdea = {
  oneLiner: "AI changelog writer",
  audience: "indie founders",
  problem: "changelogs rot",
  category: "devtools",
  keywords: ["changelog"],
};

function evidenceItem(id: string, humanState: ScorableEvidence["humanState"] = "NEUTRAL"): ScorableEvidence {
  return {
    id,
    humanState,
    source: "HACKERNEWS",
    url: `https://example.dev/${id}`,
    title: `title ${id}`,
    snippet: `snippet ${id}`,
    dimension: "MONETIZATION",
    strength: 3,
  };
}

describe("scoreDimension", () => {
  afterEach(() => {
    mocks.structuredCall.mockReset();
  });

  it("prompts with the dimension definition, pinned flag, and knowledge, excluding rejected items", async () => {
    mocks.structuredCall.mockResolvedValue({
      score: 62,
      rationale: "Paying users exist [ev:e1] and [ev:e2].",
      evidenceIds: ["e1", "e2"],
    });

    const result = await scoreDimension(
      idea,
      "MONETIZATION",
      [evidenceItem("e1", "PINNED"), evidenceItem("e2"), evidenceItem("e3", "REJECTED")],
      [{ content: "value equation passage", sourceDoc: "offer-value-equation.md", headingIndex: 0, tags: ["MONETIZATION"], similarity: 0.5 }],
    );

    expect(result.score).toBe(62);
    const call = mocks.structuredCall.mock.calls[0][0];
    expect(call.user).toContain("dream outcome");
    expect(call.user).toContain('trusted="human-pinned"');
    expect(call.user).toContain("value equation passage");
    expect(call.user).not.toContain("e3");
  });

  it("caps at 45 with fewer than 2 usable items and appends the insufficiency note", async () => {
    mocks.structuredCall.mockResolvedValue({
      score: 80,
      rationale: "Looks great [ev:e1].",
      evidenceIds: ["e1"],
    });

    const result = await scoreDimension(idea, "MONETIZATION", [evidenceItem("e1")], []);

    expect(result.score).toBe(45);
    expect(result.rationale).toContain("insufficient");
  });

  it("floors at 40 with fewer than 2 usable items - thin evidence is unproven, not negative", async () => {
    mocks.structuredCall.mockResolvedValue({
      score: 20,
      rationale: "No concrete signal found.",
      evidenceIds: [],
    });

    const result = await scoreDimension(idea, "DISTRIBUTION", [evidenceItem("e1")], []);

    expect(result.score).toBe(40);
    expect(result.rationale).toContain("unproven");
  });

  it("passes a score already inside the 40-45 uncertainty band through unchanged", async () => {
    mocks.structuredCall.mockResolvedValue({
      score: 42,
      rationale: "Thin but plausible [ev:e1].",
      evidenceIds: ["e1"],
    });

    const result = await scoreDimension(idea, "DISTRIBUTION", [evidenceItem("e1")], []);

    expect(result.score).toBe(42);
    expect(result.rationale).not.toContain("unproven");
  });

  it("retries once on ghost citations, then sanitizes instead of failing", async () => {
    mocks.structuredCall
      .mockResolvedValueOnce({ score: 70, rationale: "cites ghost [ev:zz]", evidenceIds: ["zz"] })
      .mockResolvedValueOnce({ score: 66, rationale: "fixed [ev:e1] [ev:e2]", evidenceIds: ["e1", "e2"] });

    const result = await scoreDimension(idea, "MONETIZATION", [evidenceItem("e1"), evidenceItem("e2")], []);

    expect(result.score).toBe(66);
    expect(mocks.structuredCall).toHaveBeenCalledTimes(2);

    // A persistent ghost citation never kills the trial: the unknown id is
    // stripped everywhere and the under-cited high score is capped at 40 in
    // code (anti-fabrication holds; a typo is not a capital offense).
    mocks.structuredCall.mockReset();
    mocks.structuredCall.mockResolvedValue({ score: 70, rationale: "[ev:zz] again", evidenceIds: ["zz"] });

    const sanitized = await scoreDimension(
      idea,
      "MONETIZATION",
      [evidenceItem("e1"), evidenceItem("e2")],
      [],
    );
    expect(sanitized.score).toBe(40);
    expect(sanitized.evidenceIds).toEqual([]);
    expect(sanitized.rationale).not.toContain("[ev:zz]");
    expect(sanitized.rationale).toContain("Score capped");
  });

  it("requires 2 citations for scores above 40 when 2+ items exist", async () => {
    mocks.structuredCall
      .mockResolvedValueOnce({ score: 70, rationale: "only one [ev:e1]", evidenceIds: ["e1"] })
      .mockResolvedValueOnce({ score: 70, rationale: "[ev:e1] [ev:e2]", evidenceIds: ["e1", "e2"] });

    const result = await scoreDimension(idea, "MONETIZATION", [evidenceItem("e1"), evidenceItem("e2")], []);
    expect(result.evidenceIds).toHaveLength(2);
  });
});

describe("classifyEvidence", () => {
  afterEach(() => {
    mocks.structuredCall.mockReset();
  });

  function rawItems(count: number): RawEvidence[] {
    return Array.from({ length: count }, (_, i) => ({
      source: "HACKERNEWS" as const,
      url: `https://example.dev/${i}`,
      title: `t${i}`,
      snippet: `s${i}`,
    }));
  }

  it("batches at 25 and preserves order within successful batches", async () => {
    mocks.structuredCall.mockImplementation(async ({ user }: { user: string }) => ({
      classifications: [...user.matchAll(/<evidence id="(\d+)"/g)].map((m) => ({
        index: Number(m[1]),
        dimension: "DEMAND_SIGNALS",
        strength: 3,
      })),
    }));
    const emit = vi.fn();

    const result = await classifyEvidence(idea, rawItems(30), emit);

    expect(mocks.structuredCall).toHaveBeenCalledTimes(2);
    expect(result.items).toHaveLength(30);
    expect(result.items[0].title).toBe("t0");
    expect(result.items[29].title).toBe("t29");
    expect(result.failedBatches).toBe(0);
    expect(CLASSIFY_BATCH_SIZE).toBe(25);
  });

  it("one failed batch reduces coverage and emits; all failing throws", async () => {
    mocks.structuredCall
      .mockRejectedValueOnce(new Error("boom"))
      .mockImplementationOnce(async () => ({
        classifications: [{ index: 0, dimension: "COMPETITION", strength: 2 }],
      }));
    const emit = vi.fn();

    const partial = await classifyEvidence(idea, rawItems(26), emit);
    expect(partial.failedBatches).toBe(1);
    expect(partial.items.length).toBeGreaterThan(0);
    expect(emit).toHaveBeenCalledWith(
      "source_failed",
      expect.objectContaining({ reason: expect.stringContaining("classification_batch_failed") }),
    );

    mocks.structuredCall.mockReset();
    mocks.structuredCall.mockRejectedValue(new Error("boom"));

    await expect(classifyEvidence(idea, rawItems(5), vi.fn())).rejects.toThrow(
      "classification_all_batches_failed",
    );
  });
});
