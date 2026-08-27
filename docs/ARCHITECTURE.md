# Verdiqt Architecture

This document is the single source of truth for system structure. If code and this document disagree, fix one of them in the same commit.

## System overview

```
                       ChatGPT in-app browser / Chrome 149+ (WebMCP)
                                        |
                              +---------v----------+
                              |  Next.js web app   |  Render Web Service
                              |  UI + API routes   |  (pooled DB conn)
                              |  WebMCP registry   |
                              |  SSE stream        |
                              +----+----------+----+
                                   |          |
                        enqueue via pg-boss   | Prisma
                                   |          |
                              +----v----------v----+
                              |  Postgres + pgvector|  Render Postgres
                              |  data + queue + cache|
                              +----+----------------+
                                   |
                              +----v----------------+
                              |  Worker (Node)      |  Render Background Worker
                              |  validation pipeline|  (direct DB conn)
                              +----+----------------+
                                   |
              +---------+----------+-----------+-----------+
              |         |          |           |           |
          OpenAI     Reddit     HN Algolia  Product     GitHub
          Responses  Data API   REST API    Hunt API    REST API
          + embeds   OAuth      (public)    (optional)
                     (optional)
```

## Services (all on Render, progressively defined in render.yaml)

| Service | Type | Start command | Notes |
|---|---|---|---|
| verdiqt-web | Web Service | `pnpm start` | Next.js production server |
| verdiqt-worker | Background Worker | `pnpm worker` | Added in Task 4; pg-boss consumer, no request timeouts |
| verdiqt-cron | Optional Cron Job | `pnpm cron:daily` | Cut-first scope. Enable only after the core hero flow is green; daily 04:00 UTC cache cleanup + re-embed |
| verdiqt-db | Postgres | n/a | pgvector extension enabled |

The Task 2 preview Blueprint defines the web service and database only. Render Blueprints require at least one instance for a declared service, and background workers have no free instance type, so declaring the worker before its Task 4 entrypoint exists would create a paid failing service. The initial preview uses free web and Postgres instances with public trial creation and GitHub OAuth disabled. Because free Render Postgres does not provide managed PgBouncer, `DATABASE_URL` and `DIRECT_DATABASE_URL` initially use the same direct internal connection. Before public workloads, the founder must approve a paid database, enable managed PgBouncer, map `DATABASE_URL` to `connectionPoolString`, and keep `DIRECT_DATABASE_URL` on `connectionString`.

## Repository layout

```
/                      Next.js app root (single package)
  app/                 App Router pages and API routes
    api/trials/        create, status, evidence, verdict, refine, compare, next-step
    api/trials/[id]/stream/  SSE endpoint
    api/approvals/     list plus human-only approve and reject transitions
    api/judge-access/  one-time judge-code exchange; never accepts codes in URLs
    api/portfolio/     repos, analyze, rank
    api/knowledge/     search
    api/auth/          Auth.js handlers
    (site)/            landing page
    trial/[id]/        trial dashboard
    portfolio/         portfolio page
  components/          UI components (shadcn/ui base, dock, cards, charts)
  lib/
    webmcp/            registry.ts + tools/*.ts (client-side tool definitions)
    verdict/           normalize.ts, classify.ts, score.ts, compose.ts
    evidence/          sources/*.ts adapters + cache.ts
    brain/             ingest.ts, retrieve.ts
    db.ts              Prisma client (pooled + direct helpers)
    queue.ts           pg-boss setup
    ratelimit.ts       per-IP trial limits + judge bypass
    sanitize.ts        untrusted-content delimiting for prompts
  worker/
    index.ts           pg-boss consumer entry
    pipeline.ts        stage orchestration
  content/brain/       marketing knowledge corpus (original writing, md files)
  prisma/
    schema.prisma
    migrations/
  scripts/
    ingest-brain.ts    chunk + embed corpus
    seed-demo.ts       seed demo trials for judges
    cron-daily.ts
  docs/                this documentation kit
```

## Data model (Prisma)

Copy this schema verbatim into `prisma/schema.prisma` (Task 3 of docs/PLAN.md).

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")        // pooled, used by web
  directUrl  = env("DIRECT_DATABASE_URL") // direct, used by worker + migrations
  extensions = [vector]
}

enum TrialStatus {
  QUEUED
  NORMALIZING
  GATHERING
  CLASSIFYING
  SCORING
  COMPLETE
  FAILED
}

enum VerdictKind {
  BUILD
  PIVOT
  KILL
}

enum Dimension {
  PROBLEM_SEVERITY
  DEMAND_SIGNALS
  COMPETITION
  MONETIZATION
  DISTRIBUTION
  BUILD_COST
}

enum EvidenceSource {
  WEB_SEARCH
  REDDIT
  HACKERNEWS
  PRODUCT_HUNT
  GITHUB
}

enum HumanState {
  NEUTRAL
  PINNED
  REJECTED
}

enum Actor {
  HUMAN
  AGENT
  SYSTEM
}

enum ApprovalKind {
  DEEP_SCAN
  PORTFOLIO_RANK
}

enum ApprovalState {
  PENDING_HUMAN_APPROVAL
  APPROVED
  RUNNING
  COMPLETED
  REJECTED
  FAILED
  EXPIRED
}

enum PipelineRunKind {
  FULL
  RESCORE
  DEEP_SCAN
}

enum PipelineRunStatus {
  QUEUED
  RUNNING
  COMPLETE
  FAILED
  SUPERSEDED
}

model User {
  id             String          @id @default(cuid())
  githubLogin    String          @unique
  name           String?
  avatarUrl      String?
  createdAt      DateTime        @default(now())
  trials         Trial[]
  approvals      Approval[]
  portfolioScans PortfolioScan[]
}

model AnonymousSession {
  id             String     @id @default(cuid())
  capabilityHash String     @unique // sha256 of the random cookie capability; raw token is never stored
  createdAt      DateTime   @default(now())
  lastSeenAt     DateTime   @default(now()) @updatedAt
  expiresAt      DateTime
  trials         Trial[]
  approvals      Approval[]

  @@index([expiresAt])
}

model Trial {
  id                 String            @id @default(cuid())
  userId             String?
  user               User?             @relation(fields: [userId], references: [id])
  anonymousSessionId String?
  anonymousSession   AnonymousSession? @relation(fields: [anonymousSessionId], references: [id])
  ideaText           String?
  repoUrl            String?
  parentTrialId      String?            // set by refine_idea, links pivots
  parentTrial        Trial?             @relation("TrialPivots", fields: [parentTrialId], references: [id], onDelete: SetNull)
  pivots             Trial[]            @relation("TrialPivots")
  status             TrialStatus       @default(QUEUED)
  weights            Json              // {PROBLEM_SEVERITY: 20, ...} percentages
  compositeScore     Int?
  verdict            VerdictKind?
  pivotDirection     String?            // required by application validation when verdict is PIVOT
  nextStep           Json?              // { action, why, how, effortHours }
  ipHash             String?            // rate-limiting signal only, never authorization
  pipelineRevision   Int                @default(1)
  completedRevision  Int                @default(0)
  createdAt          DateTime           @default(now())
  completedAt        DateTime?
  normalizedIdea     NormalizedIdea?
  evidence           Evidence[]
  scores             DimensionScore[]
  events             TrialEvent[]
  approvals          Approval[]
  pipelineRuns       PipelineRun[]
  portfolioScan      PortfolioScan?

  @@index([userId, createdAt])
  @@index([anonymousSessionId, createdAt])
}

model NormalizedIdea {
  id         String   @id @default(cuid())
  trialId    String   @unique
  trial      Trial    @relation(fields: [trialId], references: [id], onDelete: Cascade)
  oneLiner   String
  audience   String
  problem    String
  category   String
  keywords   String[]
  sourceHash String   // sha256 of canonical idea input or fetched repository source
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Evidence {
  id         String                       @id @default(cuid())
  trialId    String
  trial      Trial                        @relation(fields: [trialId], references: [id], onDelete: Cascade)
  source     EvidenceSource
  url        String
  title      String
  snippet    String                       // sanitized, max 500 chars
  dimension  Dimension
  strength   Int                          // 1..5, LLM-assigned
  humanState HumanState                   @default(NEUTRAL)
  fingerprint String                      // sha256 of source + canonical URL + normalized snippet
  embedding  Unsupported("vector(1536)")?
  createdAt  DateTime                     @default(now())

  @@index([trialId, dimension])
  @@unique([trialId, fingerprint])
}

model DimensionScore {
  id          String    @id @default(cuid())
  trialId     String
  trial       Trial     @relation(fields: [trialId], references: [id], onDelete: Cascade)
  dimension   Dimension
  score       Int       // 0..100
  rationale   String    // must reference evidence ids inline like [ev:abc123]
  evidenceIds String[]
  @@unique([trialId, dimension])
}

model TrialEvent {
  id            String       @id @default(cuid())
  trialId       String
  trial         Trial        @relation(fields: [trialId], references: [id], onDelete: Cascade)
  pipelineRunId String?
  pipelineRun   PipelineRun? @relation(fields: [pipelineRunId], references: [id], onDelete: Cascade)
  dedupeKey     String?      @unique // populated for retryable worker events
  actor         Actor
  kind          String       // e.g. stage_started, evidence_found, human_pinned, agent_tool_call
  payload       Json
  createdAt     DateTime     @default(now())

  @@index([trialId, createdAt])
}

model PipelineRun {
  id            String            @id @default(cuid())
  trialId       String
  trial         Trial             @relation(fields: [trialId], references: [id], onDelete: Cascade)
  revision      Int
  kind          PipelineRunKind
  deepDimension Dimension?
  jobKey        String            @unique // trial:<trialId>:revision:<revision>
  status        PipelineRunStatus @default(QUEUED)
  attempt       Int               @default(0)
  heartbeatAt   DateTime?
  leaseExpiresAt DateTime?
  errorCode     String?
  createdAt     DateTime          @default(now())
  startedAt     DateTime?
  completedAt   DateTime?
  events        TrialEvent[]

  @@unique([trialId, revision])
  @@index([status, createdAt])
  @@index([status, leaseExpiresAt])
}

model Approval {
  id                 String            @id @default(cuid())
  kind               ApprovalKind
  state              ApprovalState     @default(PENDING_HUMAN_APPROVAL)
  trialId            String?
  trial              Trial?            @relation(fields: [trialId], references: [id], onDelete: Cascade)
  userId             String?
  user               User?             @relation(fields: [userId], references: [id], onDelete: Cascade)
  anonymousSessionId String?
  anonymousSession   AnonymousSession? @relation(fields: [anonymousSessionId], references: [id], onDelete: Cascade)
  requestedBy        Actor              @default(AGENT)
  requestedRevision  Int?
  payload             Json               // validated kind-specific payload, never arbitrary executable input
  dedupeKey           String             @unique
  createdAt           DateTime           @default(now())
  expiresAt           DateTime
  decidedAt           DateTime?
  startedAt           DateTime?
  completedAt         DateTime?
  failureCode         String?

  @@index([trialId, state])
  @@index([userId, state])
  @@index([anonymousSessionId, state])
}

model KnowledgeChunk {
  id           String                       @id @default(cuid())
  sourceDoc    String                       // filename in content/brain
  headingIndex Int                          // zero-based deterministic heading/chunk position
  tags         String[]                     // e.g. ["MONETIZATION", "offer"]
  content      String
  contentHash  String                       // sha256 used by the embeddings cache
  embedding    Unsupported("vector(1536)")?
  updatedAt    DateTime                     @updatedAt

  @@unique([sourceDoc, headingIndex], name: "knowledge_chunk_source_heading")
}

model ApiCache {
  key       String   @id // sha256 of source + normalized query
  source    String
  payload   Json
  expiresAt DateTime

  @@index([expiresAt])
}

model PortfolioScan {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  repoFullName String
  trialId   String?  @unique
  trial     Trial?   @relation(fields: [trialId], references: [id], onDelete: SetNull)
  rank      Int?
  createdAt DateTime @default(now())

  @@unique([userId, repoFullName])
}

model RateLimitHit {
  id        String   @id @default(cuid())
  ipHash    String
  day       String   // YYYY-MM-DD UTC
  count     Int      @default(1)

  @@unique([ipHash, day])
}
```

pg-boss creates and manages its own tables in the `pgboss` schema on first start. Do not model them in Prisma.

The Task 3 migration must add database `CHECK` constraints that Prisma cannot express: every `Trial` has exactly one of `userId` and `anonymousSessionId`; every `Trial` has exactly one of `ideaText` and `repoUrl`; every `Approval` has exactly one of `userId` and `anonymousSessionId`; Evidence strength stays from 1 through 5; dimension and composite scores stay from 0 through 100 when present; and trial revisions satisfy `pipelineRevision >= 1` plus `0 <= completedRevision <= pipelineRevision`. A deep-scan approval must copy the target trial's owner. A portfolio-rank approval must have a `userId` and no anonymous owner. Route validation enforces the same rules before the database constraint is reached.

`KnowledgeChunk` ingestion assigns `headingIndex` deterministically within each source document and upserts on the named `sourceDoc + headingIndex` unique key. When content changes at that position, ingestion updates `content`, `contentHash`, `tags`, and the embedding instead of inserting a duplicate row. It deletes rows whose heading indexes no longer exist after a full document ingest.

Vector similarity queries use raw SQL through Prisma, for example:

```ts
const rows = await prisma.$queryRaw`
  SELECT id, "sourceDoc", "headingIndex", content, tags,
         1 - (embedding <=> ${vec}::vector) AS similarity
  FROM "KnowledgeChunk"
  ORDER BY embedding <=> ${vec}::vector
  LIMIT 6`;
```

## Identity, ownership, and capabilities

Auth.js v5 uses the JWT session strategy without a database adapter. The GitHub OAuth callback upserts the project's custom `User` row by `githubLogin`, then writes `User.id` into the encrypted, integrity-protected Auth.js JWT. The provider access token may be retained in that server-readable JWT for GitHub API calls, but the `session` callback exposes only `user.id`, `name`, and `avatarUrl` to client code. No GitHub token or Auth.js JWT is written to the custom `User` table, returned by an API route, or included in WebMCP context.

An unsigned-in browser receives a random 256-bit `verdiqt_anon` capability in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Only its SHA-256 hash is stored in `AnonymousSession`. Creating an anonymous trial creates or reuses that session, records `Trial.anonymousSessionId`, and extends a bounded expiry. On sign-in, the auth callback transfers that browser session's trials and pending approvals to the authenticated `User` in one transaction, then rotates and expires the anonymous capability.

Every trial, evidence, verdict, stream, mutation, and approval route calls the same authorization helper. Access requires either `auth().user.id === Trial.userId` or a capability-cookie hash matching `Trial.anonymousSession.capabilityHash`. A `run_id`, dashboard URL, IP hash, or judge cookie is never an authorization credential. Workers receive only durable database IDs from validated jobs and re-check that related records still exist before acting.

## Persistent approval ownership and routes

Approval requests are durable `Approval` rows, not transient `TrialEvent` payloads. `TrialEvent` mirrors each transition for SSE and agent context, while `Approval` remains authoritative. A deterministic `dedupeKey` includes owner, kind, target, `requestedRevision`, and action-defining payload fields such as dimension or maximum repository count. Display-only fields such as reason are excluded, so repeated agent calls return the existing pending approval rather than stacking cards.

Route responsibilities are intentionally split:

- `POST /api/trials/[id]/deep-scan-requests` validates trial ownership and creates a `DEEP_SCAN` approval only.
- `POST /api/portfolio/rank` requires an authenticated `User` and creates a `PORTFOLIO_RANK` approval only.
- `GET /api/approvals` lists approvals for the current authenticated user or anonymous capability, optionally filtered by `trialId` and state.
- `POST /api/approvals/[id]/approve` and `POST /api/approvals/[id]/reject` are page-owned form actions. They require the same owner, a valid same-origin CSRF token, an unexpired approval, and an explicit page interaction. They are not registered as WebMCP tools.
- The approve route atomically changes `PENDING_HUMAN_APPROVAL` to `APPROVED` with a conditional update. Exactly one successful transition creates the relevant `PipelineRun` or portfolio work request. Duplicate clicks return the existing state and do not enqueue twice.
- Only the worker changes `APPROVED` to `RUNNING`, then to `COMPLETED` or `FAILED`. Expiry cleanup changes untouched pending rows to `EXPIRED`.

Page context derives `pendingApprovals` from `Approval` rows and derives recent `humanActions` from `TrialEvent`. This keeps the visible approval card, API response, and agent-visible context consistent after reloads and across multiple tabs.

## Secure judge access

The judge code is a rate-limit accommodation, not authentication and not trial ownership. Judges enter it into a form on `/judge`; the form posts over HTTPS to `POST /api/judge-access`. The route applies same-origin CSRF protection, compares SHA-256 digests of the submitted value and `JUDGE_ACCESS_CODE` in constant time, and on success sets a signed, `HttpOnly`, `Secure`, `SameSite=Lax`, short-lived `verdiqt_judge` cookie containing only a scoped bypass claim and expiry.

Never accept the judge code in a URL query parameter, general API header, local storage, analytics event, or log. Never return it to client JavaScript after the form exchange. The judge cookie can bypass anonymous rate limits and nothing else: it cannot read another owner's trial, approve work, access GitHub data, or mutate portfolio state. Rotate the code after judging and rate-limit failed exchange attempts.

## Validation pipeline (worker/pipeline.ts)

One pg-boss job type uses payload `{ pipelineRunId: string }`. `PipelineRun` is the durable job ledger and outbox; the worker loads the trial, revision, kind, and optional deep dimension from that row rather than trusting duplicated job input. Trial creation starts at revision 1. Each material rerun trigger increments `Trial.pipelineRevision` and creates exactly one `(trialId, revision)` run in the same database transaction. The web process then sends pg-boss a job with `singletonKey = PipelineRun.jobKey`; a worker reconciliation loop periodically republishes stranded `QUEUED` rows, so a process crash between commit and enqueue cannot lose work.

The worker takes a Postgres advisory lock keyed by `trialId`, then conditionally claims a `QUEUED` run or reclaims a `RUNNING` run whose lease expired. Claiming increments `attempt` and sets a bounded `leaseExpiresAt`; long stages refresh `heartbeatAt` and the lease. A duplicate delivery exits successfully when another worker holds a live lease or the run is already `COMPLETE`, `FAILED`, or `SUPERSEDED`. Process death releases the advisory lock, and a pg-boss retry can safely reclaim the expired lease. Only one revision for a trial runs at a time. Before publishing status, scores, or a verdict, the worker compares the run revision with `Trial.pipelineRevision`; an older run becomes `SUPERSEDED` and cannot overwrite the latest requested result.

Stages run sequentially; each stage updates the current `Trial.status` and appends idempotent `TrialEvent` rows so the UI and agents see progress live.

1. NORMALIZING: build a `NormalizedIdea` from `ideaText`, or fetch the repo README + description + package.json via GitHub API when `repoUrl` is set. Persist `{ oneLiner, audience, problem, category, keywords: string[] }` plus `sourceHash` in the one-to-one `NormalizedIdea` row. A rerun skips normalization only when the stored source hash still matches the canonical current input.
2. GATHERING: run all enabled evidence adapters in parallel with `Promise.allSettled`. Each adapter checks ApiCache first (TTL per source, see docs/ARCHITECTURE.md table below). Failures of individual sources never fail the trial; they emit a `source_failed` TrialEvent.
3. CLASSIFYING: embed each evidence snippet, assign dimension + strength 1..5 with a single batched structured LLM call. Upsert Evidence by `(trialId, fingerprint)` so retries and reruns cannot duplicate it. Persist rows as they classify so SSE streams them incrementally.
4. SCORING: for each of the 6 dimensions, retrieve top knowledge chunks (pgvector) plus that dimension's evidence, excluding humanState REJECTED and flagging PINNED as human-vouched for relevance but never credibility. Then make one structured LLM call producing `{ score, rationale, evidenceIds }`. Code rejects any evidence id or inline citation that was not in the supplied non-rejected set, and enforces the citation-count rule from docs/VALIDATION_FRAMEWORK.md. Upsert by the existing `(trialId, dimension)` unique key.
5. COMPOSE: weighted composite from `Trial.weights`, verdict thresholds BUILD >= 70, PIVOT 40..69, KILL < 40, an explicit pivot direction when the verdict is PIVOT, plus exactly one structured `nextStep` chosen from the catalog in docs/VALIDATION_FRAMEWORK.md.

Worker events use a deterministic `dedupeKey` based on run, stage, kind, and entity. Re-scoring triggers (weight change, pin/reject, approved deep scan) create a new revision; stages NORMALIZING and GATHERING are skipped when persisted inputs are fresh unless a deep scan requests new evidence. Refining an idea creates a linked trial with its own revision-1 full run. Approval execution uses the same revision and job-key rules, so repeated calls, clicks, deliveries, and worker retries are safe.

## Cache and OpenAI call rules

`cachedFetch` applies to evidence adapters and other external HTTP data sources such as GitHub repository metadata. It normalizes the source and query into `ApiCache.key`, enforces the source TTL below, and sanitizes external text before it reaches prompts or tool results.

OpenAI Responses and embeddings calls use the official OpenAI SDK directly, with explicit timeouts, bounded SDK retries for transient failures, request IDs in server logs, and zod validation of structured output. Responses are not stored in the general HTTP cache. Embeddings use a separate `embedWithCache` path keyed by model plus content hash, then call the SDK on a miss; they do not pass through `cachedFetch`. A single structured-output repair retry is allowed after schema failure, and permanent API errors fail the affected stage with an actionable code.

Before the first paid OpenAI call, the founder must approve and `docs/STATE.md` must record exact model IDs, a per-trial maximum for calls and gathered items, request timeout and retry bounds, and an acceptable development and demo spend ceiling. Tests use mocked OpenAI clients. Until this gate is complete, implementation and local verification must not send paid API requests.

| Source | TTL |
|---|---|
| WEB_SEARCH | 24h |
| REDDIT | 12h |
| HACKERNEWS | 24h |
| PRODUCT_HUNT | 24h |
| GITHUB | 12h |
| Embeddings via `embedWithCache` (model + content hash) | 30 days |

## Live updates

`GET /api/trials/[id]/stream` is an owner-authorized route handler returning `text/event-stream`. It orders rows by `(createdAt, id)`, emits that pair as an encoded SSE `id`, and honors `Last-Event-ID` so transient reconnects have no gaps or duplicates. It polls every 1500 ms inside a ReadableStream and closes after the latest requested revision emits COMPLETE or FAILED and all events are flushed. The dashboard sees the terminal event and closes its EventSource to avoid a reconnect loop. Pin, reject, weight, and approval responses return the new `pipelineRevision`; the dashboard explicitly reopens the stream for that revision. WebMCP tools do not use SSE; agents poll `get_validation_status`.

## Retention and privacy launch gate

Public trial collection and GitHub OAuth remain disabled until the founder approves the collected data categories, retention duration, trial and account deletion behavior, OAuth unlink behavior, and the minimum public privacy notice. Before that approval, development uses local or synthetic data and any deployed preview must prevent public trial creation. Cache expiry and approval expiry may still run because neither silently deletes user-owned trials. The optional Reddit adapter has its own stricter terms and retention gate and stays disabled even after the general privacy gate unless separately approved.

## Hosting portability

Render remains the primary full-stack target because the persistent pg-boss worker requires a long-running process. The founder also has Vercel and Netlify available. A Vercel or Netlify deployment may host the Next.js web surface only if the worker and database remain on a compatible external service and the same-origin authentication, SSE, approval, and WebMCP paths are verified end to end. Do not replace the primary topology or add a ChatGPT Sites manifest without a documented architecture decision and a working compatibility test.

## Environment variables

| Var | Used by | Notes |
|---|---|---|
| DATABASE_URL | web | pooled connection string from Render |
| DIRECT_DATABASE_URL | worker, migrations | direct connection string |
| OPENAI_API_KEY | web, worker | |
| OPENAI_MODEL_SCORING | worker | required; founder selects and pins the current cost-efficient structured-output model before Task 7 |
| OPENAI_MODEL_WEB_SEARCH | worker | required before enabling the live web-search adapter; founder selects and pins it under Gate B |
| OPENAI_MODEL_DEEP | worker | required; founder selects and pins the deep-scan and verdict-composition model before Task 7 |
| OPENAI_EMBEDDINGS_MODEL | worker, scripts | default `text-embedding-3-small` (1536 dims, must match schema) |
| AUTH_SECRET | web | Auth.js JWT encryption/signing and namespaced judge-cookie signing |
| AUTH_GITHUB_ID / AUTH_GITHUB_SECRET | web | GitHub OAuth app (read-only scopes) |
| GITHUB_TOKEN | worker | server-side PAT for search + README fetch (higher rate limits) |
| PRODUCT_HUNT_TOKEN | worker | optional; adapter disables itself when missing |
| REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET | worker | optional application-only OAuth; adapter stays disabled until credentials and approved use are confirmed |
| REDDIT_USER_AGENT | worker | required with Reddit credentials; accurate app and contact identity per the current Data API terms |
| APP_URL | web | canonical URL |
| JUDGE_ACCESS_CODE | web | high-entropy secret accepted only by the `/judge` form exchange |
| RATE_LIMIT_TRIALS_PER_DAY | web | default 5 |
| PUBLIC_TRIALS_ENABLED | web | default `false`; may become `true` only after the public privacy launch gate closes |
| GITHUB_OAUTH_ENABLED | web | default `false`; may become `true` only after the privacy notice and OAuth unlink behavior are live |

## Non-negotiable constraints

- The web service never runs pipeline stages inline. Everything slow goes through pg-boss.
- Evidence and third-party data HTTP calls go through `cachedFetch`; OpenAI SDK calls follow the separate cache and retry rules above.
- Reddit is disabled by default. Enable its direct adapter only with registered OAuth access, an accurate User-Agent identity, and a founder-approved retention policy that satisfies the current Reddit Data API terms. Never fall back to anonymous JSON endpoints.
- All fetched web content is untrusted: run it through `lib/sanitize.ts` (strip HTML, cap length, wrap in delimiters) before it enters any prompt or tool response.
- All tool and API inputs are validated with zod before use.
- Every owner-scoped API route checks Auth.js user ownership or the anonymous capability. IP hashes, run IDs, and judge bypasses are not authorization.
- Approval creation and approval execution remain separate. No WebMCP tool or worker path can synthesize a human approval transition.
- Public knowledge search is protected by a bounded per-session or per-IP rate limit because each cache miss can create an embedding call.
- The app is fully functional without WebMCP (plain browser); agent features enhance, never gate.
