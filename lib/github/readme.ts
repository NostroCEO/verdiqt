import { cachedFetch, CACHE_TTL_HOURS } from "@/lib/evidence/cache";
import { sanitizeSnippet } from "@/lib/sanitize";

export type RepoBrief = {
  name: string;
  description: string;
  readmeExcerpt: string;
  language: string;
  topics: string[];
  stars: number;
};

const README_MAX_CHARS = 4000;

export function parseRepoUrl(input: string): { owner: string; name: string } | null {
  const bare = /^([^/\s]+)\/([^/\s]+)$/.exec(input.trim());
  if (bare) {
    return { owner: bare[1], name: bare[2] };
  }

  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
      return null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) return null;
    return { owner: parts[0], name: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

async function githubJson<T>(path: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`github_http_${response.status}`);
  }

  return (await response.json()) as T;
}

// Public repository brief for normalization: metadata plus a sanitized,
// truncated README excerpt. Repo text is untrusted content and always
// passes sanitization before any prompt sees it.
export async function fetchRepoBrief(repoUrl: string): Promise<RepoBrief> {
  const repo = parseRepoUrl(repoUrl);

  if (!repo) {
    throw new Error("invalid_repo_url");
  }

  const slug = `${repo.owner}/${repo.name}`;

  return cachedFetch<RepoBrief>(
    "GITHUB_METADATA",
    `brief:${slug}`,
    CACHE_TTL_HOURS.GITHUB_METADATA,
    async () => {
      const meta = await githubJson<{
        full_name: string;
        description?: string | null;
        language?: string | null;
        topics?: string[];
        stargazers_count?: number;
      }>(`/repos/${slug}`);

      let readmeExcerpt = "";
      try {
        const readme = await githubJson<{ content?: string; encoding?: string }>(
          `/repos/${slug}/readme`,
        );
        if (readme.content && readme.encoding === "base64") {
          readmeExcerpt = sanitizeSnippet(
            Buffer.from(readme.content, "base64").toString("utf8"),
            README_MAX_CHARS,
          );
        }
      } catch {
        // Missing README is fine; the description still carries signal.
      }

      return {
        name: meta.full_name,
        description: sanitizeSnippet(meta.description ?? "", 300),
        readmeExcerpt,
        language: sanitizeSnippet(meta.language ?? "", 40),
        topics: (meta.topics ?? []).slice(0, 10).map((t) => sanitizeSnippet(t, 40)),
        stars: meta.stargazers_count ?? 0,
      };
    },
  );
}
