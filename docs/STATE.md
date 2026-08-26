# Project State

Read this before doing anything. Update it at the end of every working session: move items between sections, date them, keep decisions immutable (append corrections, never silently rewrite history). This file is how any coding agent resumes exactly where the project stands.

Last updated: 2026-08-26 by the first implementation session. Task 1 and the editorial landing foundation are implemented and in final commit verification.

## Where we are

- [x] 2026-08-26: Product idea and founder intent locked in the supplied Verdiqt documents.
- [x] 2026-08-26: Documentation normalized into the canonical root and `docs/` layout, with requirements, contracts, rules, resources, demo, and agent instructions reconciled.
- [x] 2026-08-26: Devpost registration confirmed by the founder; official dates, criteria, resources, and submission requirements refreshed from the live challenge data.
- [x] 2026-08-26: Task 1 scaffold created with Next.js 15.5.24, React 19.2.8, exact dependencies, shadcn 4.19.0 components, Verdiqt tokens, and the first branded landing shell.
- [x] 2026-08-26: The landing shell passed lint, TypeScript, production build, tests with no test files allowed for Task 1, and Playwright visual inspection at 1440 x 1000 and 375 x 812 with no horizontal overflow.
- [x] 2026-08-26: The founder rejected the soft glow and glass landing direction. The replacement uses a hard-edged editorial hero, original CSS halftone gavel, repository-first local preview, official challenge supporter attribution, interactive proceeding, and a light procedural-record section.
- [x] 2026-08-26: The editorial landing passed Playwright inspection at 1440 x 1000 and 375 x 812, all three walkthrough stages, keyboard-only intake, visible focus, element-bound and horizontal-overflow checks, and a reduced-motion run with zero active animations. Hydration and runtime consoles are clean.
- [x] Local git repository initialized on `main` with the first project commits. No remote is configured yet.
- [x] Application code: Task 1 passed the frozen-lockfile and pinned Node 22 verification. The next engineering action is Task 2 deployment, then the backend sequence.

## Decision log (immutable)

| Date | Decision | Why |
|---|---|---|
| 2026-08-26 | Product: Verdiqt, a validation copilot where human and agent judge SaaS ideas together | Strongest fit for the hackathon theme and the founder's anti-token-burn mission |
| 2026-08-26 | Collaborative cockpit over one-way tools | Two-way loop (context + approvals) is the WebMCP Leverage play |
| 2026-08-26 | Evidence: live APIs + curated RAG brain; NO site scraping | Rules-safe, buildable in 8 days, credible citations |
| 2026-08-26 | Verdict: 6 weighted dimensions, 0 to 100, BUILD/PIVOT/KILL at 70/40, one next step | Programmatic, comparable, agent-actionable |
| 2026-08-26 | Hosting: everything on Render (web, worker, cron, Postgres+pgvector) | No serverless timeouts, one dashboard; rules allow any host |
| 2026-08-26 | Data: Prisma + pooling, pg-boss queue in Postgres, ApiCache table | One datastore, founder requirement for pooling + cache |
| 2026-08-26 | UI: shadcn/Tailwind + Motion + KokonutUI + Bklit charts + anime.js/Three hero | Founder-selected stack (uitools.md); Bklit owns ALL charts |
| 2026-08-26 | Agent presence: popping dock, never a permanent panel | Founder requirement: framed motion, expandable, closable |
| 2026-08-26 | GitHub OAuth portfolio sweep under account NostroCEO; public-repo-URL path kept for zero-friction judging | Founder requirement + judge accessibility |
| 2026-08-26 | Priorities: core flow > polish > portfolio OAuth > cron monitoring | Founder cut line |
| 2026-08-26 | Em dash banned in all UI copy; docs follow the same rule | Founder requirement |
| 2026-08-26 | Submit September 2, one day early | Deadline risk management |
| 2026-08-26 | Canonical planning files live under `docs/`; `CODEX_PROMPT.md` is the agent kickoff contract; Next.js uses no `src/` directory | Removes duplicate scaffold content and makes every local link resolve |
| 2026-08-26 | Trial access uses server-validated ownership capabilities; approvals and idempotency are persistent data, not client-only state | Prevents cross-session access, replayed writes, and approval bypasses |
| 2026-08-26 | Superseded in the same session: Devpost judging percentages were initially not assumed | The criteria endpoint omitted weights, but the later full-rules check found the controlling language in section 7 |
| 2026-08-26 | Correction: the previously referenced `docs/superpowers/specs/2026-08-26-verdiqt-design.md` is not present in the supplied project | The canonical design source is `docs/UI_DESIGN.md` plus `uitools.md` unless the founder later supplies the archived spec |
| 2026-08-26 | The four Devpost criteria are equally weighted, with ties resolved in listed order starting with WebMCP Leverage | Official rules section 7 controls when the shorter criteria endpoint omits weighting metadata |
| 2026-08-26 | Correction to hosting scope: Render remains the primary host for web, worker, and Postgres; cron is optional Task 18. Vercel and Netlify accounts are available only as contingency web hosts. No topology switch occurs without founder approval and end-to-end verification. | Render supports the required long-running pg-boss worker; account availability alone does not prove topology compatibility |
| 2026-08-26 | Task 1 pins Node 22.23.2, pnpm 11.24.0, Next.js and create-next-app 15.5.24, React 19.2.8, shadcn 4.19.0, and the exact dependency graph in package.json and pnpm-lock.yaml. | Current official package metadata was checked before installation; OpenAI v5 requires Zod 3, so Zod 3.25.76 is pinned |
| 2026-08-26 | The current shadcn CLI uses the `base-nova` preset rather than the legacy style prompt; Task 1 uses its neutral CSS-variable configuration and then applies Verdiqt tokens. | This is the exact current CLI behavior and keeps the generated component contracts current |
| 2026-08-26 | Every UI-affecting change requires Playwright visual validation at the affected desktop viewport and 375 px, including screenshots and horizontal-overflow inspection. | Founder established this as a permanent quality rule after the first landing shell was built |
| 2026-08-26 | Correction to the earlier landing animation ownership: Motion owns the landing DOM hero, intake, and walkthrough. anime.js and Three.js are optional for one later isolated 3D moment only. | The founder explicitly requested motion.dev animation; the current original CSS halftone experience is complete, accessible, and avoids an unnecessary WebGL dependency |
| 2026-08-26 | Landing visual language is hard-edged editorial: flat near-black fields, 1280 px rail shell, square modules, one-pixel borders, mono protocol labels, original halftone courtroom art, and a light procedural-record section. | The founder rejected the generic AI glow, glass, and full-page grid direction after seeing the first render |
| 2026-08-26 | TesterArmy is a runtime layout and pacing reference only. Verdiqt does not copy its source, exact copy, SVG paths, skull art, customer marks, testimonials, or brand assets. | Preserves an original product identity and source compliance while using public computed layout and interaction patterns as inspiration |
| 2026-08-26 | The landing lists OpenAI, Cloudflare, Vercel, Shopify, Google Chrome, Render, and Netlify as text-only WebMCP Challenge supporters with a visible non-endorsement disclosure. | These are the names shown in the official challenge resource hub; text-only factual attribution avoids implying a direct Verdiqt relationship or using unverified logo rights |

## Open questions (resolve with the founder, not unilaterally)

- Exact production domain (Render subdomain vs custom domain).
- Gate B: exact OpenAI model IDs for normalization/scoring, web search, deep scan/composition, and 1536-dimension embeddings; per-trial call and evidence caps; timeouts and retry bounds; and development and demo spend ceilings.
- Demo idea for the video is "AI changelog writer for indie SaaS teams" per docs/DEMO_SCRIPT.md; confirm before recording.
- Data-retention period and account-deletion behavior. Requirements leave both unspecified until the founder decides.
- Whether to enable the optional direct Reddit adapter. It requires registered Data API OAuth credentials, accurate client identity, and a retention policy approved against the current terms; it remains disabled until all are resolved.
- Exact Bklit and KokonutUI registry identifiers and display-serif choice. anime.js and Three.js APIs need verification only if the founder later requests the optional isolated 3D moment.
- Gate A: collected data categories, retention periods, anonymous and signed-in deletion behavior, GitHub unlink/token revocation behavior, and the public privacy notice URL. Public trials and GitHub OAuth remain disabled until resolved.

The `.devpost-hackathon-state.json` fields `next_command` and `submission.draft_file` are owned by the Devpost plugin workflow. They intentionally do not define the engineering next action or canonical documentation layout. For engineering, this file and `docs/PLAN.md` control; the next action is Plan Task 1. If the plugin prepares a root `devpost-submission.md`, integrate the accepted draft into `docs/submission/` without changing plugin state behind its back.

## Session journal (append one line per session)

- 2026-08-26: Brainstorm, spec, and full documentation kit. No code yet. Next: PLAN Task 1 scaffold, followed by the first deploy in Task 2.
- 2026-08-26: Read every supplied file; removed merged generic scaffold content; adopted `CODEX_PROMPT.md`; normalized paths and names; reconciled product, security, data, WebMCP, challenge, UI, and demo contracts. Next: initialize git, commit the baseline, then PLAN Task 1.
- 2026-08-26: Started the real build. Created the pinned Next.js and shadcn foundation, applied Verdiqt courtroom tokens, built the first landing shell, used live Devpost resources to retain the official WebMCP implementation path, and visually inspected desktop and 375 px layouts in Playwright. Next: exact Node 22 and frozen-lockfile verification, Git commits, then Task 2 deployment.
- 2026-08-26: Rebuilt the landing after founder review. Inspected tester.army public runtime geometry, transitions, animations, and SVG inventory without copying source or assets; replaced the soft AI visual language with an original editorial courtroom; added the seven official challenge supporters; verified desktop, mobile, keyboard, all walkthrough states, overflow, reduced motion, and clean hydration. Next: final frozen install, production build, commits, then Task 2 deployment before backend work.
