import { EvidenceSource } from "@prisma/client";

import { cachedFetch, CACHE_TTL_HOURS } from "@/lib/evidence/cache";
import { sanitizeSnippet } from "@/lib/sanitize";
import {
  MAX_ITEMS_PER_SOURCE,
  type EvidenceAdapter,
  type RawEvidence,
} from "@/lib/evidence/types";

type RedditChild = {
  data?: {
    id?: string;
    title?: string | null;
    selftext?: string | null;
    permalink?: string | null;
    subreddit?: string | null;
    created_utc?: number;
  };
};

type RedditListing = { data?: { children?: RedditChild[] } };

// ENABLED by founder decision (2026-08-28, supersedes the earlier gate):
// live at-trial-time research through Reddit's public JSON search with an
// honest client identity, nothing stored beyond the 12h ApiCache row. Reddit
// throttles some cloud IPs; a refusal becomes a visible source_failed event
// and the trial continues on the other sources.
export const redditAdapter: EvidenceAdapter = {
  source: EvidenceSource.REDDIT,
  async gather(idea) {
    const query = [idea.category, ...idea.keywords.slice(0, 3)]
      .filter(Boolean)
      .join(" ");

    const data = await cachedFetch<RedditListing>(
      "REDDIT",
      `search:${query}`,
      CACHE_TTL_HOURS.REDDIT,
      async () => {
        const response = await fetch(
          `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=year&limit=${MAX_ITEMS_PER_SOURCE * 2}&raw_json=1`,
          {
            headers: {
              "User-Agent":
                "web:verdiqt:1.0 (SaaS validation research; github.com/NostroCEO/verdiqt)",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`reddit_http_${response.status}`);
        }

        return (await response.json()) as RedditListing;
      },
    );

    const items: RawEvidence[] = [];

    for (const child of data.data?.children ?? []) {
      const post = child.data;
      if (!post?.permalink) continue;

      const title = sanitizeSnippet(post.title ?? "", 160);
      const snippet = sanitizeSnippet(post.selftext || post.title || "");
      if (!title || !snippet) continue;

      items.push({
        source: EvidenceSource.REDDIT,
        url: `https://www.reddit.com${post.permalink}`,
        title,
        snippet,
        publishedAt: post.created_utc
          ? new Date(post.created_utc * 1000).toISOString()
          : undefined,
      });

      if (items.length >= MAX_ITEMS_PER_SOURCE) break;
    }

    return items;
  },
};
