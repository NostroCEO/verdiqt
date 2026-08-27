import { EvidenceSource } from "@prisma/client";

import type { EvidenceAdapter } from "@/lib/evidence/types";

// CUT by the zero-budget decision (docs/STATE.md 2026-08-27, founder D20):
// the paid web-search tool is not used. The adapter stays as a truthful
// typed no-op so the pipeline reports the reduced coverage instead of
// silently narrowing it.
export const webSearchAdapter: EvidenceAdapter = {
  source: EvidenceSource.WEB_SEARCH,
  async gather(_idea, { emit }) {
    emit("source_disabled", {
      source: EvidenceSource.WEB_SEARCH,
      reason: "zero_budget_decision",
    });
    return [];
  },
};
