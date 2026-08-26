# Verdiqt

**Put your SaaS idea on trial before you build it.**

> Build status, 2026-08-26: the reconciled product and engineering specification is complete. Application implementation has not started. See [docs/STATE.md](docs/STATE.md) for the live handoff.

Verdiqt is an agent-native web app where a builder and their AI agent judge a SaaS idea together, on the same page, at the same time. The agent researches: it gathers API-backed signals from Hacker News, GitHub, the live web, and optional approved sources such as Product Hunt and Reddit when configured. The human judges: approving deep scans, pinning the evidence that matters, rejecting noise, reweighting the scoring. The result is a cited, scored verdict: **BUILD**, **PIVOT**, or **KILL**, plus the one cheapest next step to prove it right or wrong.

Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com): a WebMCP-powered exploration of a web where humans and agents decide together what deserves to exist.

## Why this exists

AI collapsed the cost of building software. It did not collapse the cost of building the wrong software. Builders now ship SaaS in volume, burn tokens and weekends, and discover at launch that nobody wanted the product. Verdiqt moves that discovery to before the first commit, and for the projects already sitting in your GitHub graveyard, it tells you which one deserves to live.

## Why WebMCP

Validation is naturally a dialogue between research and judgment. WebMCP lets both parties work the same live page:

- The **agent** (in ChatGPT's in-app browser, or Chrome with WebMCP enabled) discovers 12 registered tools covering the whole journey: starting trials, reading evidence, requesting gated deep scans, fetching verdicts, testing pivots, comparing ideas, sweeping a GitHub portfolio, and querying the marketing knowledge base.
- The **human** sees everything stream into the dashboard live, and acts: one-click approvals for expensive operations, pin and reject on evidence, weight sliders on the scoring.
- The **page context** flows back: the agent sees the human's actions (pins, rejections, weight changes, approvals) and adapts its analysis in the same session.

That two-way loop, tools one way and human actions the other, is something neither a chatbot nor a dashboard can do alone.

## What agents can do here

| Tool | Purpose |
|---|---|
| `start_validation` | Start a trial from idea text or a public repo URL |
| `get_validation_status` | Poll a running trial's stage and progress |
| `get_evidence` | Read gathered evidence, filter by dimension or source |
| `request_deep_scan` | Ask for a deeper scan (human must approve in the page) |
| `get_verdict` | The full scored verdict with citations |
| `refine_idea` | Re-validate a pivot, linked to the original |
| `compare_ideas` | Side-by-side comparison of trials |
| `get_next_step` | The single recommended validation action |
| `list_repos` / `analyze_repo` / `rank_portfolio` | GitHub portfolio triage (sign-in + approval gated) |
| `search_knowledge` | Query the validation knowledge base directly |

Full contracts: [docs/WEBMCP_TOOLS.md](docs/WEBMCP_TOOLS.md).

## The verdict

Six dimensions, each scored 0 to 100 with evidence citations, weighted (adjustable) into a composite:

1. **Problem severity**: is the pain real and documented?
2. **Demand signals**: is anyone actively looking?
3. **Competition**: is there a gap worth owning?
4. **Monetization**: who pays, how much, why?
5. **Distribution**: can this builder reach this audience?
6. **Build cost vs payoff**: is the wedge worth the burn?

Composite 70+ is **BUILD**, 40 to 69 is **PIVOT** (with a named direction), below 40 is **KILL**. Every verdict ends with exactly one next step from the validation playbook. Scoring rules: [docs/VALIDATION_FRAMEWORK.md](docs/VALIDATION_FRAMEWORK.md).

## Architecture

```
Next.js (UI + API + WebMCP registry + SSE)  ->  Render Web Service
pg-boss worker (validation pipeline)        ->  Render Background Worker
Daily maintenance                           ->  Render Cron
Postgres + pgvector (data, queue, cache, RAG brain)
Evidence: OpenAI web search, Reddit, Hacker News, Product Hunt, GitHub APIs
```

- Live evidence, cached per source with TTLs; no scraping, APIs only.
- RAG knowledge base of original-writing validation frameworks in pgvector grounds every score.
- Human approval gates and prompt-injection defenses per Chrome's WebMCP security guidance.
- Fully usable without an agent; agent features enhance, never gate.

Deep dive: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Try it with an agent once deployed

1. **ChatGPT desktop app**: open the live URL in the in-app browser and ask: "Put this idea on trial on Verdiqt: [your idea]".
2. **Chrome 149+**: enable `chrome://flags/#enable-webmcp-testing`, restart, open the live URL, and use any WebMCP-capable agent surface. Tools are inspectable in DevTools under Application.
3. **No agent**: the site works fully standalone; type an idea on the landing page.

## Planned local setup

These commands become runnable as the implementation tasks land. Check [docs/STATE.md](docs/STATE.md) before using them.

Prereqs: Node 22, pnpm, Postgres 16+ with the `vector` extension, an OpenAI API key.

```bash
git clone https://github.com/NostroCEO/verdiqt && cd verdiqt
pnpm install
cp .env.example .env        # fill in DATABASE_URL, DIRECT_DATABASE_URL, OPENAI_API_KEY, AUTH_* vars
pnpm prisma migrate deploy
pnpm ingest:brain            # embed the knowledge corpus
pnpm dev                     # web app on :3000
pnpm worker                  # in a second terminal: the validation worker
```

The deployment target is a Render Blueprint. Plan Task 2 creates `render.yaml` for the web service, worker, cron, and Postgres. Its environment contract already lives in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#environment-variables).

## Repository guide

| Path | What |
|---|---|
| [AGENTS.md](AGENTS.md) | Conventions and commands for coding agents working on this repo |
| [CODEX_PROMPT.md](CODEX_PROMPT.md) | Kickoff prompt to resume the project with full context |
| [docs/STATE.md](docs/STATE.md) | Live project state and decision log, read first |
| [docs/PLAN.md](docs/PLAN.md) | Task-by-task implementation plan |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Product, security, and acceptance requirements |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, Prisma schema, env vars |
| [docs/WEBMCP_TOOLS.md](docs/WEBMCP_TOOLS.md) | The 12 tool contracts |
| [docs/VALIDATION_FRAMEWORK.md](docs/VALIDATION_FRAMEWORK.md) | Scoring brain and knowledge corpus |
| [docs/UI_DESIGN.md](docs/UI_DESIGN.md) + [uitools.md](uitools.md) | Design system, motion specs, UI tool wiring |
| [docs/BRIEF.md](docs/BRIEF.md) | Product brief and judging alignment |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | The 3-minute demo video script |
| [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) | Every submission requirement as a checkbox |
| [FILETREE.md](FILETREE.md) | Canonical repository layout and integration rules |
| [rules.md](rules.md) + [ressources.md](ressources.md) | Verified challenge constraints and build references |

## License

MIT. See [LICENSE](LICENSE).
