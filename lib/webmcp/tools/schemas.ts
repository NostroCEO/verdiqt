export const dimensionValues = [
  "PROBLEM_SEVERITY",
  "DEMAND_SIGNALS",
  "COMPETITION",
  "MONETIZATION",
  "DISTRIBUTION",
  "BUILD_COST",
] as const;

export const evidenceSourceValues = [
  "WEB_SEARCH",
  "REDDIT",
  "HACKERNEWS",
  "PRODUCT_HUNT",
  "GITHUB",
] as const;

export const dimensionSchema = {
  type: "string",
  enum: dimensionValues,
} as const;

export const evidenceSourceSchema = {
  type: "string",
  enum: evidenceSourceValues,
} as const;

export const runIdSchema = {
  type: "string",
} as const;
