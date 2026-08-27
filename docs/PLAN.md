# Verdiqt Implementation Plan

> **For agentic workers:** Execute task by task, in order unless docs/STATE.md says otherwise. Steps use checkbox (`- [ ]`) syntax; check them off and update docs/STATE.md as you complete tasks. Each task ends deployable.

**Goal:** Ship Verdiqt, an agent-native SaaS-idea validation web app with 12 WebMCP tools, live on Render, submitted to the WebMCP Challenge by September 2, 2026.

**Architecture:** Next.js web service + pg-boss worker + cron on Render over one Postgres (pgvector) database; validation pipeline gathers cited evidence from live APIs, scores six dimensions grounded in a RAG knowledge base, and a client-side WebMCP registry exposes the whole journey to agents with human approval gates. Full detail: docs/ARCHITECTURE.md.

**Tech Stack:** TypeScript strict, Next.js 15 App Router, Tailwind + shadcn/ui, Motion, KokonutUI, Bklit, optional anime.js + Three.js isolated scene, Prisma 6, pg-boss 10, Auth.js v5 (GitHub), OpenAI SDK v5+ (Responses API + embeddings), zod, vitest.

## Global Constraints

- Node 22, pnpm. TypeScript strict mode, no `any` outside declared API-drift boundaries (lib/webmcp/registry.ts).
- Every task ends with: `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` passing plus a commit. From Task 2 onward, the live deploy must also remain healthy.
- The em dash character is banned in UI copy and project documentation. Before every commit, run `rg -n $'\xe2\x80\x94' --glob '*.{md,ts,tsx,js,jsx,json,css,scss,prisma,yml,yaml}' --glob '!node_modules/**' --glob '!.next/**' .`; it must return no matches.
- English UI copy only, verdict voice per docs/UI_DESIGN.md.
- Evidence-source and third-party REST/GraphQL HTTP goes through `cachedFetch` (Task 5). OpenAI SDK calls use the shared OpenAI wrapper and the explicit caching rules for embeddings and deterministic work. All slow work runs in the worker, never in request handlers. All inputs are validated with zod.
- Tool contracts in docs/WEBMCP_TOOLS.md and the Prisma schema in docs/ARCHITECTURE.md are implemented verbatim; do not rename fields.
- Env vars exactly as the table in docs/ARCHITECTURE.md; `.env.example` stays complete and secret-free.
- Commit messages: conventional (`feat:`, `fix:`, `chore:`, `docs:`), no AI attribution lines.

## Dated Delivery and Cut Schedule

All times below are Pacific Time, matching the challenge deadline.

- August 26: Task 1 and documentation baseline committed.
- August 27: Tasks 2 through 5. Render health, database, queue, SSE, and cache foundation green.
- August 28: Tasks 6 through 10 with mocked providers. Close the founder gates below before any live paid call.
- August 29: Task 11. Core pipeline completes locally and on Render, subject to the privacy launch gate.
- August 30: Tasks 12 through 14. Deployed two-way WebMCP approval loop green in both target clients by 6:00 pm.
- August 31: Tasks 15 and 16. Verdict experience and landing complete. Feature freeze at 6:00 pm.
- September 1: Task 18, security evals, submission draft, screenshots, and video. Code freeze at noon except for release blockers.
- September 2: Task 19. Submit and verify receipt by 6:00 pm.

Cut triggers, in order:

1. Cron is optional and cut first.
2. If the deployed collaboration loop is not green by August 30 at 6:00 pm, cut GitHub OAuth and the portfolio UI. Keep the three portfolio tool contracts as typed unavailable responses so the 12-tool registry claim remains truthful.
3. If the core experience is not feature-complete by August 31 at noon, cut nonessential 3D, KokonutUI, and extra-chart polish. Preserve approvals, human-action context, cited verdicts, accessibility, and both-client testing.
4. No new scope after the August 31 feature freeze.

## Founder Gates

### Gate A: Public Data and Privacy

This blocks public `POST /api/trials` and GitHub OAuth. Before opening either, the founder must approve and `docs/STATE.md` must record the collected data categories, retention duration for trials, events, evidence, logs, and account data, anonymous-trial deletion behavior, signed-in trial and account deletion behavior, GitHub OAuth unlink and token-revocation behavior, and the published privacy notice URL.

Until this gate is complete, deployed previews expose health checks and synthetic demo data only. Public trial writes and GitHub OAuth remain disabled through `PUBLIC_TRIALS_ENABLED=false` and `GITHUB_OAUTH_ENABLED=false`.

### Gate B: Paid OpenAI Use

This blocks every non-mocked OpenAI request. Before the first paid call, the founder must approve and `docs/STATE.md` must record exact model IDs for normalization and scoring, web search, deep scans and verdict composition, and 1536-dimension embeddings; the maximum OpenAI calls and gathered evidence items per trial; request timeout, SDK retry count, and structured-output repair bound; and development and demo spend ceilings.

Tests remain mocked until this gate is complete. Do not run corpus ingestion, a real trial, or a demo warm-up that calls OpenAI before approval.

---

### Task 1: Scaffold and repo hygiene

**Files:**
- Create: Next.js app at repo root (`app/`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`), `.node-version`, `.env.example`, `.gitignore`, `vitest.config.ts`, `lib/` and `worker/` and `scripts/` directories with `.gitkeep`.

**Interfaces:**
- Produces: the package scripts every later task relies on: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `worker` (`tsx worker/index.ts`), `ingest:brain` (`tsx scripts/ingest-brain.ts`), `seed:demo` (`tsx scripts/seed-demo.ts`), `migrate:deploy` (`prisma migrate deploy`). The optional cron script is added only in Task 18.

- [x] **Step 1:** Preserve the existing documentation. Verify an exact current Next.js 15 patch and matching exact `create-next-app` release in official sources, record them in docs/STATE.md, and run that exact generator version in a temporary directory outside the repository with `--ts --tailwind --app --no-src-dir --import-alias "@/*"`. Copy only generated application and configuration files into this non-empty root. Never run the generator against `.` and never overwrite README.md, AGENTS.md, CODEX_PROMPT.md, docs, or the license. Remove the temporary directory only after comparing the copied file list.
- [x] **Step 2:** Verify the current shadcn CLI release against its official documentation, invoke that exact version rather than `@latest`, initialize with the default style, neutral base, and CSS variables, then add `button card dialog popover tabs accordion slider sonner badge input skeleton`.
- [x] **Step 3:** Install the base stack with exact saved versions and commit `pnpm-lock.yaml`: the verified Next.js 15 and compatible React versions, Motion, zod, OpenAI SDK v5, pg-boss 10, Prisma 6 client and CLI, the verified Auth.js v5 beta build, tsx, vitest, coverage, ajv, and required type packages. Use `pnpm add --save-exact`; do not leave mutable tags such as `latest`, `beta`, or a bare major in package.json. Hero-only packages wait for the Task 16 verification gate.
- [x] **Step 4:** Pin the verified pnpm release in `packageManager`, enable Corepack, set `engines.node` to Node 22, and add `.node-version`. Add the package scripts from Interfaces; until the first real test lands in Task 3, `test` is `vitest run --passWithNoTests`, then it becomes `vitest run`. Create `.env.example` with every var from the docs/ARCHITECTURE.md table, values blank or safe defaults. Do not add `cron:daily` until optional Task 18.
- [x] **Step 5:** Apply design tokens from docs/UI_DESIGN.md to `app/globals.css` (CSS variables, dark default) and load Inter via `next/font`. HUMAN GATE: the founder confirms the display serif under `uitools.md` Gate 4 before it is installed; keep the display token on Inter until then rather than guessing.
- [x] **Step 6:** Verify through the pinned Corepack pnpm: `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` pass. Confirm the lockfile is unchanged by a second `pnpm install --frozen-lockfile`.
- [x] **Step 7:** Commit: `chore: scaffold next app with design tokens and tooling`.

### Task 2: Render deployment from day one

**Files:**
- Create: `render.yaml`, `app/api/health/route.ts`.

**Interfaces:**
- Produces: live base URL (record it in docs/STATE.md), `GET /api/health` returning `{ ok: true, sha }`.

- [x] **Step 1:** Write `render.yaml` with the web service (build `corepack enable && pnpm install --frozen-lockfile && pnpm build`, start `pnpm start`) and Postgres preview, using the exact local Node 22 patch. Keep public trials and GitHub OAuth disabled. Render Blueprints cannot declare a zero-instance worker and background workers have no free plan, so Task 4 adds `verdiqt-worker` only after its entrypoint exists and the founder approves the paid instance. Do not provision cron unless optional Task 18 is reached.
- [x] **Step 2:** Health route returns `{ ok: true, sha: process.env.RENDER_GIT_COMMIT ?? "dev" }`. Verify both branches through the production server locally.
- [ ] **Step 3:** HUMAN GATE: the founder creates the GitHub remote and pushes the committed foundation, then creates the Render Blueprint, confirms the preview region and Postgres version, provisions Postgres, and sets the currently required env vars from `.env.example`. The checked-in no-cost preview uses an unpooled free database; choosing a paid database with managed PgBouncer is a founder spending decision required before public workloads. Record the URL in docs/STATE.md.
- [ ] **Step 4:** Verify `GET /api/health` on the live URL and confirm its `sha` equals the deployed Git commit. Record the live proof in docs/STATE.md and commit the deployment status update.

### Task 3: Database schema and Prisma

**Files:**
- Create: `prisma/schema.prisma`, first migration, `lib/db.ts`.

**Interfaces:**
- Produces: `prisma` singleton (pooled) and `directPrisma` (direct URL) from `lib/db.ts`; all models from docs/ARCHITECTURE.md.

- [ ] **Step 1:** Copy the schema from docs/ARCHITECTURE.md verbatim into `prisma/schema.prisma`.
- [ ] **Step 2:** Migration must enable the extension and enforce ownership/input invariants: create it with `pnpm prisma migrate dev --name init --create-only`, prepend `CREATE EXTENSION IF NOT EXISTS vector;`, add every `CHECK` constraint specified after the schema in docs/ARCHITECTURE.md, then run `pnpm prisma migrate dev`.
- [ ] **Step 3:** `lib/db.ts`: export `prisma` (DATABASE_URL) and `directPrisma` (explicit Prisma datasource override to DIRECT_DATABASE_URL) as cached singletons using the globalThis pattern to survive dev hot reload.
- [ ] **Step 4:** Smoke test in `lib/__tests__/db.test.ts`: create and read back a Trial with weights JSON (runs against the dev database; skip in CI if `DATABASE_URL` unset with `describe.skipIf`).
- [ ] **Step 5:** `pnpm test`, `pnpm build`, deploy still green. Commit: `feat: prisma schema with pgvector and db clients`.

### Task 4: Queue, worker skeleton, events, SSE

**Files:**
- Create: `lib/queue.ts`, `worker/index.ts`, `worker/pipeline.ts`, `lib/events.ts`, the anonymous portion of `lib/access.ts`, `app/api/trials/[id]/stream/route.ts`, and access/event tests.

**Interfaces:**
- Produces: `enqueueTrial(pipelineRunId: string)`, `emitEvent(trialId, actor: Actor, kind: string, payload: object)`, anonymous capability resolution sufficient to protect the first deployed trial route, and an owner-authorized SSE endpoint streaming TrialEvent rows as `event: trial-event` messages. Queue delivery is at-least-once, so the PipelineRun row and pg-boss singleton key make execution idempotent.

- [ ] **Step 1:** `lib/queue.ts`: pg-boss singleton against DIRECT_DATABASE_URL, `enqueueTrial` sends job `run-trial` with `{ pipelineRunId }` and a deterministic singleton key. A retry returns the existing active run instead of creating parallel work.
- [ ] **Step 2:** `worker/index.ts`: start pg-boss, `work("run-trial", handler)` where the handler claims the PipelineRun transactionally and calls `runPipeline(pipelineRunId)` from `worker/pipeline.ts`. Duplicate or already-terminal deliveries exit safely. Pipeline stub for now: set status NORMALIZING then COMPLETE with a fake compositeScore 50, emitting `stage_started` events 1 second apart.
- [ ] **Step 3:** Implement the anonymous capability portion of `lib/access.ts`. The SSE route must resolve the current capability and verify trial ownership before opening. Unknown and foreign trial IDs return the same 404. Task 11 extends this helper for Auth.js and judge-rate behavior.
- [ ] **Step 4:** `lib/events.ts`: `emitEvent` inserts a TrialEvent row. Query by a stable `(createdAt, id)` cursor, not id alone. The SSE route honors `Last-Event-ID`, polls newer rows every 1500 ms, and emits `id: <encoded-createdAt-and-id>\nevent: trial-event\ndata: <json>\n\n` plus a heartbeat every 15 seconds. After flushing a COMPLETE or FAILED event for the requested revision, the server closes; the client sees that terminal event and calls `.close()` so it does not enter a permanent reconnect loop.
- [ ] **Step 5:** Tests prove deterministic cursor ordering, event `id:` frames, owner access, indistinguishable foreign IDs, network-error resume with no gaps or duplicates, terminal client close behavior, explicit reopen for a newer revision, and no duplicate rows on worker retry.
- [ ] **Step 6:** Manual verify locally: a setup script creates an AnonymousSession, matching capability cookie, Trial, and PipelineRun; `curl -N` with that cookie shows staged events and closes, while a different capability gets 404. Add the paid worker service to render.yaml after founder approval, redeploy, and verify worker logs on Render. Cron is not added unless optional Task 18 is reached.
- [ ] **Step 7:** Commit: `feat: pg-boss worker, trial events, sse stream`.

### Task 5: Sanitization and cachedFetch (TDD)

**Files:**
- Create: `lib/sanitize.ts`, `lib/evidence/cache.ts`, tests beside them.

**Interfaces:**
- Produces: `sanitizeSnippet(raw: string, max = 500): string` (strip HTML tags and control chars, collapse whitespace, cap length), `wrapEvidence(id, source, text): string` (the `<evidence>` delimiter format from docs/VALIDATION_FRAMEWORK.md), `cachedFetch<T>(source: EvidenceSource | "GITHUB_METADATA", key: string, ttlHours: number, fn: () => Promise<T>): Promise<T>` backed by ApiCache with sha256 keys. OpenAI SDK calls do not use this helper.

- [ ] **Step 1:** Write failing tests: sanitize strips `<script>alert(1)</script>` to text, caps at max, collapses whitespace; wrapEvidence produces the exact tag format; cachedFetch calls `fn` once then serves from cache until expiry (inject a fake clock by passing `now` optionally).
- [ ] **Step 2:** Run `pnpm vitest run lib` and see them fail.
- [ ] **Step 3:** Implement minimal code to pass. TTL table from docs/ARCHITECTURE.md as an exported const.
- [ ] **Step 4:** `pnpm vitest run lib` green. Commit: `feat: sanitization and api cache helpers`.

### Task 6: Evidence source adapters (TDD with fixtures)

**Files:**
- Create: `lib/evidence/types.ts`, `lib/evidence/sources/{hackernews,reddit,github,webSearch,producthunt}.ts`, `lib/evidence/gather.ts`, fixtures in `lib/evidence/__fixtures__/`, tests.
- Update: `docs/references/SOURCE_COMPLIANCE.md` with verified authorization, terms, retention, TTL, and enablement decisions for every evidence source.

**Interfaces:**
- Consumes: `cachedFetch`, `sanitizeSnippet`.
- Produces: `type RawEvidence = { source: EvidenceSource; url: string; title: string; snippet: string; publishedAt?: string }`, each adapter `gather(idea: NormalizedIdea, ctx: { emit: EvidenceEmitter }): Promise<RawEvidence[]>` (max 12 items each), and `gatherAll(idea, emit): Promise<RawEvidence[]>` running adapters with `Promise.allSettled`, emitting `source_disabled` or `source_failed` centrally and never throwing.
- `type NormalizedIdea = { oneLiner: string; audience: string; problem: string; category: string; keywords: string[] }` (defined in `lib/evidence/types.ts`, produced by Task 7).

- [ ] **Step 1:** Failing tests per adapter using recorded JSON fixtures and mocked fetch: HN via its public Algolia search API; GitHub via its documented repository search API with GITHUB_TOKEN; Reddit via its registered Data API using application-only OAuth plus the configured accurate User-Agent. Assert mapping, snippet sanitization, credential isolation, and that Reddit returns `[]` plus one `source_disabled` event when credentials or founder approval are absent. Never call unauthenticated `reddit.com/search.json`.
- [ ] **Step 2:** Implement HN and GitHub to green. Implement Reddit behind an explicit configuration gate only after current official terms, credentials, approved usage, and retention are recorded in docs/STATE.md.
- [ ] **Step 3:** `webSearch.ts`: OpenAI Responses API with the web search tool, prompt asks for recent discussions, complaints, and competitors for the idea; map returned citations to RawEvidence. Test with a mocked OpenAI client asserting the mapping.
- [ ] **Step 4:** `producthunt.ts`: GraphQL posts search; if `PRODUCT_HUNT_TOKEN` unset, return `[]` and emit `source_disabled` once per trial. Fixture test for the mapping.
- [ ] **Step 5:** `gatherAll` test: one adapter rejecting still resolves with the others' results and emits `source_failed`.
- [ ] **Step 6:** Update `docs/references/SOURCE_COMPLIANCE.md` with the exact verified endpoints, official terms review dates, credential scopes, TTLs, retention obligations, and final enabled or disabled state. Ensure disabled sources are absent from product claims.
- [ ] **Step 7:** All green. Commit: `feat: evidence adapters with caching and graceful failure`.

### Task 7: Idea normalization

**Files:**
- Create: `lib/verdict/normalize.ts`, `lib/github/readme.ts`, tests.

**Interfaces:**
- Consumes: `cachedFetch`, OpenAI client.
- Produces: `normalizeIdea(input: { ideaText?: string; repoUrl?: string }): Promise<NormalizedIdea>`; `fetchRepoBrief(repoUrl): Promise<{ name, description, readmeExcerpt }>` (README truncated to 4000 chars, sanitized).

- [ ] **Step 1:** Failing test: repoUrl parsing (`https://github.com/owner/name` and `owner/name` forms), README fetch mocked, and a mocked structured LLM call returning a NormalizedIdea; assert zod-parse of the result and that repo text goes through sanitization before prompting.
- [ ] **Step 2:** Implement with one structured-output call (zod schema for NormalizedIdea via the SDK's structured outputs helper), model from `OPENAI_MODEL_SCORING`.
- [ ] **Step 3:** Green, commit: `feat: idea normalization from text or repo`.

### Task 8: Classification with embeddings

**Files:**
- Create: `lib/verdict/classify.ts`, `lib/embeddings.ts`, tests.

**Interfaces:**
- Consumes: RawEvidence, the shared OpenAI SDK wrapper, and ApiCache storage through a dedicated embedding-cache adapter.
- Produces: `embedWithCache(texts: string[]): Promise<number[][]>` (keyed by embedding model plus content sha256, TTL 720h, 1536 dimensions, order-preserving); `classifyEvidence(idea, items, emit): Promise<{ items: ClassifiedEvidence[]; failedBatches: number }>` via one structured LLM call per batch of at most 25, preserving order within successful batches and emitting explicit reduced-coverage events for failures.

- [ ] **Step 1:** Failing embedding-cache tests cover model plus content hash in the key, hit and miss behavior, 720-hour expiry, 1536-dimension validation, batching, and input-output order. Classification tests cover batch boundaries at 25, stable order, strict zod validation, one repair retry, and explicit `classification_batch_failed` events. One failed batch may reduce coverage; all batches failing must fail CLASSIFYING with an actionable error rather than silently dropping evidence.
- [ ] **Step 2:** Implement; embeddings use the dedicated cache path described in docs/ARCHITECTURE.md, while structured Responses calls are not put in the general HTTP cache. Preserve failure metadata for the pipeline and persist no evidence rows here (the pipeline persists successful classifications).
- [ ] **Step 3:** Green, commit: `feat: evidence classification and embeddings`.

### Task 9: Knowledge brain corpus, ingest, retrieval

**Files:**
- Create: 12 files in `content/brain/` per the outline in docs/VALIDATION_FRAMEWORK.md, `scripts/ingest-brain.ts`, `lib/brain/retrieve.ts`, `app/api/knowledge/search/route.ts`, tests for retrieval mapping.

**Interfaces:**
- Produces: `retrieveKnowledge(query: string, tags?: Dimension[], k = 6): Promise<Array<{ content, sourceDoc, headingIndex, tags, similarity }>>` using the pgvector cosine query from docs/ARCHITECTURE.md; rate-limited `GET /api/knowledge/search?q=&tags=&limit=` returning `{ passages }` per tool 12's contract.

- [ ] **Step 1:** Write the 12 corpus files. ORIGINAL writing, 300 to 700 words each, frontmatter `tags:` as listed. Voice: confident practitioner, concrete heuristics, no fluff, no em dashes.
- [ ] **Step 2:** Install the exact frontmatter parser dependency. `ingest-brain.ts`: parse frontmatter, chunk by `##` headings, assign a stable zero-based `headingIndex`, embed, and upsert by the schema's unique `(sourceDoc, headingIndex)` key. Re-running ingestion must update existing chunks without duplication. Run it against the dev DB.
- [ ] **Step 3:** Retrieval test: with 3 seeded chunks and a mocked embedder, tag filter and k limit behave; route validates `q` (max 200), unique dimension tags (max 6), and limit (1 to 10) with strict zod schemas. Test its bounded public rate limit.
- [ ] **Step 4:** Green, run ingest on the Render DB after Gate B is complete. Commit: `feat: marketing brain corpus, ingest, retrieval`.

### Task 10: Scoring and verdict composition (TDD)

**Files:**
- Create: `lib/verdict/score.ts`, `lib/verdict/compose.ts`, `lib/verdict/weights.ts`, fixture evidence set in `lib/verdict/__fixtures__/`, tests.

**Interfaces:**
- Consumes: `retrieveKnowledge`, classified evidence, `wrapEvidence`.
- Produces: `scoreDimension(idea, dimension, evidence, knowledge): Promise<{ score: number; rationale: string; evidenceIds: string[] }>` (structured output, enforces the rubric caps from docs/VALIDATION_FRAMEWORK.md in code: fewer than 2 evidence items caps score at 45); `composeVerdict(scores, weights): { compositeScore, verdict, pivotDirection, nextStep }` implementing thresholds 70/40, a concrete strongest-dimension pivot sentence only for PIVOT, and the structured next-step selection rules; `DEFAULT_WEIGHTS` = {PROBLEM_SEVERITY:20, DEMAND_SIGNALS:20, COMPETITION:15, MONETIZATION:20, DISTRIBUTION:15, BUILD_COST:10}; `validateWeights(w): boolean` (six keys, non-negative, sum 100).

- [ ] **Step 1:** Failing tests for pure logic first: composite weighting math, thresholds at exactly 70 and 40 and 39, PIVOT requires one concrete pivotDirection while BUILD and KILL return null, evidence-count cap, structured next-step selection table cases (one per catalog row), weight validation.
- [ ] **Step 2:** Implement compose + weights to green.
- [ ] **Step 3:** scoreDimension with mocked OpenAI: prompt contains the dimension definition, wrapped evidence with PINNED marked as human-relevant but never more credible, REJECTED excluded upstream, and retrieved knowledge. Zod validates the response, then code rejects or retries evidenceIds and inline `[ev:id]` citations outside the supplied set and enforces the required citation count. Allow one repair retry.
- [ ] **Step 4:** Green. Commit: `feat: dimension scoring and verdict composition`.

### Task 11: Real pipeline and trial API routes

**Files:**
- Modify: `worker/pipeline.ts` (replace stub with the five stages from docs/ARCHITECTURE.md).
- Modify: `lib/access.ts` to resolve Auth.js users when available while preserving anonymous capability behavior.
- Create: `lib/csrf.ts`, `lib/ratelimit.ts`, `app/judge/page.tsx`, `app/api/judge-access/route.ts`, API routes: `app/api/trials/route.ts` (POST), `app/api/trials/[id]/{status,evidence,verdict,next-step}/route.ts`, `app/api/trials/[id]/{refine,deep-scan-requests}/route.ts`, `app/api/trials/compare/route.ts`, `app/api/trials/[id]/evidence/[evidenceId]/route.ts` (PATCH pin/reject), `app/api/trials/[id]/weights/route.ts` (PUT), tests for access, rate limiting, pipeline revisions, and route validation.

**Interfaces:**
- Consumes: everything from Tasks 4 to 10.
- Produces: every endpoint exactly as specified per tool in docs/WEBMCP_TOOLS.md (paths, payloads, error shapes). Plus UI-only endpoints: PATCH evidence `{ humanState: "PINNED"|"REJECTED"|"NEUTRAL" }` and PUT weights `{ weights }`, both emitting TrialEvents, creating a revisioned RESCORE PipelineRun, and returning `{ pipelineRevision }` so the dashboard can reopen SSE. `resolvePrincipal()` creates or resolves the secure anonymous capability or Auth.js user, and `requireTrialAccess()` makes unknown and foreign IDs indistinguishable. `checkRateLimit(ipHash)` uses an atomic RateLimitHit upsert. `POST /api/judge-access` exchanges a form-only code for the narrowly scoped signed bypass cookie described in docs/ARCHITECTURE.md; no URL query accepts the code.

- [ ] **Step 1:** Write failing security tests first: anonymous capability A cannot read or mutate capability B's trial; a run ID, IP hash, and judge cookie alone grant no access; failed judge exchange is rate limited; the judge cookie bypasses only trial-creation limits; the RateLimitHit increment is atomic. Implement access, CSRF, judge exchange, and rate limiting to green.
- [ ] **Step 2:** Implement pipeline stages with leased, revisioned PipelineRun claims and deterministic event/evidence upserts. Deep scans re-run GATHERING for one dimension with expanded queries. A stale revision becomes SUPERSEDED and cannot overwrite a newer result.
- [ ] **Step 3:** Implement all routes, zod-validating strict inputs against docs/WEBMCP_TOOLS.md and returning its exact error shapes (429 rate_limited, 409 not_complete, 401 not_signed_in placeholder until Task 17, 404 not_found for unknown or foreign trials). Deep-scan requests create persistent Approval rows only.
- [ ] **Step 4:** Route tests (vitest + direct handler invocation): validation rejects bad payloads; ownership checks cover every read and mutation; duplicate re-score triggers do not run concurrently; happy paths against the dev DB cover create/status/evidence.
- [ ] **Step 5:** HUMAN GATE: close Gate A before any public persistence and Gate B before any real OpenAI request. End-to-end smoke locally with founder-approved data: POST a real trial with a real idea, watch worker complete it, GET verdict. Fix until one clean run. Deploy, run one real trial on Render only after both gates are closed. Commit: `feat: full validation pipeline and trial api`.

### Task 12: WebMCP registry and core tools

**Files:**
- Create: `lib/webmcp/registry.ts`, `lib/webmcp/tool-result.ts`, `lib/webmcp/tools/` (one file per tool, tools 1 to 8 + 12), `components/webmcp-provider.tsx`, `components/agent-banner.tsx`.
- Modify: `app/layout.tsx` (mount provider).

**Interfaces:**
- Consumes: the API routes from Task 11.
- Produces: `getModelContext()` (feature-detect per docs/WEBMCP_TOOLS.md), `toToolResult(obj)` (dual format), `registerAllTools(ctx: AppContextSnapshot)` and `publishContext(snapshot)` where `type AppContextSnapshot = { currentTrialId?: string; status?: string; compositeScore?: number|null; verdict?: string|null; pendingApprovals: Array<{approvalId: string; kind: string; state: "PENDING_HUMAN_APPROVAL"; dimension?: string}>; humanActions: Array<{kind: string; at: string; [k: string]: unknown}> }`.

- [ ] **Step 1:** FIRST verify the live API shape in Chrome 149+ with the flag: open any page, inspect `navigator.modelContext` in DevTools (Application panel has a WebMCP section per https://developer.chrome.com/docs/devtools/application/webmcp ). Record findings in docs/STATE.md.
- [ ] **Step 2:** Implement registry + toToolResult exactly per docs/WEBMCP_TOOLS.md. Each tool file exports `{ name, description, inputSchema, execute }`; execute calls the API route with fetch and returns `toToolResult(json)`, passing API error JSON through as the result so agents can read it.
- [ ] **Step 3:** Provider: registers tools on mount, re-publishes context on a `verdiqt:context` custom window event; dashboard dispatches that event on every state change. Banner per docs/UI_DESIGN.md when no modelContext.
- [ ] **Step 4:** Unit-test tool schemas: every inputSchema is valid JSON Schema (ajv compile in a vitest test) and matches the zod validators' accepted shapes for the happy path.
- [ ] **Step 5:** On the deployed URL, confirm discovery, dual-format results, `start_validation`, and page context in both Chrome with the flag and ChatGPT's in-app browser. Record any client-specific compatibility adjustment in docs/STATE.md. Commit only after both pass: `feat: webmcp registry with core tools and page context`.

### Task 13: Trial dashboard

**Files:**
- Create: `app/trial/[id]/page.tsx`, `components/trial/{evidence-stream,evidence-card,status-header,weights-popover}.tsx`, `lib/hooks/use-trial-stream.ts`.

**Interfaces:**
- Consumes: SSE endpoint, trial APIs, Motion.
- Produces: the dashboard per docs/UI_DESIGN.md screen 2 (minus verdict panel and dock, next tasks). `useTrialStream(trialId)` returns `{ status, evidence, events, reconnectForRevision }`, merges initial fetch plus SSE by event id, resumes transient failures with Last-Event-ID, closes on the terminal revision event, and reopens only when a mutation or approved action reports a newer pipeline revision.

- [ ] **Step 1:** Build `useTrialStream`: resume transient errors with Last-Event-ID and backoff, merge by id, call `.close()` on the COMPLETE or FAILED event for the current revision, and use `reconnectForRevision` only after a pin, rejection, weight change, or approval response reports a newer revision.
- [ ] **Step 2:** Build the screen: status header with stage pill, evidence stream with staggered Motion entrances, cards with source icon, dimension chip, strength dots, pin and reject buttons calling the PATCH route optimistically.
- [ ] **Step 3:** Weights popover: six sliders, live sum indicator, save via PUT, triggers re-score; disabled while a run is active.
- [ ] **Step 4:** Loading skeletons and empty states with copy. Manual test with a live trial. Commit: `feat: live trial dashboard`.

### Task 14: Agent dock and approval gates

**Files:**
- Create: `components/agent-dock/{dock,activity-feed,approval-card}.tsx`, `app/api/approvals/route.ts` (GET), `app/api/approvals/[approvalId]/approve/route.ts` (POST), `app/api/approvals/[approvalId]/reject/route.ts` (POST), `app/api/trials/[id]/agent-events/route.ts` (POST).

**Interfaces:**
- Consumes: TrialEvents (agent_tool_call, deep_scan_requested, rank requests), Motion springs per docs/UI_DESIGN.md.
- Produces: the dock component mounted on trial and portfolio pages; page-owned approval controls atomically transition persistent Approval rows, enqueue the gated work exactly once, and emit `human_approved` or `human_denied`; a deep-scan approval response includes the new `pipelineRevision` for SSE reopening; context re-publishes on every human action.

- [ ] **Step 1:** Tool executes also POST a lightweight `agent_tool_call` event (fire-and-forget) so the feed shows agent activity with friendly labels ("Agent requested evidence for MONETIZATION").
- [ ] **Step 2:** Build dock states (collapsed with unread badge, open 360x480, expanded 520) with the specified springs; approval cards with Approve/Deny, keyboard reachable.
- [ ] **Step 3:** Wire approvals API: list only the current owner's records; approve and reject require owner access, an unexpired PENDING state, same-origin checks, and the signed CSRF token bound to that principal. A conditional transition makes duplicate clicks idempotent. Only approval enqueues work; rejection emits `human_denied` and starts nothing.
- [ ] **Step 4:** On the deployed URL, run the full loop in both Chrome and ChatGPT's in-app browser: agent asks for a deep scan, the human approves, the scan runs exactly once, and the agent reads new evidence. Commit: `feat: agent dock with approval gates`.

### Task 15: Verdict experience

**Files:**
- Create: `components/verdict/{panel,reveal,dimension-accordion,next-step-card,transcript}.tsx`, `components/trial/refine-dialog.tsx`, `app/trial/compare/page.tsx`, `components/compare/{comparison-table,comparison-radars}.tsx`, and verified Bklit chart components via registry add.

**Interfaces:**
- Consumes: verdict API, Bklit (the provisional radar, gauge, bar, and line identifiers in `uitools.md`, verified against the live Bklit registry before installation), KokonutUI ticker.
- Produces: the verdict panel and five-step reveal choreography from docs/UI_DESIGN.md, transcript tab from TrialEvents, evidence-by-source bar chart, expanded-dock evidence-arrival line chart, human refine control, and the owned two-to-five-trial compare screen with radars plus an accessible data table.

- [ ] **Step 1:** Install and theme the Bklit charts with token colors.
- [ ] **Step 2:** Build the reveal sequence as `useVerdictReveal` (Motion timeline, skippable, reduced-motion collapses to fades). Gauge + ticker, radar, stamp drop, next-step slide.
- [ ] **Step 3:** Dimension accordions render rationales with `[ev:id]` citations linkified to scroll to the evidence card. Add the Bklit evidence-by-source bar and expanded-dock evidence-arrival line, each with an equivalent textual summary for accessibility.
- [ ] **Step 4:** Build the transcript tab and a refine dialog that calls the linked-trial endpoint without replacing the parent.
- [ ] **Step 5:** Build `/trial/compare` for two to five owner-accessible completed trials. Render side-by-side Bklit radars, the six-dimension table, composite/verdict values, strongest-per-dimension result, loading, invalid, foreign-ID, and incomplete states.
- [ ] **Step 6:** Manual run-through: refine one completed idea, complete the pivot, compare both through the human UI and `compare_ideas`, and record demo b-roll. Commit: `feat: verdict, refine, compare, and transcript`.

### Task 16: Landing page and hero

**Files:**
- Existing foundation: `app/page.tsx`, `components/landing/{landing-hero,challenge-supporters,trial-demo}.tsx`.
- Modify after Task 11: connect intake to the real trial API and dashboard route.

**Interfaces:**
- Consumes: Motion for DOM choreography. anime.js and Three.js remain optional for one isolated dynamically imported scene after the `uitools.md` Gate 3 verification.
- Produces: landing per docs/UI_DESIGN.md screen 1; after Task 11, input submits POST /api/trials and routes to the dashboard.

- [x] **Step 1:** Build the original hard-edged editorial landing foundation with a repository-first local preview, CSS halftone gavel, official challenge supporter attribution, and interactive three-stage proceeding. Validate at 1440 x 1000, 375 x 812, and reduced motion in Playwright.
- [ ] **Step 2:** After Task 11, connect the intake to `POST /api/trials`, preserve local validation and accessibility, and route successful creation to the dashboard. Review copy with the em dash `rg` check.
- [ ] **Optional Step 3:** Only if the founder requests an isolated 3D moment and the bundle budget permits it, complete `uitools.md` Gate 3, install exact anime.js and Three.js versions, and retain the current CSS halftone experience as the fallback.
- [ ] **Step 4:** Run Lighthouse on the deployed landing: performance 85+ and hero chunk under 300 KB gzipped. Commit the connected final landing.

### Task 17: GitHub OAuth and portfolio

**Files:**
- Create: `auth.ts` (Auth.js config, GitHub provider, scope `read:user`), `app/api/auth/[...nextauth]/route.ts`, `app/api/portfolio/{repos,analyze,rank}/route.ts`, `app/portfolio/page.tsx`, `components/portfolio/{repo-list,ranking-heatmap,winner-card}.tsx`, tools 9 to 11 in `lib/webmcp/tools/`.

**Interfaces:**
- Consumes: GitHub REST (`/users/{login}/repos?sort=pushed&per_page=30`, public repos only), trial creation from Task 11, Bklit heatmap.
- Produces: endpoints and tools exactly per docs/WEBMCP_TOOLS.md tools 9 to 11; ranking = completed trials sorted by compositeScore, capped at max_repos, gated by approval like deep scans.

- [ ] **Step 1:** HUMAN GATE: Gate A is closed and the founder creates the GitHub OAuth app under NostroCEO (callback `<APP_URL>/api/auth/callback/github`), sets AUTH_GITHUB_ID/SECRET/AUTH_SECRET on Render, and confirms `GITHUB_OAUTH_ENABLED=true` only after the privacy notice and unlink behavior are live.
- [ ] **Step 2:** Auth.js JWT wiring without a database adapter: the GitHub callback upserts the custom User by githubLogin, stores only User.id and the server-readable provider token in the protected JWT, exposes no token to the client, transfers the current anonymous session's trials and approvals transactionally, and rotates the anonymous capability. Build the portfolio page sign-in state.
- [ ] **Step 3:** Repos route (cachedFetch 1h), analyze route (creates or returns the existing PortfolioScan + Trial for that public repo), and rank route with persistent approval gate. Repeated `rank_portfolio` calls return current approval state and, once complete, the ranking payload so the agent can poll the same tool without a thirteenth tool.
- [ ] **Step 4:** UI: repo list with analyze buttons and already_analyzed badges, heatmap, winner card (KokonutUI spotlight), all streaming states handled.
- [ ] **Step 5:** Register tools 9 to 11 and verify the signed-out 401 shape. On the deployed URL, run the full public-repository analyze and approval-gated ranking sweep in both Chrome and ChatGPT's in-app browser on the NostroCEO account. Commit: `feat: github portfolio sweep`.

### Task 18: Hardening, evals, demo seed

**Files:**
- Create: `scripts/seed-demo.ts`, `middleware.ts` (security headers), eval notes appended to docs/SUBMISSION_CHECKLIST.md.
- Modify: anything the pass flags.

- [ ] **Step 1:** Security pass against docs/WEBMCP_TOOLS.md gates: confirm every route uses strict zod validation; audit direct `fetch(` calls with `rg` and allow only cached third-party adapters, same-origin client API calls, and the documented OpenAI SDK wrapper; confirm no secrets reach the client; verify cross-session reads fail; verify approval execution requires owner access, same-origin checks, and CSRF; verify duplicate jobs and clicks execute once. Re-check every source and dependency in `docs/references/SOURCE_COMPLIANCE.md` against current official terms, credentials, retention, and enabled state.
- [ ] **Step 2:** `seed-demo.ts`: seeds the demo trial from docs/DEMO_SCRIPT.md with warm cache so GATHERING streams fast on camera.
- [ ] **Step 3:** Run the eval checklist (docs/WEBMCP_TOOLS.md) in Chrome + ChatGPT browser on the LIVE URL; log every failure as a task, fix, re-run until clean. Record results in docs/SUBMISSION_CHECKLIST.md.
- [ ] **Optional cron:** Only if the core loop, target-client evals, submission packet, and dated schedule are green, create `scripts/cron-daily.ts`, add `cron:daily`, add the Render Cron service, test cache cleanup, approval expiry, and changed-content ingestion, then verify one manual execution. Otherwise record cron as cut.
- [ ] **Step 4:** Full-repo quality gates: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, repo-wide em dash check, and `.env.example` audit. Run Lighthouse, measure the hero chunk under 300 KB gzipped, verify WebGL and reduced-motion fallbacks, test the dashboard and dock at 375 px, audit WCAG AA token contrast and visible focus, and keyboard-traverse all core controls. Use Playwright visual validation at the affected desktop viewport and 375 px for every UI change. Commit: `chore: hardening and eval pass`.

### Task 19: Ship and submit

- [ ] **Step 1:** Repo public under NostroCEO with MIT license visible in About; verify `rg -n 'modelContext\.registerTool\('` finds the real registry call; test README instructions via a fresh clone.
- [ ] **Step 2:** Run `$prepare-submission` against the live Devpost form, create `devpost-submission.md`, reconcile the accepted draft into `docs/submission/`, and refresh every official field and character limit. Nothing is sent during this step.
- [ ] **Step 3:** Record the video per docs/DEMO_SCRIPT.md (two takes minimum), upload public to YouTube, and add final screenshots and testing notes to the draft.
- [ ] **Step 4:** Complete every unchecked item in docs/SUBMISSION_CHECKLIST.md; founder submits on Devpost September 2; confirm received.
- [ ] **Step 5:** Freeze the submitted Devpost entry, repository, and live deployment: no force pushes or risky deploys until winners are announced on or around September 23. Continue only in a separate fork. Update docs/STATE.md: SUBMITTED.

---

## Self-review notes (kept for the record)

Spec coverage: every spec section maps to tasks (product/hero flow: 11 to 17; tools: 12 and 17; framework: 9 and 10; architecture: 2 to 4; UI: 13 to 16; security: 5, 11, 18; timeline/submission: 19). Type names are consistent across tasks (NormalizedIdea, RawEvidence, AppContextSnapshot, cachedFetch, toToolResult). Founder and live-package verification gates are explicit; implementation contracts referenced by name live in docs/WEBMCP_TOOLS.md and docs/ARCHITECTURE.md, which are part of this plan's context.
