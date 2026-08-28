# Verdiqt

**Put your SaaS idea on trial before you build it.**

Verdiqt is an agent-native web app that runs a SaaS idea through a real evidence trial: it gathers live signals from public developer communities, scores the idea across six weighted dimensions with code-enforced citation integrity, and returns a **BUILD**, **PIVOT**, or **KILL** verdict with one concrete next step. A human and an AI agent work the same courtroom on the same page — the human through the UI, the agent through 12 WebMCP browser tools.

Live: **https://verdiqt-web.onrender.com** · Built for the [WebMCP Challenge by OpenAI](https://webmcp.devpost.com) · MIT licensed.

## How the trial works

1. **File a case.** Free-text idea or a public GitHub repo URL at `/trial`. The intake normalizes it into a case file: one-liner, audience, problem, category, keywords (shown in Phase 1).
2. **Gather evidence.** Live, API-only research from Hacker News (Algolia), GitHub, Stack Overflow, and Product Hunt (topic-filtered GraphQL). Every source's outcome — gathered, failed, or disabled — is visible in the page. Reddit is intentionally bypassed per Reddit's Responsible Builder Policy: no anonymous scraping; the OAuth path is dormant pending app approval.
3. **Classify.** Each evidence item gets a dimension and a strength rating of 1-5.
4. **Judge 1 — the scoring panel.** Six weighted dimensions (problem severity, demand signals, competition, monetization, distribution, build cost) are scored 0-100 with integrity enforced in code, not trusted to the model: citations must come from the supplied evidence ids (ghost citations are stripped), a score above 40 with too few surviving citations is capped at 40, and fewer than 2 evidence items caps a dimension at 45. Each dimension also returns a highlighted key finding — competitor names, the strongest demand signal, the paying persona.
5. **Judge 2 — the bench.** A second model pass reviews the entire case file and adjusts the weighted composite within ±8 points (clamped in code), then the thresholds are re-applied in code: **BUILD** at 70+, **PIVOT** at 40-69, **KILL** below 40. The bench writes a case-specific opinion with a confidence level.
6. **Verdict.** Gauge and radar charts, per-dimension rationale accordions citing the evidence links, and exactly one recommended next step from a fixed catalog: fake door, forum interviews, pricing probe, competitor teardown, channel test, wedge cut, or ship it.

## The 12 WebMCP tools

Registered client-side via `document.modelContext.registerTool` (see `lib/webmcp/registry.ts`). Every tool executes as the visiting browser's own cookie principal — per-visitor isolation, identical 404s for anything you do not own.

| Tool | Purpose |
|---|---|
| `start_validation` | Start a trial from idea text or a public GitHub repo URL; returns a `run_id` |
| `get_validation_status` | Poll a trial's stage, evidence count, per-source states, case file, and recent human actions |
| `get_evidence` | Read gathered evidence, filterable by dimension or source, with the human's pin/reject state |
| `request_deep_scan` | Queue a deeper scan for one dimension; the human must approve it in the page |
| `get_verdict` | The full scored verdict: composite, six dimensions with citations, bench opinion, next step |
| `refine_idea` | Re-validate a pivoted version as a new trial linked to the original |
| `compare_ideas` | Compare completed trials side by side across all six dimensions |
| `get_next_step` | The single recommended validation action from the playbook |
| `list_repos` | List the signed-in visitor's public GitHub repositories |
| `analyze_repo` | Start a trial from one of those repositories (README + metadata) |
| `rank_portfolio` | Rank analyzed repositories by verdict score; human-approval gated |
| `search_knowledge` | Query the validation-methodology knowledge base directly |

## Trying it as an agent

- **ChatGPT's in-app browser** supports WebMCP out of the box: open https://verdiqt-web.onrender.com and ask, for example, "Put this idea on trial: AI changelog writer for indie SaaS teams."
- **Chrome 149+**: enable `chrome://flags/#enable-webmcp-testing`, restart, open the site, and use any WebMCP-capable agent surface.

The tools carry their own workflow directives, so an agent knows the path without prompting: `start_validation` → poll `get_validation_status` every few seconds until `COMPLETE` (about 30 seconds) → `get_verdict`, then optionally `get_evidence` and `get_next_step`. The site is fully usable without an agent.

## Local development

Prerequisites: Node 22, pnpm, Postgres.

```bash
pnpm install
pnpm exec prisma migrate deploy   # local; in production migrations auto-run at boot via instrumentation
pnpm dev                          # web app on :3000
pnpm worker                       # second terminal: the pipeline worker (or set COLOCATED_WORKER=true)
```

Environment variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection (pooled client, capped at 6 connections) |
| `DIRECT_DATABASE_URL` | Direct Postgres connection (migrations + direct client, capped at 3) |
| `INFERENCE_API_KEY` | Groq API key (free tier works) |
| `INFERENCE_BASE_URL` | `https://api.groq.com/openai/v1` |
| `INFERENCE_MODEL` | `openai/gpt-oss-120b` |
| `PUBLIC_TRIALS_ENABLED` | Must be `true` for trial creation |
| `AUTH_SECRET` | Session signing secret |
| `JUDGE_ACCESS_CODE` | Optional: code that exchanges for a cookie bypassing the daily trial limit |
| `GITHUB_TOKEN` | Optional: raises GitHub API quota |
| `PRODUCT_HUNT_TOKEN` | Optional: enables the Product Hunt source |
| `RATE_LIMIT_TRIALS_PER_DAY` | Optional: abuse ceiling per IP, default 100 |

## Architecture

Zero-budget topology — the whole product runs on free tiers:

- One free Render web container runs Next.js 15 **and** the pg-boss pipeline worker, colocated via the Next instrumentation hook (`instrumentation-node.ts`), which also applies migrations and ingests the knowledge corpus at boot.
- Inference is Groq free tier (`openai/gpt-oss-120b`) through the OpenAI-compatible API; 429s are waited out and retried, schema violations get one repair retry, then a typed failure.
- Evidence comes from free public APIs behind a Postgres-backed response cache with per-source TTLs. No scraping.
- Prisma pools are capped at 6 + 3 and pg-boss at 4 — 13 worst-case connections against free Postgres's ~95.
- In-process micro-caches (2s) collapse poll bursts on status routes; a retention sweep keeps the database bounded.
- Retrieval is Postgres full-text search (`websearch_to_tsquery`, OR-phrase fallback, dimension-tag backfill) over a 12-file validation-methodology corpus in `content/brain/` — no paid embeddings.
- Anonymous privacy: a 256-bit capability cookie (only its SHA-256 hash is stored) with a 30-day sliding expiry isolates each visitor's history; the design was adversarially audited.

## License

MIT. See [LICENSE](LICENSE).
