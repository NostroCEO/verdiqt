import { githubAdapter } from "@/lib/evidence/sources/github";
import { hackernewsAdapter } from "@/lib/evidence/sources/hackernews";
import { productHuntAdapter } from "@/lib/evidence/sources/producthunt";
import { redditAdapter } from "@/lib/evidence/sources/reddit";
import { webSearchAdapter } from "@/lib/evidence/sources/webSearch";
import type {
  EvidenceEmitter,
  NormalizedIdea,
  RawEvidence,
} from "@/lib/evidence/types";

export const evidenceAdapters = [
  hackernewsAdapter,
  githubAdapter,
  productHuntAdapter,
  webSearchAdapter,
  redditAdapter,
];

// Below this many items, the first pass is considered too thin and the
// broadened second pass runs (founder directive 2026-08-31: evidence must
// never come back empty when a wider search would have found something).
const BROADEN_FLOOR = 8;

const BROADEN_STOPWORDS = new Set([
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "their",
  "tool",
  "tools",
  "app",
  "apps",
  "platform",
  "software",
  "service",
  "services",
  "online",
  "based",
  "using",
]);

// The LLM-derived keywords are often multi-word phrases too specific for the
// public search APIs ("AI changelog automation indie SaaS" matches nothing on
// HN). Broadening splits them into their strongest single words so every
// source gets a query it can actually match. Deterministic — no model call.
function broadenedIdea(idea: NormalizedIdea): NormalizedIdea | null {
  const words = [idea.category, ...idea.keywords]
    .flatMap((keyword) => keyword.split(/[^a-z0-9]+/i))
    .map((word) => word.toLowerCase())
    .filter((word) => word.length >= 4 && !BROADEN_STOPWORDS.has(word));

  const unique = [...new Set(words)].slice(0, 4);
  if (unique.length === 0) return null;

  const unchanged =
    unique.length === idea.keywords.length &&
    unique.every((word, index) => idea.keywords[index]?.toLowerCase() === word);
  return unchanged ? null : { ...idea, keywords: unique };
}

async function runAdapters(
  idea: NormalizedIdea,
  emit: EvidenceEmitter,
): Promise<RawEvidence[]> {
  const settled = await Promise.allSettled(
    evidenceAdapters.map((adapter) => adapter.gather(idea, { emit })),
  );

  const items: RawEvidence[] = [];

  settled.forEach((result, index) => {
    const source = evidenceAdapters[index].source;
    if (result.status === "fulfilled") {
      items.push(...result.value);
      emit("source_gathered", { source, count: result.value.length });
    } else {
      emit("source_failed", {
        source,
        reason:
          result.reason instanceof Error ? result.reason.message : "unknown",
      });
    }
  });

  return items;
}

// One rejecting adapter never fails the trial: failures become source_failed
// events and the survivors' items still flow. Never throws. A thin first
// pass triggers one broadened re-query across every source; results merge
// deduped by (source, url), so the court widens its search before ever
// returning near-empty evidence. (Second-pass events share dedupe keys with
// the first pass and collapse harmlessly.)
export async function gatherAll(
  idea: NormalizedIdea,
  emit: EvidenceEmitter,
): Promise<RawEvidence[]> {
  const items = await runAdapters(idea, emit);
  if (items.length >= BROADEN_FLOOR) return items;

  const broader = broadenedIdea(idea);
  if (!broader) return items;

  const seen = new Set(items.map((item) => `${item.source}:${item.url}`));
  const second = await runAdapters(broader, emit);
  for (const item of second) {
    const key = `${item.source}:${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  return items;
}
