# Devpost Submission Checklist (deadline: September 3, 2026, 1:00 pm PT; internal target: September 2)

Source of truth: the [official Devpost rules](https://webmcp.devpost.com/rules). The local `rules.md` file and this checklist are working summaries; when in doubt, the live official rules win.

## Accounts and access (do first, human tasks)

- [x] Register on webmcp.devpost.com with a Devpost account (founder confirmed on 2026-08-26).
- [ ] Install ChatGPT desktop app; confirm its in-app browser runs WebMCP tools.
- [ ] Install Chrome 149+; enable chrome://flags/#enable-webmcp-testing; restart.
- [ ] Review currently available participant hosting credits on the Devpost Resources tab; claim only what the selected Render deployment needs.
- [ ] Confirm the Render account, plan, region, billing ceiling, Blueprint access, and Postgres/pgvector availability. This blocks Task 2.
- [x] Vercel account available as a contingency web-only host; founder confirmed 2026-08-26.
- [x] Netlify account available as a contingency web-only host; founder confirmed 2026-08-26.
- [ ] Create the public GitHub repository under the NostroCEO account (can stay private until submission week, MUST be public with the license visible in the About section at submission).

## Project requirements (build gates)

- [ ] WebMCP-powered web app, live URL, reachable by judges through the winners announcement.
- [ ] The repo contains a `modelContext.registerTool(` call (greppable; our registry satisfies this).
- [ ] Runs in ChatGPT's in-app browser AND Chrome 149+ with the flag.
- [ ] MIT LICENSE file at repo root AND set in the GitHub About/license field so Devpost sees it.
- [ ] All source, assets, and run instructions in the repo (README covers setup end to end).
- [ ] Timestamped commit history within the submission window (August 25 to September 3). Never rewrite public history after pushing.
- [ ] [Per-source compliance table](references/SOURCE_COMPLIANCE.md) is current: documented API or SDK, authorized credentials, terms checked, cache or retention behavior, and enabled or disabled state for OpenAI, HN Algolia, GitHub, Product Hunt, Reddit, and every hosting or UI dependency.
- [ ] Core judge path tested with JUDGE_ACCESS_CODE supplied only in the private submission instructions. The code bypasses anonymous trial rate limits only. Do not share GitHub credentials or use the code for portfolio access; show the optional portfolio in the video, or let judges connect their own GitHub account.

## Submission form contents

- [ ] Run `$prepare-submission` against the live Devpost requirements and copy every official question and character limit into `devpost-submission.md`; do not infer missing fields.
- [ ] Text description covering, explicitly and in this order: why the use case fits WebMCP; how it creates a better user experience; what people and agents can do together that was difficult before; how WebMCP was implemented. Draft lives in docs/BRIEF.md; adapt, do not copy raw.
- [ ] Public YouTube video link, under 3 minutes, audio narration, shows the working project and the WebMCP usage (script: docs/DEMO_SCRIPT.md).
- [ ] Public repo URL (github.com/NostroCEO/verdiqt).
- [ ] Live URL (Render).
- [ ] Testing instructions including the judge access code and the two browser paths.
- [ ] Name the tested agent and client paths with dated results: ChatGPT desktop in-app browser and Chrome 149+ with WebMCP testing enabled.
- [ ] Explain the AI tools actually used, the exact role of each verified model capability, and the human-control boundaries.
- [ ] Explain concretely how Codex helped plan, implement, debug, test, deploy, and iterate.
- [ ] Answer the official WebMCP learning-level question.
- [ ] Answer the official career-value question.
- [ ] Add known limitations, screenshot list, thumbnail or project photo, and demo evidence requested by the live form.
- [ ] If the form asks whether this was an existing project, state truthfully that implementation began during the challenge and distinguish any supplied planning work.
- [ ] Record submitter type, country, and application status exactly as the founder answers them when the live form requests them.
- [ ] If the live form asks for a Codex session ID, record only a founder-confirmed candidate ID and never read session contents.

## Pre-submission verification (September 1 to 2)

- [ ] Full hero flow in ChatGPT in-app browser: agent discovers tools, start_validation to verdict, approval gate, pin/reject, refine, compare. Record results.
- [ ] Same flow in Chrome 149+ with flag.
- [ ] Eval pass per docs/WEBMCP_TOOLS.md checklist; fix every discovery or schema failure.
- [ ] Fresh-clone test: `git clone` on a clean machine, follow README setup, app boots. 
- [ ] Anonymous rate limit works; judge code bypasses it.
- [ ] No em dash in tracked UI or documentation text: run the repo-wide `rg` command from docs/PLAN.md and confirm no matches.
- [ ] No secrets in repo history; .env.example complete.
- [ ] Video uploaded public, link tested logged-out.
- [ ] Video contains no unlicensed music, images, footage, or third-party trademarks; every non-original asset has documented permission or a compatible license.
- [ ] Live project access is free and remains available through the judging period; any judge credentials work in a clean session.
- [ ] Submit on Devpost, confirm the submission shows as received. Target: September 2, evening PT at the latest.

## Rules facts worth remembering

- At most one submission is allowed per entrant. Judges may rely on the live app, repository, description, and video, so every artifact must stand on its own.
- Stage One is pass or fail for theme fit and reasonable use of required APIs or SDKs. Stage Two weights four five-point criteria equally: WebMCP Leverage, Execution, Potential Impact, and Creativity & Ambition. Ties are resolved in that listed order.
- Winners announced on or around September 23, 2026. Top 10 all receive the full sponsor prize bundle.
- Internal safety policy: after the September 3 deadline, freeze the submitted Devpost entry, repository, and live deployment until winners are announced. Continue only in a separate fork. This is stricter than the minimum judging-period availability window.
