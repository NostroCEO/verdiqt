import { EvidenceSource } from "@prisma/client";

import { cachedFetch, CACHE_TTL_HOURS } from "@/lib/evidence/cache";
import { sanitizeSnippet } from "@/lib/sanitize";
import {
  MAX_ITEMS_PER_SOURCE,
  type EvidenceAdapter,
  type NormalizedIdea,
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

const TOPIC_QUERY = `query($first: Int!, $topic: String!) {
  posts(first: $first, topic: $topic, order: VOTES) {
    edges { node { name tagline url votesCount createdAt } }
  }
}`;

function topicSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function candidateSlugs(idea: NormalizedIdea): string[] {
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const raw of [idea.category, ...idea.keywords]) {
    const slug = topicSlug(raw);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  }
  return slugs.slice(0, 4);
}

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

    const slugs = candidateSlugs(idea);
    const cacheKey = `topics:${slugs.join(",")}`;

    async function phQuery(variables: Record<string, unknown>) {
      const response = await fetch("https://api.producthunt.com/v2/api/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: TOPIC_QUERY, variables }),
      });

      if (!response.ok) {
        throw new Error(`producthunt_http_${response.status}`);
      }

      return (await response.json()) as PhResponse;
    }

    const merged = await cachedFetch<PhPost[]>(
      "PRODUCT_HUNT",
      cacheKey,
      CACHE_TTL_HOURS.PRODUCT_HUNT,
      async () => {
        const seenUrls = new Set<string>();
        const posts: PhPost[] = [];

        for (const slug of slugs) {
          if (posts.length >= MAX_ITEMS_PER_SOURCE) break;
          try {
            const result = await phQuery({ first: 8, topic: slug });
            for (const edge of result.data?.posts?.edges ?? []) {
              if (seenUrls.has(edge.node.url)) continue;
              seenUrls.add(edge.node.url);
              posts.push(edge.node);
            }
          } catch {
            // A single slug failing is fine; others may succeed.
          }
        }

        return posts;
      },
    );

    const items: RawEvidence[] = [];

    for (const node of merged) {
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
