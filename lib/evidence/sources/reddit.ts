import { EvidenceSource } from "@prisma/client";

import type { EvidenceAdapter } from "@/lib/evidence/types";

// DISABLED by standing decision (docs/STATE.md): the Reddit Data API requires
// registered OAuth credentials, an accurate client identity, and a
// founder-approved retention policy. Anonymous JSON endpoints are never used.
// This stays a typed no-op until every one of those exists.
export const redditAdapter: EvidenceAdapter = {
  source: EvidenceSource.REDDIT,
  async gather(_idea, { emit }) {
    emit("source_disabled", {
      source: EvidenceSource.REDDIT,
      reason: "credentials_and_retention_gate",
    });
    return [];
  },
};
