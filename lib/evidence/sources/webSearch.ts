import { EvidenceSource } from "@prisma/client";

import { cachedFetch, CACHE_TTL_HOURS } from "@/lib/evidence/cache";
import { sanitizeSnippet } from "@/lib/sanitize";
import {
  MAX_ITEMS_PER_SOURCE,
  type EvidenceAdapter,
  type RawEvidence,
} from "@/lib/evidence/types";

type ExcerptItem = {
  item_type?: string;
  question_id?: number;
  title?: string | null;
  excerpt?: string | null;
  creation_date?: number;
};

type ExcerptResponse = { items?: ExcerptItem[] };

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export const webSearchAdapter: EvidenceAdapter = {
  source: EvidenceSource.WEB_SEARCH,
  async gather(idea) {
    const query = [idea.problem, ...idea.keywords.slice(0, 2)]
      .filter(Boolean)
      .join(" ");
    const cacheKey = `stackoverflow:${query}`;

    const data = await cachedFetch<ExcerptResponse>(
      "WEB_SEARCH",
      cacheKey,
      CACHE_TTL_HOURS.WEB_SEARCH,
      async () => {
        const response = await fetch(
          `https://api.stackexchange.com/2.3/search/excerpts?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=${MAX_ITEMS_PER_SOURCE * 2}`,
        );

        if (!response.ok) {
          throw new Error(`stackexchange_http_${response.status}`);
        }

        return (await response.json()) as ExcerptResponse;
      },
    );

    const items: RawEvidence[] = [];

    for (const item of data.items ?? []) {
      if (item.item_type !== "question" || !item.question_id) continue;

      const title = sanitizeSnippet(decodeEntities(item.title ?? ""), 160);
      const snippet = sanitizeSnippet(
        decodeEntities(item.excerpt || item.title || ""),
      );
      if (!title || !snippet) continue;

      items.push({
        source: EvidenceSource.WEB_SEARCH,
        url: `https://stackoverflow.com/questions/${item.question_id}`,
        title,
        snippet,
        publishedAt: item.creation_date
          ? new Date(item.creation_date * 1000).toISOString()
          : undefined,
      });

      if (items.length >= MAX_ITEMS_PER_SOURCE) break;
    }

    return items;
  },
};
