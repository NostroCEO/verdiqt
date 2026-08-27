# Source and Dependency Compliance

Status: active implementation gate. Last reviewed: 2026-08-27.

This table prevents an adapter, SDK, asset, or service from being enabled by assumption. Before implementation and again before submission, verify each row against current official documentation and terms. Record the date, exact credential path, data retained, deletion obligations, rate limits, and final enabled state. A blank or unresolved gate means disabled.

## Evidence and model services

| Source | Intended access | Credential | Storage and cache | Current decision | Gate before enablement |
|---|---|---|---|---|---|
| OpenAI Responses web search | Official OpenAI SDK and supported web-search tool | `OPENAI_API_KEY` on server only | Sanitized cited evidence persists with its trial; Responses payload is not put in ApiCache | Planned | Pin a supported model; confirm citation mapping, usage policy, timeout, retry, and spend ceiling |
| OpenAI embeddings | Official OpenAI SDK | `OPENAI_API_KEY` on server only | Model-plus-content-hash cache for 30 days; 1536-dimension vectors in Postgres | Planned | Pin a 1536-dimension model and verify current retention and usage terms |
| Hacker News Algolia | Documented public Algolia HN search API | None | Sanitized evidence, 24-hour query cache | Planned | Verify current endpoint, fair-use limits, attribution, and User-Agent behavior |
| GitHub REST evidence search | Official REST API | `GITHUB_TOKEN` on server only | Sanitized public metadata and README excerpts, 12-hour evidence cache | Planned | Verify token scope, API version header, rate limits, public-only boundary, and attribution |
| GitHub OAuth portfolio | Official OAuth and REST APIs | Auth.js provider token in protected server-readable JWT | Public repository metadata, one-hour portfolio cache; token never stored in custom User rows | Optional scope | Founder creates OAuth app; verify scopes, transfer behavior, revocation, and privacy wording |
| Product Hunt | Official GraphQL API | `PRODUCT_HUNT_TOKEN` on server only | Sanitized evidence, 24-hour cache | Disabled by default | Enable only after current search capability, terms, token approval, and retention are verified |
| Reddit | Registered Reddit Data API with application-only OAuth and accurate client identity | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT` on server only | Proposed sanitized evidence and 12-hour cache | Disabled | Founder must approve credentials, use case, retention, deletion behavior, and current Data API terms. Never use anonymous JSON endpoints |

## Runtime, hosting, and UI dependencies

| Dependency | Intended use | Current decision | Gate before use |
|---|---|---|---|
| WebMCP browser API | Register 12 page tools through `document.modelContext`; expose current state through read tools | Required | Verify current Chrome and ChatGPT in-app browser surfaces, abortable registration cleanup, security guidance, and result shape in live clients |
| Render | Web, worker, cron, Postgres with pgvector | Selected | Verify plan capabilities, pgvector support, region, backups, spend, and challenge-period availability |
| Next.js, React, pnpm, Prisma, pg-boss, Auth.js, zod, Vitest, OpenAI SDK | Runtime and tests | Selected stack | Pin exact compatible releases and licenses in package.json plus pnpm-lock.yaml |
| shadcn/ui and Motion | Accessible primitives and application motion, including the 2.4-second technology wall and 4.8-second compact trial proceeding | Selected | Pin exact versions; verify licenses, generated component provenance, hover, focus, and offscreen pause behavior, static reduced-motion states, and keyboard tab behavior |
| Bklit | All data charts | Selected, identifiers unverified | Verify registry items, license, generated code provenance, accessibility, and chart APIs before install |
| KokonutUI | Verdict ticker and portfolio spotlight only | Optional | Verify items, license, motion ownership, and reduced-motion support before install |
| anime.js and Three.js | Optional dynamically loaded isolated landing scene only | Not installed; current CSS halftone scene is the selected fallback | If later requested, pin exact versions and licenses; verify imports, asset rights, fallback behavior, and bundle size before use |
| Fonts and media | Inter, founder-approved display serif, demo assets | Partially selected | Confirm font license, founder choice, and that video music, imagery, footage, and marks are original or authorized |
| Selected technology wall | Official transparent marks for OpenAI, Next.js, Prisma, and Render | Selected for the landing; identifies the intended production path and does not prove current backend completion, sponsorship, or endorsement | Retain the official asset source and current mark-guideline record for each file. Remove a mark if permission or provenance cannot be confirmed. Do not add a product that is not in the implementation path. |
| WebMCP Challenge supporter marks | None | Disabled. The earlier text-only supporter-matrix direction is superseded for the landing. | Do not add event supporter, partner, customer, or sponsor marks without both a real product relationship and verified permission. Event participation alone is not integration or endorsement. |

## Landing claims gate

- The selected technology wall may describe the planned production path, but it must not imply that unfinished backend integrations already work.
- Until `POST /api/trials` exists and passes its launch gates, "Open the case" remains a preview and must not claim that a trial, run identifier, evidence set, or dashboard was created.
- Once the backend exists, the human CTA and WebMCP `start_validation` tool use the same `POST /api/trials` route. The UI reports success and navigates only after the real server response.
- The compact three-stage proceeding is a product preview until its displayed states are backed by the application. It must not be cited as proof of a completed live trial.

## Sign-off fields

- Founder approval date:
- Engineering re-verification date:
- Submission-day re-verification date:
- Disabled sources confirmed absent from product and submission claims:
