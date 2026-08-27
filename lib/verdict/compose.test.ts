import { describe, expect, it } from "vitest";

import { composeVerdict, selectNextStep } from "@/lib/verdict/compose";
import { DEFAULT_WEIGHTS, validateWeights } from "@/lib/verdict/weights";

type Scores = Parameters<typeof composeVerdict>[0];

function scores(overrides: Partial<Scores> = {}): Scores {
  return {
    PROBLEM_SEVERITY: 70,
    DEMAND_SIGNALS: 70,
    COMPETITION: 70,
    MONETIZATION: 70,
    DISTRIBUTION: 70,
    BUILD_COST: 70,
    ...overrides,
  };
}

describe("validateWeights", () => {
  it("accepts the defaults and rejects bad shapes", () => {
    expect(validateWeights(DEFAULT_WEIGHTS)).toBe(true);
    expect(validateWeights({ ...DEFAULT_WEIGHTS, BUILD_COST: 11 })).toBe(false);
    expect(validateWeights({ ...DEFAULT_WEIGHTS, BUILD_COST: -10, MONETIZATION: 40 })).toBe(false);
    expect(validateWeights({ PROBLEM_SEVERITY: 100 })).toBe(false);
    expect(validateWeights(null)).toBe(false);
  });
});

describe("composeVerdict", () => {
  it("computes the weighted composite and thresholds at exactly 70, 40, and 39", () => {
    expect(composeVerdict(scores(), DEFAULT_WEIGHTS)).toMatchObject({
      compositeScore: 70,
      verdict: "BUILD",
      pivotDirection: null,
    });

    const atForty = composeVerdict(
      scores({
        PROBLEM_SEVERITY: 40, DEMAND_SIGNALS: 40, COMPETITION: 40,
        MONETIZATION: 40, DISTRIBUTION: 40, BUILD_COST: 40,
      }),
      DEFAULT_WEIGHTS,
    );
    expect(atForty).toMatchObject({ compositeScore: 40, verdict: "PIVOT" });
    expect(atForty.pivotDirection).toBeTruthy();

    expect(
      composeVerdict(
        scores({
          PROBLEM_SEVERITY: 39, DEMAND_SIGNALS: 39, COMPETITION: 39,
          MONETIZATION: 39, DISTRIBUTION: 39, BUILD_COST: 39,
        }),
        DEFAULT_WEIGHTS,
      ),
    ).toMatchObject({ compositeScore: 39, verdict: "KILL", pivotDirection: null });
  });

  it("derives the pivot direction from the strongest dimension", () => {
    const result = composeVerdict(
      scores({ DISTRIBUTION: 90, PROBLEM_SEVERITY: 30, DEMAND_SIGNALS: 45, MONETIZATION: 45, COMPETITION: 45, BUILD_COST: 45 }),
      DEFAULT_WEIGHTS,
    );
    expect(result.verdict).toBe("PIVOT");
    expect(result.pivotDirection).toContain("channel");
  });
});

describe("selectNextStep", () => {
  it("ships it only for BUILD with no dimension under 60", () => {
    expect(selectNextStep(scores({ BUILD_COST: 60 }), DEFAULT_WEIGHTS, "BUILD").id).toBe("ship_it");
    expect(selectNextStep(scores({ BUILD_COST: 59 }), DEFAULT_WEIGHTS, "BUILD").id).not.toBe("ship_it");
  });

  it("maps each weakest weighted dimension to its catalog row", () => {
    const table: Array<[Partial<Scores>, string]> = [
      [{ DEMAND_SIGNALS: 20 }, "fake_door"],
      [{ PROBLEM_SEVERITY: 20 }, "forum_interviews"],
      [{ MONETIZATION: 20 }, "pricing_probe"],
      [{ COMPETITION: 10 }, "competitor_teardown"],
      [{ DISTRIBUTION: 10 }, "channel_test"],
      [{ BUILD_COST: 5 }, "wedge_cut"],
    ];

    for (const [override, expected] of table) {
      expect(selectNextStep(scores(override), DEFAULT_WEIGHTS, "PIVOT").id, expected).toBe(expected);
    }
  });

  it("confirms pain before pricing when monetization is weakest but severity unconfirmed", () => {
    const result = selectNextStep(
      scores({ MONETIZATION: 20, PROBLEM_SEVERITY: 45 }),
      DEFAULT_WEIGHTS,
      "PIVOT",
    );
    expect(result.id).toBe("forum_interviews");
  });

  it("always returns exactly one step with effort hours", () => {
    const step = selectNextStep(scores({ COMPETITION: 5 }), DEFAULT_WEIGHTS, "KILL");
    expect(step.effort_hours).toBe(3);
    expect(step.why.length).toBeGreaterThan(10);
  });
});
