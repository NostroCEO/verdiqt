import { EvidenceSource } from "@prisma/client";

import { cachedFetch, CACHE_TTL_HOURS } from "@/lib/evidence/cache";
import { sanitizeSnippet } from "@/lib/sanitize";
import {
  MAX_ITEMS_PER_SOURCE,
  type EvidenceAdapter,
  type RawEvidence,
} from "@/lib/evidence/types";

type PhPost = {
  name: string;
  tagline?: string | null;
  url: string;
  votesCount?: number;
  createdAt?: string;
};

type PhResponse = {
  data?: { posts?: { edges?: Array<{ node: PhPost }> } };
};

const POSTS_QUERY = `query($first: Int!) {
  posts(first: $first, order: VOTES) {
    edges { node { name tagline url votesCount createdAt } }
  }
}`;

// Token-gated: without PRODUCT_HUNT_TOKEN the adapter returns [] and the
// pipeline emits source_disabled once per trial.
export const productHuntAdapter: EvidenceAdapter = {
  source: EvidenceSource.PRODUCT_HUNT,
  async gather(idea, { emit }) {
    const token = process.env.PRODUCT_HUNT_TOKEN;

    if (!token) {
      emit("source_disabled", {
        source: EvidenceSource.PRODUCT_HUNT,
        reason: "missing_token",
      });
      return [];
    }

    const data = await cachedFetch<PhResponse>(
      "PRODUCT_HUNT",
      `posts:${idea.category}`,
      CACHE_TTL_HOURS.PRODUCT_HUNT,
      async () => {
        const response = await fetch(
          "https://api.producthunt.com/v2/api/graphql",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              query: POSTS_QUERY,
              variables: { first: MAX_ITEMS_PER_SOURCE },
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`producthunt_http_${response.status}`);
        }

        return (await response.json()) as PhResponse;
      },
    );

    const items: RawEvidence[] = [];

    for (const edge of data.data?.posts?.edges ?? []) {
      const node = edge.node;
      const snippet = sanitizeSnippet(
        `${node.tagline ?? ""} (${node.votesCount ?? 0} votes)`,
      );

      if (!node.name || !node.url || !snippet) continue;

      items.push({
        source: EvidenceSource.PRODUCT_HUNT,
        url: node.url,
        title: sanitizeSnippet(node.name, 160),
        snippet,
        publishedAt: node.createdAt,
      });

      if (items.length >= MAX_ITEMS_PER_SOURCE) break;
    }

    return items;
  },
};
