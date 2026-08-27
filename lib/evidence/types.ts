import type { EvidenceSource } from "@prisma/client";

// Produced by Task 7 normalization, consumed by every adapter and scorer.
export type NormalizedIdea = {
  oneLiner: string;
  audience: string;
  problem: string;
  category: string;
  keywords: string[];
};

export type RawEvidence = {
  source: EvidenceSource;
  url: string;
  title: string;
  snippet: string;
  publishedAt?: string;
};

// Central event sink so adapters never write TrialEvents themselves; the
// pipeline owns persistence and dedupe keys.
export type EvidenceEmitter = (
  kind: "source_disabled" | "source_failed",
  payload: { source: string; reason?: string },
) => void;

export type EvidenceAdapter = {
  source: EvidenceSource;
  gather: (
    idea: NormalizedIdea,
    ctx: { emit: EvidenceEmitter },
  ) => Promise<RawEvidence[]>;
};

export const MAX_ITEMS_PER_SOURCE = 12;
