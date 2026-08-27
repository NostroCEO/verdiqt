import type { Dimension, VerdictKind } from "@prisma/client";

import { DIMENSIONS } from "@/lib/verdict/weights";

export type DimensionScores = Record<Dimension, number>;

export type NextStep = {
  id: string;
  action: string;
  why: string;
  how: string;
  effort_hours: number;
};

// The catalog from docs/VALIDATION_FRAMEWORK.md, verbatim in substance:
// exactly ONE step, the cheapest test that would most change the verdict
// if it failed.
export const NEXT_STEP_CATALOG: Record<string, Omit<NextStep, "why">> = {
  fake_door: {
    id: "fake_door",
    action: "Landing page with a waitlist and one clear promise; buy or post 100 visits",
    how: "Write one promise headline, one signup field, drive 100 targeted visits, measure signup rate.",
    effort_hours: 4,
  },
  forum_interviews: {
    id: "forum_interviews",
    action: "5 problem interviews recruited from the named community where pain evidence was found",
    how: "Ask about past behavior only: last time it hurt, what they tried, what it cost them.",
    effort_hours: 6,
  },
  pricing_probe: {
    id: "pricing_probe",
    action: "Show 3 price points to 20 target users, measure reaction",
    how: "Present low, mid, and anchor prices; record which one makes them hesitate rather than laugh or shrug.",
    effort_hours: 3,
  },
  competitor_teardown: {
    id: "competitor_teardown",
    action: "Deep teardown of the top 2 competitors' reviews for gaps",
    how: "Read the one and two star reviews; cluster complaints; the recurring unfixed complaint is the wedge.",
    effort_hours: 3,
  },
  channel_test: {
    id: "channel_test",
    action: "One week posting useful content in the target channel, measure pull",
    how: "Publish daily in the named channel; count replies, follows, and inbound questions, not likes.",
    effort_hours: 8,
  },
  wedge_cut: {
    id: "wedge_cut",
    action: "Cut scope to the single wedge feature and re-validate",
    how: "Name the one feature the strongest evidence supports; re-run the trial on that wedge alone.",
    effort_hours: 2,
  },
  ship_it: {
    id: "ship_it",
    action: "Evidence is strong across the board; build the MVP with a 2-week timebox",
    how: "Write the kill criteria first, timebox two weeks, ship the wedge to the channel where the evidence lives.",
    effort_hours: 0,
  },
};

const PIVOT_TEMPLATES: Record<Dimension, string> = {
  PROBLEM_SEVERITY:
    "keep the wedge, chase the sharper pain: the severity evidence points at a heavier problem next door",
  DEMAND_SIGNALS:
    "keep the problem, follow the demand: the search and launch evidence points at where people already look",
  COMPETITION:
    "keep the audience, take the open wedge: the competitor evidence shows a gap incumbents keep ignoring",
  MONETIZATION:
    "keep the audience, change who pays: the willingness-to-pay evidence points to a buyer with a budget",
  DISTRIBUTION:
    "keep the product, move to the reachable channel: the channel evidence shows where this builder can actually win",
  BUILD_COST:
    "keep the promise, cut to the wedge: the effort evidence says the smallest version earns the same proof",
};

function strongest(scores: DimensionScores): Dimension {
  return DIMENSIONS.reduce((best, dimension) =>
    scores[dimension] > scores[best] ? dimension : best,
  );
}

// Weighted deficit: the dimension whose weakness moves the composite most.
// This operationalizes "the cheapest test that would most change the verdict
// if it failed". Ties resolve in enum order via the stable reduce.
function weakestByWeightedDeficit(
  scores: DimensionScores,
  weights: DimensionScores,
): Dimension {
  return DIMENSIONS.reduce((worst, dimension) => {
    const deficit = (100 - scores[dimension]) * weights[dimension];
    const worstDeficit = (100 - scores[worst]) * weights[worst];
    return deficit > worstDeficit ? dimension : worst;
  });
}

export function selectNextStep(
  scores: DimensionScores,
  weights: DimensionScores,
  verdict: VerdictKind,
): NextStep {
  const minScore = Math.min(...DIMENSIONS.map((d) => scores[d]));

  if (verdict === "BUILD" && minScore >= 60) {
    return { ...NEXT_STEP_CATALOG.ship_it, why: "Evidence is strong across the board with no dimension under 60." };
  }

  const weakest = weakestByWeightedDeficit(scores, weights);

  if (weakest === "MONETIZATION" && scores.PROBLEM_SEVERITY < 50) {
    // Pricing probes only make sense once pain is confirmed.
    return {
      ...NEXT_STEP_CATALOG.forum_interviews,
      why: "Monetization is uncertain but the pain itself is unconfirmed; confirm severity before pricing.",
    };
  }

  const byDimension: Record<Dimension, keyof typeof NEXT_STEP_CATALOG> = {
    DEMAND_SIGNALS: "fake_door",
    PROBLEM_SEVERITY: "forum_interviews",
    MONETIZATION: "pricing_probe",
    COMPETITION: "competitor_teardown",
    DISTRIBUTION: "channel_test",
    BUILD_COST: "wedge_cut",
  };

  const step = NEXT_STEP_CATALOG[byDimension[weakest]];
  return {
    ...step,
    why: `${weakest} is the weakest weighted dimension; if this test fails, the verdict changes.`,
  };
}

export function composeVerdict(
  scores: DimensionScores,
  weights: DimensionScores,
): {
  compositeScore: number;
  verdict: VerdictKind;
  pivotDirection: string | null;
  nextStep: NextStep;
} {
  const compositeScore = Math.round(
    DIMENSIONS.reduce(
      (sum, dimension) => sum + scores[dimension] * weights[dimension],
      0,
    ) / 100,
  );

  const verdict: VerdictKind =
    compositeScore >= 70 ? "BUILD" : compositeScore >= 40 ? "PIVOT" : "KILL";

  const pivotDirection =
    verdict === "PIVOT" ? PIVOT_TEMPLATES[strongest(scores)] : null;

  return {
    compositeScore,
    verdict,
    pivotDirection,
    nextStep: selectNextStep(scores, weights, verdict),
  };
}
