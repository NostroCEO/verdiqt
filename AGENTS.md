# Agent Instructions

Operating manual for coding agents working on Verdiqt. These instructions apply to the entire repository.

## Start Here

On a fresh or resumed session:

1. Read `CODEX_PROMPT.md` for the founder's vision and finish line.
2. Read `docs/STATE.md` for current progress and the immutable decision log.
3. Read `docs/PLAN.md` and work from the next unchecked task unless `docs/STATE.md` says otherwise.
4. Read the contract documents relevant to the task:
   - `docs/ARCHITECTURE.md`
   - `docs/WEBMCP_TOOLS.md`
   - `docs/VALIDATION_FRAMEWORK.md`
   - `docs/UI_DESIGN.md`
   - `uitools.md`
5. Treat `rules.md` as a convenience summary only. The official Devpost rules and website always prevail.

If code and documentation conflict, fix both in the same change. Append new durable decisions to `docs/STATE.md` with one line of reasoning. Never silently rewrite decision history.

## Project

Verdiqt is an agent-native SaaS idea validation app for the WebMCP Challenge. Its judged centerpiece is the two-way collaboration loop: the agent researches and proposes, the human approves and curates, and the agent re-reads persisted trial status and human actions through the registered read tools.

The locked stack is strict TypeScript, Next.js 15 App Router without a `src/` directory, Node 22, pnpm, Prisma, pg-boss, Postgres with pgvector, Auth.js, OpenAI Responses and embeddings, zod, vitest, and Render web, worker, cron, and database services.

## Commands

```bash
pnpm install
pnpm dev
pnpm worker
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm prisma migrate dev
pnpm ingest:brain
pnpm seed:demo
```

The package scripts do not exist until Task 1 creates them. `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` must pass before every commit once available.

Local environment values belong in `.env`, which is never committed. `.env.example` must stay complete and secret-free. Deployment uses the checked-in Render Blueprint and a connected GitHub repository, not an undocumented local deploy command.

## Implementation Workflow

1. Identify the next unchecked task in `docs/PLAN.md`.
2. Identify the exact contract sections and requirement IDs affected.
3. Implement the smallest end-to-end slice that leaves the app deployable.
4. Run the task's tests and the repository quality gates.
5. Exercise both the human UI and WebMCP path when either changes.
   Every UI-affecting change must be visually inspected with Playwright against the running application at the affected desktop viewport and at 375 px. Capture and inspect screenshots, check horizontal overflow, and fix visible defects before calling the change complete. Build and type checks alone are not visual verification.
6. Update `docs/PLAN.md`, `docs/STATE.md`, and any affected contract in the same change.
7. Commit with a conventional present-tense prefix such as `feat:`, `fix:`, `chore:`, or `docs:`.

Do not claim functionality that has not been exercised. Keep future plans separate from behavior that works now.

## Engineering Conventions

- TypeScript is strict. Do not use `any` outside `lib/webmcp/registry.ts`, the declared API-drift boundary.
- Validate all tool, route, and external inputs with zod.
- Treat all fetched content and model-supplied arguments as untrusted.
- Evidence-source and other external HTTP requests go through `cachedFetch` and `lib/sanitize.ts` before entering prompts or tool results.
- OpenAI SDK calls use structured outputs, bounded retries, and the documented content-hash cache where applicable. They do not route through `cachedFetch` as HTTP payloads.
- Run slow validation work in the pg-boss worker, never inside request handlers.
- Mock OpenAI and external APIs in tests. Tests never call paid services.
- Preserve idempotency and ownership checks for repeated or concurrent operations.
- Never expose secrets, access codes, raw tokens, or unnecessary personal data.

## WebMCP Standards

- Implement the 12 contracts in `docs/WEBMCP_TOOLS.md` exactly unless the live WebMCP API requires a documented compatibility adjustment.
- Use narrow, action-oriented tools with precise descriptions and constrained JSON Schemas.
- Keep business logic on the server. Client tool handlers call the same API routes as the human UI.
- Separate reads from consequential writes.
- Deep scans and portfolio ranking require persistent human approval. Tool calls only create approval requests.
- Keep agent-visible results and human-visible state synchronized through the page-context loop.
- Make repeated calls safe through idempotency keys, uniqueness constraints, or explicit conflicts.
- Verify every changed tool on the deployed URL in both ChatGPT's in-app browser and Chrome 149+ with WebMCP enabled.
- Record final WebMCP eval results in `docs/SUBMISSION_CHECKLIST.md`.

## UI Conventions

- Use shadcn/ui primitives, Motion for application and landing DOM animation, Bklit for all charts, and KokonutUI only where `docs/UI_DESIGN.md` or `uitools.md` names it.
- Three.js and anime.js are optional and limited to one isolated dynamically imported landing scene after the `uitools.md` verification gate.
- Use tokens from `app/globals.css`. Do not hard-code colors in components.
- UI copy is English, decisive, and evidence-led.
- The em dash character is forbidden in UI copy and project documentation.
- Respect reduced motion, keyboard navigation, and WCAG AA contrast.
- Treat Playwright visual validation as a required quality gate for every UI change. Record the checked viewports and result in the task notes or `docs/STATE.md`.

## Boundaries

- Do not add dependencies outside the locked stack without recording the reason in `docs/STATE.md`.
- Do not scrape websites. Use the documented APIs only.
- Do not put secrets in the client bundle, repository, logs, tool responses, or documentation.
- Do not weaken the human approval and page-context collaboration loop.
- Do not rewrite public Git history.
- Stop for the founder only when work needs accounts or credentials, a spending decision, an unsettled taste choice, or a decision that conflicts with official rules.

## Completion Standard

A task is complete only when its acceptance criteria pass, relevant checks are green, the deployed path remains viable, documentation reflects the final behavior, and the demonstrated product matches `docs/BRIEF.md`.
