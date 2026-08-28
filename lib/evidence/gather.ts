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

// One rejecting adapter never fails the trial: failures become source_failed
// events and the survivors' items still flow. Never throws.
export async function gatherAll(
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
