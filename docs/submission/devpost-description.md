# Verdiqt — Devpost project description

Live app: https://verdiqt-web.onrender.com
Public repo: https://github.com/NostroCEO/verdiqt (MIT license)
New project, built from scratch for The WebMCP Challenge.

---

## Inspiration and what it does

AI collapsed the cost of building software. It did not collapse the cost of building the *wrong* software. Builders now ship SaaS in a weekend and discover at launch that nobody wanted it. Verdiqt moves that discovery to before the first commit.

You file a case — a free-text SaaS idea, or a public GitHub repo URL for a project already sitting in your graveyard — and Verdiqt puts it on trial:

1. **Intake.** The idea is normalized into a case file: one-liner, audience, problem, category, keywords.
2. **Evidence.** Live, API-only research from Hacker News (Algolia), GitHub, Stack Overflow, and Product Hunt (topic-filtered GraphQL). Every source's outcome — gathered, failed, or deliberately disabled — is shown in the page. Reddit is intentionally bypassed per Reddit's Responsible Builder Policy: no anonymous scraping, OAuth path dormant pending approval.
3. **The judges.** A classifier tags each evidence item with a dimension and strength 1-5. Judge 1, the scoring panel, scores six weighted dimensions (problem severity, demand signals, competition, monetization, distribution, build cost) with citations. Judge 2, the bench, reviews the whole case file, adjusts the composite within a bounded band, and writes a case-specific opinion with a confidence level.
4. **The verdict.** **BUILD** (70+), **PIVOT** (40-69), or **KILL** (<40), rendered with a gauge and radar charts, per-dimension rationales citing the evidence links, highlighted key findings (competitor names, the strongest demand signal), and exactly one recommended next step from a fixed playbook: fake door, forum interviews, pricing probe, competitor teardown, channel test, wedge cut, or ship it.

A full trial completes in about 30 seconds.

## How WebMCP powers it

Verdiqt is agent-native, not agent-decorated: a human and an AI agent work the **same courtroom through the same page**, at the same time.

The page registers its tools with the browser via `document.modelContext.registerTool`. Ten are live in the hosted demo: `start_validation`, `get_validation_status`, `get_evidence`, `request_deep_scan`, `get_verdict`, `refine_idea`, `compare_ideas`, `get_next_step`, `analyze_repo`, and `search_knowledge`. Two more — `list_repos` and `rank_portfolio` — are built but gated out of the registry until GitHub OAuth is enabled, so an agent never meets a tool that cannot run. What the live tools enable:

- **Typed tools instead of scraping.** An agent never parses our DOM or guesses at buttons. It gets structured contracts with input schemas, and the tool descriptions carry their own workflow directives — `start_validation` tells the agent to poll `get_validation_status` until `COMPLETE`, then call `get_verdict`. Any WebMCP-capable agent completes the full journey with zero site-specific prompting.
- **The human sees every agent action.** Each tool execution is reported to an in-page activity bus, and the trial dashboard streams the pipeline live. When an agent starts a trial from ChatGPT, the human watches the same phases, sources, and scores materialize in the page.
- **Humans keep the gavel.** Expensive or multiplying operations (`request_deep_scan`, `rank_portfolio`) queue an approval card that only a human click can release. Agents research; humans authorize.
- **Same principal, same boundaries.** Tools execute as the visiting browser's own cookie principal. An agent in your browser sees exactly your trials — nothing else — with identical 404s for anything unowned.

This two-way loop — tools one direction, visible human actions the other — is what neither a chatbot nor a dashboard can do alone, and it is only possible because WebMCP puts the tools *in the page*.

## How we built it

**Zero-budget engineering.** Every piece is built to free-tier constraints and runs on Render participant credits — zero cash out of pocket:

- One Render web container runs Next.js 15 *and* the pg-boss pipeline worker, colocated through the Next instrumentation hook — which also applies Prisma migrations and ingests the knowledge corpus at boot. No separate worker instance.
- Inference is Groq's free tier (`openai/gpt-oss-120b`). Per-minute 429s are waited out and retried; schema violations get one repair retry, then a typed failure.
- Evidence comes exclusively from free public APIs behind a Postgres-backed response cache with per-source TTLs.
- The Prisma pool is capped at 6 connections and pg-boss at 4 — a 10-connection worst case, kept well under the database's ceiling — with 2-second in-process micro-caches collapsing poll bursts and a retention sweep keeping the database bounded.
- Retrieval is Postgres full-text search (OR-phrase fallback plus dimension-tag backfill) over a 12-file validation-methodology corpus we wrote ourselves — no paid embeddings, no vector database.

**The two-judge integrity design.** The anti-hallucination story is enforced in code, not in prompts. Judge 1 may only cite evidence ids we actually supplied — ghost citations are stripped, and a score above 40 that loses its citations in that review is capped at 40 in code. Fewer than 2 evidence items clamps a dimension into a 40-45 "unproven" band, regardless of what the model claims — thin evidence reads as uncertainty in code, never as hype and never as a kill. Judge 2's composite adjustment is clamped to ±8, and the BUILD/PIVOT/KILL thresholds are re-applied in code after the adjustment. The model argues; the code rules.

**Security and privacy.** Anonymous visitors get a 256-bit capability cookie; only its SHA-256 hash is stored, with a 30-day sliding expiry. Per-visitor history isolation was adversarially audited, unowned resources return identical 404s, and per-IP and global daily ceilings exist solely so runaway or bot traffic cannot drain the shared free inference quota before a judge arrives. Evidence snippets are sanitized and framed as data, never instructions, before reaching the models.

## Challenges, accomplishments, what's next

**Challenges.** Running a multi-stage LLM pipeline plus a web app inside one free container meant treating connections, tokens, and memory as scarce resources — pool caps, micro-caches, response caches, and wait-and-retry were all forced moves that became design features. WebMCP is new enough that the tool contract itself was a design problem: we learned that workflow directives inside tool descriptions are what turn 12 endpoints into a journey an agent can complete unaided.

**Accomplishments.** A complete evidence trial in about 30 seconds on free-tier architecture; a citation-integrity system where the caps and clamps live in code; a genuinely dual-audience surface where an agent's work is legible to the human watching the page; and a principled sourcing stance (respecting Reddit's policy rather than scraping around it).

**What's next.** Reddit via the approved OAuth path, richer portfolio triage across a full GitHub graveyard, longitudinal re-trials to watch a verdict change as markets move, and evidence pinning/reweighting feeding back into agent sessions in real time.

---

## Testing it (for judges)

Open **https://verdiqt-web.onrender.com** — no account, no code, no setup. The app is always-on and responds instantly, so the live agent flow works on the first try.

**As a human.** File a case right from the landing page — any SaaS idea in a sentence, or a public GitHub repo URL. Watch the three phases: the normalized case file, evidence streaming in per source (including sources that refuse or are disabled — that visibility is intentional), then the scored verdict with gauge, radar, per-dimension rationale accordions with evidence links, the bench's opinion, and the single recommended next step.

**As an agent.**
- *ChatGPT's in-app browser* supports WebMCP out of the box: open the live URL there and ask, "Put this idea on trial: AI changelog writer for indie SaaS teams."
- *Chrome 149+*: enable `chrome://flags/#enable-webmcp-testing`, restart, open the site, and use any WebMCP-capable agent surface. The registered tools are inspectable in DevTools.

The agent will follow the built-in workflow on its own: `start_validation` → poll `get_validation_status` until `COMPLETE` (about 30 seconds) → `get_verdict`, then `get_evidence` or `get_next_step` for detail. Watch the page while it works — every tool call and pipeline stage is visible there.

In the unlikely event you see a daily-limit message, enter the access code from the submission form at `/judge` — it lifts the trial ceiling for your browser. You should never need it.
