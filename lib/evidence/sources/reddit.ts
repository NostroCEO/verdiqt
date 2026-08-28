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

const USER_AGENT =
  "web:verdiqt:1.0 (SaaS validation research; github.com/NostroCEO/verdiqt)";

// Reddit blocks anonymous requests from cloud IPs, but authenticated OAuth
// (free registered app, client_credentials grant) is served normally. The
// bearer token lives ~24h; cache it in-process and refresh early.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function redditBearerToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`reddit_oauth_${response.status}`);
  }

  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!body.access_token) {
    throw new Error("reddit_oauth_no_token");
  }

  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return body.access_token;
}

// ENABLED by founder decision (2026-08-28, supersedes the earlier gate):
// live at-trial-time research through Reddit's public JSON search with an
// honest client identity, nothing stored beyond the 12h ApiCache row. Reddit
// throttles some cloud IPs; a refusal becomes a visible source_failed event
// and the trial continues on the other sources.
export const redditAdapter: EvidenceAdapter = {
  source: EvidenceSource.REDDIT,
  async gather(idea, { emit }) {
    // Founder decision 2026-08-28, after reading Reddit's Responsible
    // Builder Policy: Reddit is BYPASSED unless approved credentials are
    // provided. No anonymous access, ever — with no credentials the source
    // reports itself off and the trial proceeds on the other platforms.
    const bearer = await redditBearerToken().catch(() => null);
    if (!bearer) {
      emit("source_disabled", {
        source: EvidenceSource.REDDIT,
        reason: "responsible_builder_policy",
      });
      return [];
    }

    const query = [idea.category, ...idea.keywords.slice(0, 3)]
      .filter(Boolean)
      .join(" ");

    const data = await cachedFetch<RedditListing>(
      "REDDIT",
      `search:${query}`,
      CACHE_TTL_HOURS.REDDIT,
      async () => {
        const params = `q=${encodeURIComponent(query)}&sort=relevance&t=year&limit=${MAX_ITEMS_PER_SOURCE * 2}&raw_json=1`;
        const response = await fetch(`https://oauth.reddit.com/search?${params}`, {
          headers: {
            "User-Agent": USER_AGENT,
            authorization: `Bearer ${bearer}`,
          },
        });

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
