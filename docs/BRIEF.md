# Verdiqt Product Brief and Judging Alignment

## The one-liner

Verdiqt is the judgment layer for the AI building era: before you burn tokens and weeks on a SaaS idea, you and your agent put it on trial together.

## The problem (Potential Impact case)

AI collapsed the cost of building software. It did not collapse the cost of building the WRONG software. A generation of builders now ships SaaS projects in volume with zero validation: no demand check, no competition scan, no monetization thinking. The result is a graveyard of token-burning projects and abandoned repos. The waste is real and measurable: weeks of build time, real API spend, and the motivation cost of another dead launch.

Audience: serial builders, vibecoders, indie hackers. They are reachable (they live on the same channels Verdiqt scans) and they feel this pain weekly.

## Why this fits WebMCP (the required Devpost narrative, keep updated)

1. Validation is naturally a dialogue between judgment and research. The human owns taste, context, and the final call. The agent owns breadth: gathering signals across up to five configured API sources and applying frameworks. WebMCP turns Verdiqt's page into shared ground where both work the same trial at the same time.
2. What humans and agents can do together that was hard before: the agent starts trials, pulls evidence, requests deeper scans; the human approves expensive actions with one click, pins or rejects evidence, reweights what matters; the agent re-reads those persisted human acts through the trial status and domain read tools and adapts its analysis in the same session. That two-way loop does not exist in a chat window alone or a dashboard alone.
3. Better UX than either extreme: no copy-pasting research into a chat, no black-box "AI score" dashboard. Evidence streams into a live page both parties can read, and every score cites its sources.
4. Implementation summary: 12 tools registered through `document.modelContext` spanning the full journey (start, inspect, approve-gated deep scans, verdict, pivot, compare, portfolio, knowledge search), registration lifecycle cleanup through `AbortSignal`, explicit status reads including pending approvals and recent human actions, direct serializable WebMCP results, and human-in-the-loop approval gates per Chrome's secure-tools guidance.

## Judging criteria alignment map

| Criterion | Our answer | Where proven |
|---|---|---|
| WebMCP Leverage (tiebreaker #1) | 12 `document.modelContext` tools with abortable lifecycle cleanup; human-action feedback through authoritative status reads; approval gates as designed collaboration; evals run in both target browsers | docs/WEBMCP_TOOLS.md, demo 0:20 to 1:30 |
| Execution | Complete product usable with and without an agent; live URL; polished courtroom UI; verdicts cite evidence | live site, docs/UI_DESIGN.md |
| Potential Impact | Named audience with demonstrated pain; the tool's own evidence engine tests whether the problem has support (dogfood: run Verdiqt on Verdiqt in the demo) | demo 2:13 to 2:30, README |
| Creativity & Ambition | Co-judgment of ideas is the differentiating concept: the agent that helps you build also helps you decide NOT to build. Re-check the current showcase before making any comparative claim in the submission. | Devpost description and final showcase review |

## Theme fit ("the future of the open web")

The open web is flooding with AI-built products nobody asked for. Verdiqt's answer: a web where humans and agents co-decide what deserves to exist, in the open, with cited evidence. We say this sentence, nearly verbatim, in the video and the Devpost description.

## Positioning against existing validation tools

Existing idea-validation tools (report generators, AI scorecards) are one-shot black boxes: paste idea, receive PDF. Verdiqt differs on three axes: live evidence with citations instead of unsourced scores; an agent-native surface instead of a form; and a portfolio mode that triages the builder's actual GitHub graveyard instead of judging hypotheticals. State this contrast explicitly in the Devpost description.

## Non-goals (hold the line)

No payments, no teams, no crawling infrastructure, no mobile apps, no multi-language UI. Every hour goes to the hero flow, the collaboration loop, and polish.
