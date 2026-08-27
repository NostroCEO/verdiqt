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

// Public Algolia HN search API: no key, free, cached 24h per query.
export const hackernewsAdapter: EvidenceAdapter = {
  source: EvidenceSource.HACKERNEWS,
  async gather(idea) {
    const query = [idea.category, ...idea.keywords.slice(0, 3)]
      .filter(Boolean)
      .join(" ");

    const data = await cachedFetch<AlgoliaResponse>(
      "HACKERNEWS",
      `search:${query}`,
      CACHE_TTL_HOURS.HACKERNEWS,
      async () => {
        const response = await fetch(
          `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=(story,comment)&hitsPerPage=${MAX_ITEMS_PER_SOURCE * 2}`,
        );

        if (!response.ok) {
          throw new Error(`hackernews_http_${response.status}`);
        }

        return (await response.json()) as AlgoliaResponse;
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
