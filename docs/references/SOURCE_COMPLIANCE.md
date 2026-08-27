# Source and Dependency Compliance

Per-source authorization record required by docs/PLAN.md Task 6 and the Devpost
rule: "If a Project integrates any third-party SDK, APIs and/or data, Entrant
must be authorized to use them in accordance with any terms and conditions or
licensing requirements of the tool." Review dates are when the live terms were
last read.

| Source | Endpoint | Authorization | Terms reviewed | TTL | Retention | State |
|---|---|---|---|---|---|---|
| Groq (inference) | https://api.groq.com/openai/v1 (OpenAI-compatible) | Free tier; Services Agreement grants the right to integrate the API into a Customer Application and make it available to End Users; no attribution required; public demo apps not restricted. Limits ~30 req/min, ~1,000 req/day per model; our caps (<=20 calls/trial) stay inside them. Model: gpt-oss-120b (exact ID re-verified in console before first call). | 2026-08-27 | n/a (no HTTP cache for inference) | prompts not retained by us beyond TrialEvent/score rows | ENABLED once founder key exists |
| Hacker News (Algolia Search API) | https://hn.algolia.com/api/v1/search | Public API, no key, free for non-bulk use; we cap 12 items/trial and cache 24h | 2026-08-27 | 24h | snippets sanitized, stored as Evidence rows under Gate A retention (30 days post-completion for anonymous trials) | ENABLED |
| GitHub REST | https://api.github.com (repo search, repo metadata, README) | Authenticated with founder GITHUB_TOKEN, standard API terms, public repos only | 2026-08-27 | 12h (search) / 1h (metadata) | README excerpts truncated to 4000 chars, sanitized | ENABLED |
| Product Hunt API | https://api.producthunt.com/v2/api/graphql | Requires PRODUCT_HUNT_TOKEN; without it the adapter returns [] and emits source_disabled once per trial | pending token | 24h | same as HN | DISABLED until token provided |
| OpenAI web search | n/a | CUT by the zero-budget decision (founder D20). Adapter returns [] and emits source_disabled. | 2026-08-27 | n/a | n/a | DISABLED |
| Reddit Data API | n/a | DISABLED by standing decision: requires registered OAuth credentials, accurate client identity, and a founder-approved retention policy; never anonymous JSON endpoints | 2026-08-27 | n/a | n/a | DISABLED |

Dependencies: all npm packages are OSI-licensed (verified via package metadata at
install time); the four technology marks on the landing follow the official
brand assets rule in docs/UI_DESIGN.md; Geist and DM Mono are OFL-licensed via
next/font. The repository itself is MIT.
