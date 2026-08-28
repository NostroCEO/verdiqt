import { EvidenceSource } from "@prisma/client";

import { cachedFetch, CACHE_TTL_HOURS } from "@/lib/evidence/cache";
import { sanitizeSnippet } from "@/lib/sanitize";
import {
  MAX_ITEMS_PER_SOURCE,
  type EvidenceAdapter,
  type RawEvidence,
} from "@/lib/evidence/types";

type RepoSearchItem = {
  full_name: string;
  html_url: string;
  description?: string | null;
  stargazers_count?: number;
  pushed_at?: string;
};

type RepoSearchResponse = { items: RepoSearchItem[] };

export const githubAdapter: EvidenceAdapter = {
  source: EvidenceSource.GITHUB,
  async gather(idea) {
    const query = idea.oneLiner;
    const cacheKey = `repo-search:${query}`;

    const data = await cachedFetch<RepoSearchResponse>(
      "GITHUB",
      cacheKey,
      CACHE_TTL_HOURS.GITHUB,
      async () => {
        const token = process.env.GITHUB_TOKEN;
        const response = await fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=${MAX_ITEMS_PER_SOURCE}`,
          {
            headers: {
              accept: "application/vnd.github+json",
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        if (!response.ok) {
          throw new Error(`github_http_${response.status}`);
        }

        return (await response.json()) as RepoSearchResponse;
      },
    );

    const items: RawEvidence[] = [];

    for (const repo of data.items ?? []) {
      const snippet = sanitizeSnippet(
        `${repo.description ?? ""} (${repo.stargazers_count ?? 0} stars)`,
      );

      if (!repo.full_name || !snippet) continue;

      items.push({
        source: EvidenceSource.GITHUB,
        url: repo.html_url,
        title: sanitizeSnippet(repo.full_name, 160),
        snippet,
        publishedAt: repo.pushed_at,
      });

      if (items.length >= MAX_ITEMS_PER_SOURCE) break;
    }

    return items;
  },
};
