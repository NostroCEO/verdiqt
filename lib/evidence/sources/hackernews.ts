import { EvidenceSource } from "@prisma/client";

import { cachedFetch, CACHE_TTL_HOURS } from "@/lib/evidence/cache";
import { sanitizeSnippet } from "@/lib/sanitize";
import {
  MAX_ITEMS_PER_SOURCE,
  type EvidenceAdapter,
  type RawEvidence,
} from "@/lib/evidence/types";

type AlgoliaHit = {
  objectID: string;
  title?: string | null;
  story_title?: string | null;
  url?: string | null;
  story_url?: string | null;
  story_text?: string | null;
  comment_text?: string | null;
  created_at?: string;
};

type AlgoliaResponse = { hits: AlgoliaHit[] };

function hitTitle(hit: AlgoliaHit) {
  return hit.title || hit.story_title || "";
}

function hitUrl(hit: AlgoliaHit) {
  return (
    hit.url ||
    hit.story_url ||
    `https://news.ycombinator.com/item?id=${hit.objectID}`
  );
}

async function searchHN(query: string, perPage: number): Promise<AlgoliaResponse> {
  const response = await fetch(
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=(story,comment)&hitsPerPage=${perPage}`,
  );

  if (!response.ok) {
    throw new Error(`hackernews_http_${response.status}`);
  }

  return (await response.json()) as AlgoliaResponse;
}

export const hackernewsAdapter: EvidenceAdapter = {
  source: EvidenceSource.HACKERNEWS,
  async gather(idea) {
    const primaryQuery = idea.oneLiner;
    const secondaryQuery = [idea.problem, idea.audience].filter(Boolean).join(" ");
    const cacheKey = `search:${primaryQuery}|${secondaryQuery}`;

    const data = await cachedFetch<AlgoliaResponse>(
      "HACKERNEWS",
      cacheKey,
      CACHE_TTL_HOURS.HACKERNEWS,
      async () => {
        const [primary, secondary] = await Promise.all([
          searchHN(primaryQuery, MAX_ITEMS_PER_SOURCE),
          searchHN(secondaryQuery, 8).catch(() => ({ hits: [] as AlgoliaHit[] })),
        ]);

        const seenIds = new Set<string>();
        const merged: AlgoliaHit[] = [];
        for (const hit of [...primary.hits, ...secondary.hits]) {
          if (seenIds.has(hit.objectID)) continue;
          seenIds.add(hit.objectID);
          merged.push(hit);
        }

        return { hits: merged };
      },
    );

    const items: RawEvidence[] = [];

    for (const hit of data.hits ?? []) {
      const title = sanitizeSnippet(hitTitle(hit), 160);
      const snippet = sanitizeSnippet(
        hit.comment_text || hit.story_text || hitTitle(hit),
      );

      if (!title || !snippet) continue;

      items.push({
        source: EvidenceSource.HACKERNEWS,
        url: hitUrl(hit),
        title,
        snippet,
        publishedAt: hit.created_at,
      });

      if (items.length >= MAX_ITEMS_PER_SOURCE) break;
    }

    return items;
  },
};
