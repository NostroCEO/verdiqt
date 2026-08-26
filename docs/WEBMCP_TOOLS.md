# Verdiqt WebMCP Tool Registry

This is the complete contract for every WebMCP tool Verdiqt registers. Implement these exactly. The registry is the project's main judging surface (WebMCP Leverage criterion).

## Registration layer

File: `lib/webmcp/registry.ts` (client-side, loaded by a `WebMCPProvider` client component mounted in the root layout).

Before implementing, verify the current API surface against:
- https://developer.chrome.com/docs/ai/webmcp
- https://github.com/webmachinelearning/webmcp (explainer)

The registry must feature-detect both entry points and isolate any API drift in this one file:

```ts
type ModelContext = {
  registerTool: (tool: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>; // JSON Schema
    execute: (input: unknown) => Promise<unknown>;
  }) => unknown;
  provideContext?: (ctx: unknown) => unknown;
};

export function getModelContext(): ModelContext | null {
  const nav = navigator as unknown as { modelContext?: ModelContext };
  const doc = document as unknown as { modelContext?: ModelContext };
  return nav.modelContext ?? doc.modelContext ?? null;
}
```

Rules for every tool:

- Tool `execute` functions are thin: they call the same `/api/*` routes the UI uses, with `fetch`, and return the JSON result as a text content part. No business logic in the client.
- Tool fetches are same-origin with credentials included. The API resolves the current Auth.js user or anonymous capability cookie on every owner-scoped request. A `run_id` alone never grants access.
- Every tool result goes through a shared helper `toToolResult(result)` that returns BOTH representations OpenAI's MCP guidance expects (https://developers.openai.com/api/docs/mcp): `structuredContent` set to the result object, and `content: [{ type: "text", text: JSON.stringify(result) }]`. If the verified current WebMCP API expects a narrower shape, adapt inside this one helper only.
- Evidence objects in tool results always include their `url` field populated; ChatGPT builds citations only from non-empty url strings, and cited evidence is part of the product's credibility story.
- Tool descriptions are written for agents: verb-first, concrete, and they state preconditions (for example that `request_deep_scan` requires human approval in the page).
- When WebMCP is absent, the provider renders nothing and the site works normally; a small dismissible banner suggests opening the site in an agent-capable browser.

## Page context

After each meaningful state change (trial created, stage change, verdict ready, human action), the provider re-publishes page context via `provideContext` (when available) with this shape:

```json
{
  "app": "Verdiqt",
  "state": {
    "currentTrialId": "abc123",
    "status": "SCORING",
    "compositeScore": null,
    "verdict": null,
    "pendingApprovals": [{ "approvalId": "apr1", "kind": "deep_scan", "state": "PENDING_HUMAN_APPROVAL", "dimension": "MONETIZATION" }],
    "humanActions": [
      { "kind": "pinned_evidence", "evidenceId": "ev1", "at": "2026-08-28T10:00:00Z" },
      { "kind": "weights_changed", "weights": { "MONETIZATION": 30 }, "at": "..." }
    ]
  },
  "hint": "The human just pinned evidence ev1. Consider weighting it in your analysis."
}
```

The `pendingApprovals` list comes from persistent Approval rows and survives reloads. The `humanActions` log is capped at the last 10 actions. This context loop is what makes the collaboration two-way; do not cut it.

## Tools

All input schemas below are JSON Schema. Server-side, the matching API route validates the same shape with zod. Dimension enum everywhere: `PROBLEM_SEVERITY | DEMAND_SIGNALS | COMPETITION | MONETIZATION | DISTRIBUTION | BUILD_COST`.

### 1. start_validation

- Description: "Start a validation trial for a SaaS idea. Provide either idea_text describing the idea, or repo_url pointing to a public GitHub repository. Returns a run_id to poll with get_validation_status."
- Input: `{ "type": "object", "properties": { "idea_text": { "type": "string", "minLength": 1, "maxLength": 2000 }, "repo_url": { "type": "string", "format": "uri" } }, "oneOf": [{ "required": ["idea_text"], "not": { "required": ["repo_url"] } }, { "required": ["repo_url"], "not": { "required": ["idea_text"] } }], "additionalProperties": false }`
- Calls: `POST /api/trials` body `{ ideaText?, repoUrl? }`
- Returns: `{ run_id, status, dashboard_url }`
- Errors: 429 with `{ error: "rate_limited", retry_hint }` when the anonymous limit is hit.
- Ownership: signed-in trials belong to the Auth.js `User`; otherwise the route creates or reuses the browser's secure anonymous capability session. The response never puts that capability in `run_id` or `dashboard_url`.

### 2. get_validation_status

- Description: "Get the status and progress of a validation trial. Statuses: QUEUED, NORMALIZING, GATHERING, CLASSIFYING, SCORING, COMPLETE, FAILED."
- Input: `{ "type": "object", "properties": { "run_id": { "type": "string" } }, "required": ["run_id"], "additionalProperties": false }`
- Calls: `GET /api/trials/:id/status`
- Returns: `{ run_id, status, evidence_count, stages_done, latest_events: [...last 5 TrialEvents...] }`

### 3. get_evidence

- Description: "List evidence gathered for a trial. Optionally filter by dimension or source. Includes the human's pinned or rejected state per item."
- Input: `{ "type": "object", "properties": { "run_id": { "type": "string" }, "dimension": { "type": "string", "enum": ["PROBLEM_SEVERITY","DEMAND_SIGNALS","COMPETITION","MONETIZATION","DISTRIBUTION","BUILD_COST"] }, "source": { "type": "string", "enum": ["WEB_SEARCH","REDDIT","HACKERNEWS","PRODUCT_HUNT","GITHUB"] } }, "required": ["run_id"], "additionalProperties": false }`
- Calls: `GET /api/trials/:id/evidence?dimension=&source=`
- Returns: `{ evidence: [{ id, source, url, title, snippet, dimension, strength, human_state }] }`

### 4. request_deep_scan

- Description: "Request a deeper evidence scan for one dimension of a trial. This queues an approval card in the page UI; the human must click Approve before the scan runs. Poll get_validation_status to see when it completes."
- Input: `{ "type": "object", "properties": { "run_id": { "type": "string" }, "dimension": { "type": "string", "enum": ["PROBLEM_SEVERITY","DEMAND_SIGNALS","COMPETITION","MONETIZATION","DISTRIBUTION","BUILD_COST"] }, "reason": { "type": "string", "maxLength": 300 } }, "required": ["run_id", "dimension"], "additionalProperties": false }`
- Calls: `POST /api/trials/:id/deep-scan-requests`
- Returns: `{ approval_id, state: "PENDING_HUMAN_APPROVAL" }`
- The API creates a persistent Approval row plus a `deep_scan_requested` TrialEvent. A duplicate pending request for the same owner, trial revision, and dimension returns the same approval even when the display-only reason changes. The dock shows an approval card; only the page-owned approval route can approve it. Approval creates a revisioned `DEEP_SCAN` PipelineRun, and the worker records all later approval states.

### 5. get_verdict

- Description: "Get the full scored verdict for a completed trial: composite score, BUILD or PIVOT or KILL, six dimension scores with rationales and evidence citations, and the recommended next step."
- Input: `{ "type": "object", "properties": { "run_id": { "type": "string" } }, "required": ["run_id"], "additionalProperties": false }`
- Calls: `GET /api/trials/:id/verdict`
- Returns: `{ run_id, composite_score, verdict, pivot_direction, weights, dimensions: [{ dimension, score, rationale, evidence_ids }], next_step }`. `pivot_direction` is a concrete sentence for PIVOT and `null` for BUILD or KILL.
- Errors: 409 `{ error: "not_complete", status }` when the trial is still running.

### 6. refine_idea

- Description: "Re-run validation on a pivoted version of an existing idea. Creates a new linked trial so the two can be compared with compare_ideas."
- Input: `{ "type": "object", "properties": { "run_id": { "type": "string" }, "pivot_text": { "type": "string", "minLength": 1, "maxLength": 2000 } }, "required": ["run_id", "pivot_text"], "additionalProperties": false }`
- Calls: `POST /api/trials/:id/refine`
- Returns: `{ new_run_id, parent_run_id }`

### 7. compare_ideas

- Description: "Compare two or more completed trials side by side across all six dimensions."
- Input: `{ "type": "object", "properties": { "run_ids": { "type": "array", "items": { "type": "string" }, "minItems": 2, "maxItems": 5, "uniqueItems": true } }, "required": ["run_ids"], "additionalProperties": false }`
- Calls: `POST /api/trials/compare`
- Returns: `{ trials: [{ run_id, one_liner, composite_score, verdict, dimensions: {...} }], strongest_per_dimension: {...} }`

### 8. get_next_step

- Description: "Get the single recommended next validation action for a completed trial, chosen from Verdiqt's validation playbook."
- Input: `{ "type": "object", "properties": { "run_id": { "type": "string" } }, "required": ["run_id"], "additionalProperties": false }`
- Calls: `GET /api/trials/:id/next-step`
- Returns: `{ next_step: { action, why, how, effort_hours } }`

### 9. list_repos

- Description: "List the signed-in user's public GitHub repositories available for portfolio analysis. Requires the human to be signed in with GitHub on the page."
- Input: `{ "type": "object", "properties": {}, "additionalProperties": false }`
- Calls: `GET /api/portfolio/repos`
- Returns: `{ repos: [{ full_name, description, stars, pushed_at, already_analyzed }] }`
- Errors: 401 `{ error: "not_signed_in", hint: "Ask the human to sign in with GitHub on the page." }`

### 10. analyze_repo

- Description: "Start a validation trial from one of the signed-in user's repositories. Uses the repo's README and metadata to infer the idea."
- Input: `{ "type": "object", "properties": { "repo_full_name": { "type": "string", "minLength": 3, "maxLength": 200, "pattern": "^[^/\\s]+/[^/\\s]+$" } }, "required": ["repo_full_name"], "additionalProperties": false }`
- Calls: `POST /api/portfolio/analyze`
- Returns: `{ run_id, repo_full_name }`

### 11. rank_portfolio

- Description: "Rank all of the user's analyzed repositories by verdict score to find which project deserves attention. Queues an approval card the human must click, because it can start multiple trials."
- Input: `{ "type": "object", "properties": { "max_repos": { "type": "integer", "minimum": 1, "maximum": 10, "default": 5 } }, "additionalProperties": false }`
- Calls: `POST /api/portfolio/rank`
- Returns while waiting: `{ approval_id, state: "PENDING_HUMAN_APPROVAL" | "APPROVED" | "RUNNING" }`. Returns when finished: `{ approval_id, state: "COMPLETED", ranking: [{ repo_full_name, run_id, composite_score, verdict }] }`. Returns on a terminal negative outcome: `{ approval_id, state: "REJECTED" | "FAILED" | "EXPIRED", error? }`.
- Polling: repeated calls with the same `max_repos` return the existing approval and its current state. Once complete, the same tool returns the ranking. A new request is created only after the prior approval is terminal and the user explicitly asks for another ranking.

### 12. search_knowledge

- Description: "Search Verdiqt's marketing and validation knowledge base for frameworks and heuristics, for example offer design, demand signals, pricing, distribution."
- Input: `{ "type": "object", "properties": { "query": { "type": "string", "minLength": 1, "maxLength": 200 }, "tags": { "type": "array", "items": { "type": "string", "enum": ["PROBLEM_SEVERITY","DEMAND_SIGNALS","COMPETITION","MONETIZATION","DISTRIBUTION","BUILD_COST"] }, "maxItems": 6, "uniqueItems": true }, "limit": { "type": "integer", "minimum": 1, "maximum": 10, "default": 6 } }, "required": ["query"], "additionalProperties": false }`
- Calls: `GET /api/knowledge/search?q=&tags=&limit=`
- Returns: `{ passages: [{ content, source_doc, heading_index, tags, similarity }] }`
- Rate limit: the public route applies a bounded per-session or per-IP limit because a cache miss creates an embedding call.

## Security gates (must-implement)

- `request_deep_scan` and `rank_portfolio` NEVER execute directly. They create persistent Approval records in `PENDING_HUMAN_APPROVAL`. Only `POST /api/approvals/:id/approve`, invoked by an owner-authorized page form with same-origin CSRF protection, can transition a pending record to `APPROVED`. Approve and reject routes are not WebMCP tools. A conditional state update makes duplicate clicks and requests idempotent; the worker alone records `RUNNING`, `COMPLETED`, or `FAILED`.
- Every route validates input with zod and returns typed JSON errors as shown above. The zod object must be strict wherever the JSON Schema has `additionalProperties: false`. Tool handlers pass API errors through to the agent verbatim because they are designed to be agent-readable.
- Every owner-scoped route resolves the signed-in Auth.js user or hashes and resolves the secure anonymous capability cookie. It verifies ownership before reading or mutating the target. Unknown IDs and IDs owned by another session both return 404 `{ error: "not_found" }` to avoid enumeration. Portfolio routes additionally require the authenticated GitHub user.
- Evidence snippets and README content in any tool response have already passed `lib/sanitize.ts`. Never return raw fetched HTML or raw external text.
- Rate limits apply at the API layer, so tools inherit them automatically. A judge enters `JUDGE_ACCESS_CODE` only in the `/judge` page form, which exchanges it for a short-lived signed `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Never accept the raw code in a URL, general API header, tool input, local storage, context, result, analytics event, or log.
- The judge cookie bypasses anonymous rate limits only. It never grants trial ownership, GitHub access, approval authority, or portfolio mutations.
- Tool results and page context never contain session cookies, anonymous capabilities, OAuth access tokens, Auth.js JWTs, judge codes, or judge-cookie claims.

## Eval checklist (run before submission, see Chrome's WebMCP evals doc)

For each tool: agent can discover it, call it with valid input, recover from each documented error, and complete the hero flow end to end in both ChatGPT's in-app browser and Chrome 149+ with the flag enabled. Record results in docs/SUBMISSION_CHECKLIST.md.
