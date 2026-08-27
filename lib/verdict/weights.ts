import type { Dimension } from "@prisma/client";

// Canonical default weights (docs/VALIDATION_FRAMEWORK.md). Human-adjusted
// weights must satisfy validateWeights before any re-score.
export const DEFAULT_WEIGHTS: Record<Dimension, number> = {
  PROBLEM_SEVERITY: 20,
  DEMAND_SIGNALS: 20,
  COMPETITION: 15,
  MONETIZATION: 20,
  DISTRIBUTION: 15,
  BUILD_COST: 10,
};

export const DIMENSIONS = Object.keys(DEFAULT_WEIGHTS) as Dimension[];

export function validateWeights(weights: unknown): weights is Record<Dimension, number> {
  if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
    return false;
  }

  const record = weights as Record<string, unknown>;
  const keys = Object.keys(record);

  if (keys.length !== DIMENSIONS.length) return false;

  let sum = 0;
  for (const dimension of DIMENSIONS) {
    const value = record[dimension];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return false;
    }
    sum += value;
  }

  return sum === 100;
}
