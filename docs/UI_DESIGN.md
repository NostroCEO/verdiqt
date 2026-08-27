# Verdiqt UI Design System

Design language, tokens, motion specs, and screen inventory. The tool-by-tool install and wiring directives live in uitools.md at the repo root; this file defines what the product looks and feels like.

## Design language: an editorial courtroom for ideas

Hard-edged, dark-first, confident. The product delivers verdicts, so the UI borrows judicial gravity through oversized typography, strict one-pixel rails, square modules, mono protocol labels, deliberate negative space, and finite motion. Avoid soft gradient orbs, glowing full-page grids, glass cards, pill-heavy dashboards, and generic AI visual language. Verdict colors stay sparse and appear only on verdict-bearing marks. Never playful-cute; occasionally witty in copy.

The landing may reinterpret public layout and pacing patterns from reference sites, but all Verdiqt copy, SVG geometry, halftone artwork, code, and product UI must remain original. Never copy customer marks, third-party illustrations, exact SVG paths, or proprietary source. The selected technology wall is the narrow exception for third-party marks: use only official transparent assets for OpenAI, Next.js, Prisma, and Render, identify them as technologies in the selected production path, and never imply sponsorship or endorsement. Do not add supporter or partner marks for products that are not part of the implementation.

## Tokens

Define as CSS variables in `app/globals.css`, consumed through Tailwind theme config.

- Background: `--bg: #111214` (flat near-black), surfaces `--surface: #17181B`, raised `--surface-2: #1D1F23`.
- Text: `--text: #F4F3F1`, muted `--text-muted: #A5A6A9`.
- Brand accent: `--accent: #6E8BFF` (electric periwinkle), used for interactive elements and the agent dock.
- Verdict colors, used ONLY for verdict and score elements: BUILD `--build: #2FBF71`, PIVOT `--pivot: #F5A524`, KILL `--kill: #F0433A`.
- Borders: 1px `#35373C`. The landing uses square geometry. Product dashboards may use the shared radius scale only where grouping or touch affordance materially benefits.
- Light mode: implement via CSS variables from day one (shadcn convention), but design decisions optimize dark; judges will see dark by default.

Typography: Inter (UI) + a high-contrast serif for verdict stamps and section displays (Playfair Display or similar from Google Fonts, weight 700+). Verdict stamp is uppercase serif with wide tracking, stamped at an 8 degree rotation.

## Copy rules (hard rules)

- English only. Punchy, verdict-flavored: "Put it on trial", "The evidence is in", "This one deserves to live".
- The em dash character is BANNED in all UI copy and project documentation. Use periods, commas, or colons instead. The repo-wide tracked-text check in `docs/PLAN.md` must return no hits before any commit.
- Never hedge in verdict copy. The product's personality is a fair but decisive judge.

## Screen inventory

1. Landing `app/page.tsx`: rail-bound editorial hero with an original halftone gavel, one-line promise, accessible public-repository or idea switch, "Open the case" CTA, selected technology wall, and one compact three-step product proceeding. The proceeding uses three 40 px horizontal controls above one persistent hard-edged product frame, not stacked explanation cards or a second feature dossier. The technology wall uses official transparent marks for OpenAI, Next.js, Prisma, and Render only. Motion owns DOM choreography. Until the backend exists, a valid CTA submission dispatches the local preview-start event, scrolls smoothly to the proceeding, resets it to stage one, and must not claim that a case or trial was created. Once the backend exists and the launch gates are closed, the CTA starts a real trial through the same `POST /api/trials` route used by the WebMCP tool, then navigates only after a successful response.
2. Trial dashboard `trial/[id]/page.tsx`: the core screen.
   - Header: idea one-liner, status pill, weights popover (six sliders summing to 100).
   - Evidence stream: masonry of evidence cards streaming in live (SSE), each card: source icon, title, snippet, dimension chip, strength dots, pin and reject buttons.
   - Verdict panel (appears on COMPLETE): gauge (composite), radar (six dimensions), verdict stamp animation, per-dimension accordion with rationale and cited evidence links, next-step card.
   - Trial transcript tab: chronological TrialEvent history of human and agent actions, two-column chat-like layout. This is demo gold; make it beautiful.
3. Portfolio `portfolio/page.tsx`: GitHub sign-in state, repo list with analyze buttons, ranking view with heatmap (repos by dimensions) and "deserves to live" winner card.
4. Compare `trial/compare` view: reached from compare_ideas or UI; side-by-side radars and dimension table.

## The agent dock (signature component)

`components/agent-dock/`. A floating button, bottom right, 56px, accent-colored, subtle idle pulse when WebMCP is active.

- Pops open (Motion spring, stiffness 260, damping 24, scale 0.6 to 1, origin bottom-right) into a 360 x 480 px window on agent activity or click.
- Contents: live activity feed (tool calls with friendly labels and timestamps, streaming in), pending approval cards (Approve / Deny buttons, amber border, gate icon), and a context line showing what the agent currently sees.
- States: collapsed (button + unread badge), open, expanded (520 px wide, shows full transcript).
- Closable always; reopens on new approval requests with a single spring bounce, never repeated attention-seeking animation.
- When no WebMCP: the dock is absent entirely.

## Motion principles

- Landing entrances and SVG path drawing use Motion, remain finite, and settle into a static composition.
- The selected technology wall advances one active block every 2.4 seconds. Pause while the wall is hovered or outside the viewport. With reduced motion, keep one static active block and do not run the timer.
- The compact three-stage proceeding advances every 4.8 seconds inside one persistent product frame. Active controls transition in about 300 ms and stage scenes enter in roughly 500 ms. Pause while the section is hovered, contains keyboard focus, or is outside the viewport. Direct stage selection remains available. A valid hero submission resets the sequence to stage one before smooth scrolling to it. With reduced motion, keep the first stage static and use immediate scrolling. Do not render Replay, Simulated, or equivalent playback controls.
- Evidence cards: staggered entrance, 40 ms stagger, y 12px fade-spring, via Motion.
- Verdict reveal sequence (on COMPLETE): 1) evidence stream dims, 2) gauge sweeps from 0 to score (Bklit gauge with KokonutUI number ticker, 1.2 s ease-out), 3) radar draws in, 4) verdict stamp drops with a spring scale from 1.4 and a 1-frame screen shake at 4px amplitude, 5) next-step card slides up. Total under 3 seconds, skippable on click.
- Page transitions minimal. Never animate layout on data refresh except entries.
- Respect prefers-reduced-motion: all sequences collapse to fades.

## Charts (Bklit only)

- Composite score: gauge chart.
- Six dimensions: radar chart, verdict-colored fill at 20 percent opacity.
- Evidence strength by source: bar chart.
- Evidence arrival over time during a run: live line chart in the dock's expanded view.
- Portfolio ranking: heatmap, repos as rows, dimensions as columns, plus composite column.

All charts use the token palette; verdict colors only on verdict-bearing marks. Tooltips on everything; legends only when more than one series.

## Accessibility and responsive

- Desktop-first (judges use the ChatGPT desktop app), fully responsive down to 375px: dashboard collapses to single column, dock becomes full-width bottom sheet.
- Keyboard reachable approvals: approval cards focusable, Enter approves.
- Auto-cycling landing sections pause for the documented hover, focus, and viewport conditions. The three proceeding controls remain in one row at 375 px, retain keyboard access, and introduce no horizontal overflow. Manual tabs do not depend on a playback control.
- Contrast: all text pairs pass WCAG AA against their surfaces (verify the muted text tokens).
