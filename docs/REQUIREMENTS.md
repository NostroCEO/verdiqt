# Verdiqt Product Requirements

> Status: Product baseline for the WebMCP Challenge build. Requirements describe observable behavior. Tool payloads and error shapes are defined in `WEBMCP_TOOLS.md`; implementation choices belong in `ARCHITECTURE.md`.

## Product Objective

Verdiqt helps serial builders, vibecoders, and indie hackers decide whether a SaaS idea deserves further investment. A builder and an AI agent put an idea on trial together: the agent gathers and interprets evidence, the human reviews and steers the trial, and the system returns a cited BUILD, PIVOT, or KILL verdict plus one cheapest next validation step.

The product must prove a two-way collaboration loop. The agent can act through WebMCP, the human can pin or reject evidence, change scoring weights, and approve or deny consequential requests, and the persisted trial status and read tools expose those human actions so the agent can adapt within the same session.

## Actors

- **Builder:** The primary user. A serial builder, vibecoder, or indie hacker deciding whether to pursue a SaaS idea or an existing public GitHub project.
- **AI agent or WebMCP client:** Discovers and invokes Verdiqt tools, reads structured trial state, and responds to persisted human decisions returned by the status and domain read tools.
- **Signed-in GitHub user:** A builder who authorizes access to their public repositories for portfolio analysis. This is an optional extension of the core idea-validation journey.
- **Knowledge corpus maintainer:** Writes and ingests the original Verdiqt validation playbook used for retrieval. This is an engineering role, not a public product role.
- **External systems:** OpenAI APIs, Postgres with pgvector, supported public evidence APIs, GitHub, Product Hunt when configured, Render, and WebMCP-capable browsers.

## Product Principles

1. Evidence comes before confidence. Every dimension score is grounded in cited evidence identifiers.
2. The human owns judgment and control. Agent requests that can expand scope or start several trials wait for an explicit page action.
3. The app and agent share one current truth. Agent-visible results and human-visible page state stay consistent.
4. The product is decisive. It returns BUILD, PIVOT, or KILL and exactly one next validation action.
5. The core experience remains usable without WebMCP.
6. Live research uses documented APIs and permitted data sources. The project does not depend on scraping against terms of service.

## End-to-End Journeys

### Journey 1: Put an idea on trial

1. The builder opens the landing page and enters either an idea description or a public GitHub repository URL.
2. The builder selects **Put it on trial**. The app creates a trial and opens its dashboard.
3. The dashboard shows progress through QUEUED, NORMALIZING, GATHERING, CLASSIFYING, and SCORING while evidence arrives.
4. Each evidence card shows its source, URL, title, snippet, dimension, strength, and current human state.
5. The builder may pin relevant evidence, reject irrelevant evidence, or adjust the six dimension weights so they remain non-negative and total 100.
6. Human changes are logged, trigger the appropriate re-score, and appear in the next authoritative status read.
7. When processing completes, the dashboard reveals the composite score, BUILD, PIVOT, or KILL verdict, six dimension scores and rationales, cited evidence, and exactly one recommended next step.
8. The builder can inspect the chronological trial transcript to understand what the agent and human each did.

### Journey 2: Let an agent drive the same trial

1. In a supported client, the agent discovers Verdiqt's registered WebMCP tools and their constrained schemas.
2. The agent starts a trial from idea text or a public repository URL and receives a run identifier and dashboard URL.
3. The agent polls status, reads evidence, and reads the completed verdict through structured tool results.
4. If the agent requests a deep scan, Verdiqt creates a pending approval and displays an approval card in the page.
5. The human reviews the request and explicitly approves or denies it.
6. Only approval starts the deeper scan. The page logs the human decision, and the next `get_validation_status` call returns it so the agent can continue from current state.

### Journey 3: Pivot and compare

1. From an existing trial, the builder or agent supplies pivot text.
2. Verdiqt creates a linked trial without replacing the original.
3. After two to five linked or independent trials complete, the builder or agent compares them side by side.
4. The comparison shows each idea's one-line summary, composite score, verdict, six dimension scores, and the strongest trial per dimension.

### Journey 4: Review a public GitHub portfolio

1. The builder signs in with GitHub and sees public repositories available for analysis.
2. The builder or agent can start a trial for one repository.
3. A portfolio ranking request creates a pending approval because it can start multiple trials.
4. Only the builder's approval starts the ranking work.
5. The completed portfolio view ranks analyzed repositories by composite score and identifies the project that most deserves attention.

## Functional Requirements

### Trial creation and progress

| ID | Requirement | Priority | Observable proof |
| --- | --- | --- | --- |
| FR-001 | The builder can start a validation trial with idea text of at most 2,000 characters. | Must | A valid submission creates a trial and opens its dashboard. |
| FR-002 | The builder can start a validation trial from a public GitHub repository URL. | Must | A valid URL creates a trial whose idea is inferred from public repository metadata and sanitized README content. |
| FR-003 | A trial exposes the statuses QUEUED, NORMALIZING, GATHERING, CLASSIFYING, SCORING, COMPLETE, and FAILED. | Must | The status endpoint and dashboard show the same current status. |
| FR-004 | The dashboard streams trial events and newly gathered evidence without requiring a page refresh. | Must | Evidence cards and stage events appear while a real trial runs. |
| FR-005 | Trial status includes the run identifier, evidence count, completed stages, five latest events, current pending approvals, and at most the last 10 human actions. | Must | The status API and `get_validation_status` return those fields from the persisted trial, approval, and event records. |
| FR-006 | Anonymous trial creation is rate limited, with a documented judge access path that lifts the limit for that session. | Must | Exceeding the configured daily limit returns `rate_limited` with a retry hint; a valid judge session bypasses it. |

### Evidence and scoring

| ID | Requirement | Priority | Observable proof |
| --- | --- | --- | --- |
| FR-007 | Verdiqt gathers evidence through supported live APIs and continues when one source fails. | Must | A failed adapter emits a source failure event while evidence from remaining sources still reaches the trial. |
| FR-008 | Each evidence item includes an identifier, source, non-empty URL, title, sanitized snippet, dimension, strength, and human state. | Must | The dashboard and evidence tool show these fields and no raw fetched HTML. |
| FR-009 | Evidence can be filtered by validation dimension or supported evidence source. | Should | A filtered evidence request returns only matching items. |
| FR-010 | The builder can set evidence to PINNED, REJECTED, or NEUTRAL. | Must | The card updates, an event is logged, and scoring uses the new state. |
| FR-011 | Verdiqt scores PROBLEM_SEVERITY, DEMAND_SIGNALS, COMPETITION, MONETIZATION, DISTRIBUTION, and BUILD_COST from 0 to 100. | Must | A completed verdict contains all six scores. |
| FR-012 | Default weights are 20, 20, 15, 20, 15, and 10 for the six dimensions in the documented order. | Must | A new trial reports weights totaling 100. |
| FR-013 | The builder can change all six non-negative weights when their total is exactly 100, and the composite score recomputes. | Must | Saving valid weights logs the action and re-scores; invalid totals are rejected. |
| FR-014 | REJECTED evidence is excluded from scoring. PINNED evidence is marked as human-vouched for relevance, not truth. | Must | Scoring input and rationale behavior match the two human states. |
| FR-015 | A dimension with fewer than two evidence items cannot score above 45 and must state that evidence is insufficient. | Must | A fixture with zero or one item produces a score no higher than 45 and an insufficiency rationale. |
| FR-016 | A score above 40 cites at least two evidence identifiers in its rationale when at least two relevant items exist. | Must | The displayed rationale contains linkable `[ev:id]` references. |
| FR-017 | The composite is the rounded weighted average. Scores of 70 or more return BUILD, scores from 40 through 69 return PIVOT, and scores below 40 return KILL. | Must | Boundary tests pass at 70, 40, and 39. |
| FR-018 | A PIVOT verdict names one pivot direction derived from the strongest dimension. | Must | The verdict response and panel show a concrete pivot sentence. |
| FR-019 | Every completed trial returns exactly one cheapest next action from the documented validation playbook. | Must | The verdict and next-step endpoint agree on action, reason, method, and effort hours. |
| FR-020 | Verdiqt retrieves relevant passages from its original validation knowledge corpus using embeddings and pgvector, with optional dimension tags and a result limit. | Must | `search_knowledge` and the knowledge endpoint return content, source document, tags, and similarity. |

### Human and agent collaboration

| ID | Requirement | Priority | Observable proof |
| --- | --- | --- | --- |
| FR-021 | The app registers the 12 tools `start_validation`, `get_validation_status`, `get_evidence`, `request_deep_scan`, `get_verdict`, `refine_idea`, `compare_ideas`, `get_next_step`, `list_repos`, `analyze_repo`, `rank_portfolio`, and `search_knowledge` through `document.modelContext`, with registration cleanup controlled by `AbortSignal`. | Must | All 12 are discoverable in each target WebMCP client with the documented descriptions and schemas, and provider cleanup removes its registrations without duplicate tools. |
| FR-022 | Each tool calls the same server route used by the human UI, forwards the execution cancellation signal to its request, and contains no client-side business logic. | Must | UI and tool calls produce consistent domain state and responses, and cancelling a call aborts its in-flight request. |
| FR-023 | Every tool returns its parsed serializable application result directly through WebMCP; an MCP `structuredContent` or `content` transport wrapper is not mandatory. | Must | Tool contract tests and live client inspection show successful direct object or scalar results; any required client-specific compatibility transform is isolated and documented. |
| FR-024 | Tool and API inputs are validated against equivalent constrained schemas before domain logic runs. | Must | Invalid fields, lengths, enums, and required values return typed, actionable errors. |
| FR-025 | `request_deep_scan` creates a pending approval and never starts the scan directly. | Must | The request returns `PENDING_HUMAN_APPROVAL`; no deep job runs before a human click. |
| FR-026 | `rank_portfolio` creates a pending approval and never starts multiple analyses directly. | Must | The request returns `PENDING_HUMAN_APPROVAL`; no ranking work starts before a human click. |
| FR-027 | Approval cards clearly state the requested action and offer keyboard-reachable Approve and Deny controls. | Must | A user can focus the card and approve with Enter or select Deny. |
| FR-028 | Human approvals, denials, evidence changes, and weight changes are recorded as trial events. | Must | The transcript shows the action, actor, and timestamp. |
| FR-029 | After every meaningful state change, `get_validation_status` returns current trial state, pending approvals, and at most the last 10 human actions so the agent can explicitly re-read the authoritative state. | Must | After a human pin, rejection, weight change, approval, or denial, the next status call reflects the persisted action without a parallel publishing channel. |
| FR-030 | The agent dock shows friendly agent activity, timestamps, pending approvals, and the current trial state returned by the latest reads. | Must | A live agent tool call appears in the dock and the matching transcript. |
| FR-031 | Without WebMCP, Verdiqt remains fully usable through its human UI and does not render the agent dock. | Must | The core trial completes in a normal browser without model context. |

### Verdict, comparison, and portfolio

| ID | Requirement | Priority | Observable proof |
| --- | --- | --- | --- |
| FR-032 | The completed dashboard presents a composite gauge, six-dimension radar, decisive verdict stamp, per-dimension rationale with linked evidence, and the single next-step card. | Must | One completed live trial shows every element. |
| FR-033 | The verdict reveal is skippable and becomes simple fades when reduced motion is requested. | Must | Click-to-skip and operating-system reduced-motion tests both pass. |
| FR-034 | The builder can inspect a chronological two-column transcript of human and agent actions. | Must | The transcript accurately reflects persisted trial events. |
| FR-035 | Refining an idea creates a new linked trial and preserves the parent trial. | Should | The refine result contains new and parent run identifiers, both still retrievable. |
| FR-036 | Two to five completed trials can be compared across composite and dimension scores. | Should | The compare view and tool return the documented side-by-side result. |
| FR-037 | A signed-in GitHub user can list public repositories, including analysis status, and start analysis for a selected repository. | Should | The portfolio UI and tools work for an authenticated account; signed-out calls return `not_signed_in`. |
| FR-038 | Approved portfolio ranking sorts completed repository trials by composite score and caps work at the requested maximum from 1 to 10. | Should | The ranking output is ordered, respects the cap, and identifies the strongest project. |

## UX States

- **First visit:** Show the courtroom-styled landing page, a single input for idea text or repository URL, the **Put it on trial** call to action, and a concise three-step explanation.
- **WebMCP available:** Indicate that the agent can drive the page. Show the dock only when WebMCP is active.
- **WebMCP unavailable:** Keep the human workflow intact and provide a small dismissible suggestion to use an agent-capable browser.
- **Queued or working:** Show the exact pipeline stage, loading skeletons, streamed events, and evidence cards as they arrive. Do not imply completion early.
- **Awaiting human control:** Open or flag the agent dock once for a new approval. Show the requested action, reason when supplied, and explicit Approve and Deny controls.
- **Evidence available:** Let the builder inspect sources and immediately see PINNED, REJECTED, or NEUTRAL state.
- **No or thin evidence:** State that evidence is insufficient. Do not replace missing evidence with model confidence, and enforce the score cap.
- **Complete:** Run the skippable verdict reveal, then keep all scores, citations, the verdict, and next step inspectable.
- **Invalid input:** Preserve the user's context and explain which field, enum, length, URL, or weight rule must be corrected.
- **Rate limited:** Explain that the anonymous daily limit was reached and return a retry hint.
- **External source unavailable:** Record a source-disabled or source-failed event, continue with other sources, and expose the reduced evidence coverage.
- **Trial failed:** Show FAILED clearly with an actionable error. Never present a partial result as a final verdict.
- **Signed out:** Portfolio actions explain that GitHub sign-in is required. Core idea trials remain available without sign-in.
- **Responsive and accessible:** At 375 px, the dashboard becomes one column and the dock becomes a full-width bottom sheet. Keyboard focus remains visible and meaningful.

## Non-Functional Requirements

| ID | Area | Requirement |
| --- | --- | --- |
| NFR-001 | Accessibility | The core flow, evidence controls, dialogs, sliders, tabs, accordions, and approval cards are keyboard reachable, meaningfully labeled, and have visible focus states. Approval can be completed with Enter. |
| NFR-002 | Accessibility | Text and interactive tokens pass WCAG AA contrast against their surfaces, and all motion respects `prefers-reduced-motion`. |
| NFR-003 | Responsive design | The product is desktop-first and remains fully usable at widths down to 375 px. |
| NFR-004 | Performance | The deployed landing page targets a Lighthouse performance score of 85 or higher. The animated hero has WebGL and reduced-motion fallbacks, and its dynamically imported chunk remains under 300 KB gzipped. |
| NFR-005 | Reliability | Slow research and scoring run outside request handlers. A failure from one evidence adapter does not fail the whole gathering stage. |
| NFR-006 | Reliability | Trial writes and gated actions are repeat-safe through idempotency or explicit conflict handling. A failed call never silently creates duplicate or partial work. |
| NFR-007 | Deployability | Task 1 leaves the scaffold buildable and deployable. From Task 2 onward, the live health endpoint reports success and the deployed revision after every implementation task. |
| NFR-008 | Compatibility | The live app and all WebMCP tools are exercised in ChatGPT's in-app browser and Chrome 149 or newer with WebMCP testing enabled before submission. |
| NFR-009 | Contract consistency | Human UI and tool actions use the same API routes. Agent-visible read results and human-visible state do not contradict each other. |
| NFR-010 | Data integrity | All six scoring weights are present, non-negative, and sum to 100. Trial status, events, evidence, verdicts, and linked pivots remain internally consistent. |
| NFR-011 | Observability | Meaningful pipeline transitions, agent tool calls, source failures, approval requests, and human actions are recorded as inspectable events. |
| NFR-012 | Content integrity | English UI copy is concise and decisive. UI copy contains no em dash character. Verdict colors are reserved for score and verdict elements. |

## Privacy and Security Requirements

| ID | Area | Requirement |
| --- | --- | --- |
| SEC-001 | Input validation | Validate user, tool, URL, query, filter, weight, and approval inputs server-side before reading or changing domain state. |
| SEC-002 | Authorization | Validate authentication and current trial or portfolio state before protected actions. Signed-out portfolio calls return the documented `not_signed_in` response. |
| SEC-003 | Human control | Deep scans and portfolio ranking cannot be started by bypassing their approval records. Approval endpoints require the current Auth.js user or anonymous capability principal to own the approval and target, plus a verified same-origin request and a principal-bound CSRF token. |
| SEC-004 | Untrusted content | Sanitize all external snippets and README text before display, persistence, prompts, or tool output. Never return raw fetched HTML. |
| SEC-005 | Prompt injection | Treat text inside evidence wrappers as untrusted public-web data, never instructions. The scoring prompt distinguishes ordinary evidence from human-pinned relevance. |
| SEC-006 | Secrets | API tokens, OAuth secrets, database credentials, judge access codes, and server environment values never enter client bundles, logs, or tool results. |
| SEC-007 | Data minimization | Tool results include only data needed for the current trial or portfolio action and never expose unnecessary personal data. |
| SEC-008 | Public-source boundary | Repository analysis is limited to public repositories and sanitized public metadata or README content. Live evidence collection uses documented APIs and data the project has a right to use. |
| SEC-009 | Evidence traceability | Evidence returned to an agent includes a non-empty source URL so the human can inspect the origin. Similarity and strength are signals, not claims of factual certainty. |
| SEC-010 | Error safety | Errors are typed and actionable without leaking stack traces, raw provider responses, credentials, or unnecessary source content. |
| SEC-011 | Rate limiting | Trial creation limits are enforced at the API layer so UI and WebMCP entry points receive the same protection. |
| SEC-012 | Original corpus | The retrieval corpus contains original writing that paraphrases validation concepts. It contains no copied book excerpts or unlicensed material. |
| SEC-013 | Privacy launch gate | Before public trial collection or GitHub OAuth is enabled, Verdiqt publishes a minimum privacy notice and the founder approves the collected data categories, retention period, trial and account deletion behavior, and OAuth unlink behavior. Until then, testing uses local or synthetic data and public trial creation remains disabled. |

The source documents do not yet define the final public data-retention or account-deletion policy. The MVP must not claim either capability, enable public persistence, or enable GitHub OAuth until the founder specifies the behavior and the implementation verifies it.

## Acceptance Scenarios

### AC-001: Core trial succeeds

- **Given** a builder enters valid idea text,
- **When** the builder puts it on trial and the worker completes all stages,
- **Then** the dashboard shows streamed evidence and a cited six-dimension verdict with exactly one next step.

### AC-002: The agent and human share control

- **Given** an agent has started a trial in a supported WebMCP client,
- **When** the human pins one evidence item and changes valid weights,
- **Then** both actions appear in the transcript and the next `get_validation_status` result contains them for the agent.

### AC-003: Deep scan remains gated

- **Given** an agent calls `request_deep_scan`,
- **When** the human has not approved the resulting card,
- **Then** the call reports `PENDING_HUMAN_APPROVAL` and no deep scan job starts.
- **And when** the human approves,
- **Then** the scan starts once, produces new events, and the agent can observe the outcome.

### AC-004: Denial is respected

- **Given** a pending consequential request,
- **When** the human selects Deny,
- **Then** no gated work starts, the denial is recorded, and the next status read informs the agent.

### AC-005: Evidence scarcity limits confidence

- **Given** a dimension has fewer than two relevant evidence items,
- **When** Verdiqt scores that dimension,
- **Then** the score is no higher than 45 and the rationale explicitly says evidence is insufficient.

### AC-006: One provider fails safely

- **Given** one evidence adapter rejects while at least one other source succeeds,
- **When** the gathering stage runs,
- **Then** Verdiqt records `source_failed`, keeps the successful evidence, and continues the trial without hiding the missing coverage.

### AC-007: A running verdict is not misreported

- **Given** a trial is not COMPLETE,
- **When** the builder or agent requests its verdict,
- **Then** the service returns `not_complete` with the current status and does not return a final verdict.

### AC-008: Pivot remains comparable

- **Given** one completed trial,
- **When** the builder refines its idea and the linked trial completes,
- **Then** both versions remain available and a comparison shows their composite and six dimension scores.

### AC-009: Portfolio ranking remains gated

- **Given** a signed-in GitHub user has public repositories,
- **When** an agent requests ranking of up to five repositories,
- **Then** no batch analysis starts until the human approves and the final ranking is ordered by composite score.

### AC-010: Normal-browser fallback works

- **Given** a browser without WebMCP,
- **When** the builder completes the core idea flow through the UI,
- **Then** the trial and verdict work normally, the agent dock is absent, and no WebMCP error blocks the page.

### AC-011: Tool errors guide recovery

- **Given** an agent sends an invalid run identifier, enum, URL, length, or weight payload,
- **When** the server rejects it,
- **Then** the result explains whether the agent must correct input, ask the human to act, retry later, or stop.

### AC-012: Target-client hero flow works live

- **Given** the deployed app in each required WebMCP-capable client,
- **When** an agent discovers the tools, starts a real trial, requests a gated deep scan, receives human approval, and reads the verdict,
- **Then** the complete flow works without mocks and the observed results are recorded in the submission checklist.

### AC-013: Public launch gates fail closed

- **Given** `PUBLIC_TRIALS_ENABLED` or `GITHUB_OAUTH_ENABLED` is false,
- **When** a public caller attempts the corresponding trial-creation or OAuth entry route,
- **Then** the route returns a typed `503` response with `{ error: "launch_gated" }` and persists no submitted trial data, account data, or OAuth token.

## Explicit Non-Goals

- Payments or billing.
- Team workspaces or multi-user collaboration.
- A mobile application. The web UI remains responsive on mobile-sized screens.
- A multilingual interface. UI and submission materials are English.
- General-purpose crawling or scraping infrastructure.
- Private GitHub repository analysis.
- A generic chatbot or one-shot unsourced score report.
- Autonomous execution of deep scans or portfolio-wide ranking without human approval.
- Treating a similarity score, model judgment, or human pin as proof that a claim is true.
- More than one recommended next step per completed verdict.
- Cron monitoring when schedule pressure threatens the core trial flow, WebMCP collaboration loop, or product polish.

## Submission Proof Points

| Proof | Requirements demonstrated | Evidence to capture |
| --- | --- | --- |
| Live ninety-second hero flow | FR-001 through FR-005, FR-021 through FR-032 | In ChatGPT's in-app browser, the agent starts a trial, evidence streams into the same page, the human approves one deep scan, and the agent reads the cited verdict. |
| Human feedback loop | FR-010, FR-013, FR-028 through FR-030 | Clip the human pinning or rejecting evidence or changing weights, followed by the updated action log and the agent's refreshed status read. |
| Evidence-first verdict | FR-008, FR-011 through FR-019, FR-032 | Show the gauge, radar, BUILD, PIVOT, or KILL stamp, linked evidence identifiers, insufficiency behavior, and single next step. |
| WebMCP registry | FR-021 through FR-024 | Capture all 12 discoverable `document.modelContext` tools, valid schemas, abortable registration cleanup, direct serializable results, and a successful real call in both target clients. |
| Approval safety | FR-025 through FR-027, SEC-003 | Record that a deep scan and portfolio ranking stay pending until a page click, plus a denial path that runs no job. |
| Failure recovery | FR-007, NFR-005, SEC-010 | Test or log one unavailable evidence source while the remaining sources complete successfully. |
| Portfolio ambition | FR-037 and FR-038 | Show GitHub sign-in, public repositories, an approved ranking, the heatmap, and the strongest-project card if this scope survives the documented cut order. |
| RAG grounding | FR-020, SEC-005, SEC-012 | Show original corpus files, successful ingestion, tagged pgvector retrieval, and a knowledge search result tied to its source document. |
| Accessibility and fallback | FR-031, FR-033, NFR-001 through NFR-004 | Demonstrate keyboard approval, reduced motion, 375 px responsive behavior, normal-browser use, and the deployed Lighthouse result. |
| Rules and reproducibility | NFR-007 through NFR-009, SEC-006 through SEC-008 | Public MIT-licensed repository, tested setup instructions, live Render URL, public narrated demo under three minutes, and documented target-client eval results. |

The Devpost description and demo must state why WebMCP is essential: it gives the agent and human a shared, stateful surface for research, approval, evidence judgment, and adaptation without copy-pasting or surrendering control to a black box.
