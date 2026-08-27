# Verdiqt UI Tool Ownership and Wiring

This file is the implementation contract for the UI stack already selected in `CODEX_PROMPT.md`, `docs/UI_DESIGN.md`, `docs/PLAN.md`, `docs/BRIEF.md`, and `docs/STATE.md`. It does not introduce another component system, chart library, or animation layer.

## Ownership map

| Concern | Owner | Allowed scope | Boundary |
|---|---|---|---|
| Theme, spacing, layout, responsive behavior | Tailwind plus CSS variables | All screens | Product colors come from `app/globals.css`. Do not hard-code colors in components. |
| Accessible UI primitives | shadcn/ui | Buttons, cards, dialogs, popovers, tabs, accordions, sliders, toasts, badges, inputs, and skeletons | shadcn/ui is the primitive layer, not the chart or motion layer. |
| Product UI motion | Motion | Landing DOM hero, repository CTA, selected technology wall, agent dock, evidence entrances, verdict reveal, page transitions, and reduced-motion variants | Motion owns animated application and DOM transitions. The embedded landing dashboard is deliberately static and contains no Motion. Do not add another general-purpose animation library. |
| Charts | Bklit | Gauge, radar, bar, line, and portfolio heatmap | Bklit owns every data chart. Do not introduce a competing chart library. |
| Named visual accents | KokonutUI | Verdict score number ticker and portfolio winner spotlight only | Do not use KokonutUI as a second general component system. |
| Optional isolated hero choreography | anime.js | A future signature 3D moment only | Motion owns all landing DOM animation. Do not add anime.js unless the optional 3D moment passes Gate 3. |
| Optional isolated hero rendering | Three.js | A future signature 3D moment only | The current original halftone fallback is complete without WebGL. Do not bring WebGL into trial, compare, portfolio, CTA, or walkthrough screens. |
| Fonts | `next/font` | Inter for UI and a high-contrast serif for display and verdict stamps | The UI spec names Playfair Display or a similar serif. The exact serif must be settled before implementation. |

## Base install sequence

After the Next.js scaffold exists, verify the current shadcn CLI release in its official documentation and substitute that exact version in both commands. Do not use a mutable `latest` tag.

```bash
# Template only: replace VERSION with the verified exact release.
pnpm dlx shadcn@VERSION init
pnpm dlx shadcn@VERSION add button card dialog popover tabs accordion slider sonner badge input skeleton
pnpm add --save-exact motion@VERSION
```

Run shadcn initialization after the root Next.js 15 App Router scaffold is in place. Use its default style, neutral base, and CSS variables.

`motion` is the confirmed package used by the plan for UI animation. Import it only where animation is required and honor `prefers-reduced-motion` in every sequence.

## Verification gates before installing the remaining tools

These gates are mandatory because the source documents select the products but do not establish every current package or registry identifier.

### Gate 1: Bklit registry identifiers

Status on 2026-08-27: verified for the current Section 2 dashboard slice. The official registry URL is `https://ui.bklit.com/r/{name}.json`; the exact installed identifiers are `@bklit/gauge-chart` and `@bklit/radar-chart`. Both components use the documented composable APIs, responsive sizing, token colors, and Motion-based enter animation. Bar, line, and heatmap identifiers remain deferred until their owning product screens need them.

The plan records this intended command:

```bash
pnpm dlx shadcn@VERSION add @bklit/radar-chart @bklit/gauge-chart @bklit/bar-chart @bklit/line-chart
```

Do not run it blindly. At Task 15, verify the current Bklit documentation and registry for:

- the exact radar, gauge, bar, and line chart identifiers;
- the supported heatmap component or documented composition for the portfolio screen;
- the generated component API needed for token colors, tooltips, animation, and reduced motion.

If an identifier differs, record the verified identifier in `docs/STATE.md` before installation. Do not guess an alternative package name.

### Gate 2: KokonutUI component identifiers

The selected uses are a number ticker in the verdict reveal and a spotlight treatment on the portfolio winner card. The current sources do not provide exact registry identifiers or install commands.

Before either install, verify the live KokonutUI catalog and record:

- the exact component identifier;
- the supported installation command;
- whether the component can consume Verdiqt tokens and reduced-motion behavior without adding another animation owner.

Do not install similarly named components by inference.

### Gate 3: optional anime.js and Three.js package wiring

The current landing ships with Motion-driven DOM choreography and an original CSS halftone scene. anime.js and Three.js are optional for one later isolated 3D moment. The current sources do not pin package versions or current import APIs.

If the founder requests that optional moment at Task 16, verify the official package identifiers, versions compatible with the project, and current import syntax before adding them. Record any durable version or API decision in `docs/STATE.md`. Both must be dynamically imported in the hero path. Their absence does not block the landing or core flow.

### Gate 4: Display serif

Inter is fixed for UI text. The display face is specified as Playfair Display or a similar high-contrast serif. Confirm the final face as a founder taste decision before locking font imports, metrics, and verdict-stamp spacing.

## Wiring contract

### Tokens and typography

- Define the complete color, surface, text, border, radius, and verdict palette as CSS variables in `app/globals.css`.
- Use the dark theme by default. Keep a light-variable set from day one, while optimizing the judged experience for dark mode.
- Use verdict colors only on verdict and score-bearing marks.
- Load Inter and the confirmed display serif through `next/font`.
- Keep UI copy in English, decisive, and free of the em dash character.

### shadcn/ui

- Use shadcn/ui for the primitive list in the confirmed install command.
- Theme generated primitives through the shared variables rather than local color values.
- Preserve keyboard behavior and visible focus states, especially for approval cards and weight controls.
- Keep signature product components, including the agent dock, evidence cards, verdict reveal, and transcript, in project-owned components composed from these primitives.

### Motion

- Landing DOM entrances, the repository/idea switch, and the selected technology wall use Motion. The embedded trial dashboard is static application chrome and does not use Motion.
- The technology wall advances its active block every 2.4 seconds. Pause the timer on hover and while the wall is outside the viewport. Reduced motion shows a static active block.
- The embedded trial dashboard uses three horizontal 40 px controls above one persistent application frame. It never autoplays, loops, or uses Motion. Before the real pipeline exists, only Phase 1 is active and Phases 2 and 3 remain disabled. After Task 11, persisted worker state and SSE events unlock phases. A valid hero submission loads Phase 1 and scrolls to the frame. Dashboard state changes and scrolling are immediate. Do not add Replay, Simulated, or equivalent playback controls.
- Agent dock open: spring with stiffness 260, damping 24, scale 0.6 to 1, origin at bottom right.
- Evidence cards: 40 ms stagger with a 12 px vertical fade-spring entrance.
- Verdict reveal: dim evidence, sweep gauge and ticker, draw radar, drop stamp, then slide up the next-step card. Keep the full sequence under three seconds and skippable on click.
- Reduced motion collapses the sequences to fades.
- Avoid layout animation during data refresh. Animate new entries only.

### Bklit

- Composite score: gauge.
- Six validation dimensions: radar.
- Evidence strength by source: bar.
- Evidence arrival over time in the expanded dock: line.
- Portfolio ranking: heatmap with repositories as rows, dimensions as columns, and a composite column.
- Use Verdiqt tokens, tooltips on every chart, and legends only for multiple series.

### KokonutUI

- The number ticker may animate the composite score during verdict reveal.
- The spotlight may emphasize the portfolio winner card.
- Both remain optional until their verification gate passes. Their absence must not block the core trial flow.

### Landing hero

- Motion coordinates the DOM hero, repository CTA, halftone scene entrance, and selected technology wall. It does not run inside the embedded trial dashboard.
- The hero uses flat editorial fields, strict one-pixel rails, square modules, mono system labels, and an original CSS halftone gavel. Do not copy reference-site source, SVG paths, logos, customer marks, or exact copy.
- The technology wall uses official transparent marks for OpenAI, Next.js, Prisma, and Render only. It identifies selected production technologies and does not imply sponsorship, endorsement, customer status, or challenge-supporter integration. Do not add marks for unintegrated products.
- Until the backend trial route exists, "Open the case" remains a Phase 1 intake preview and must not claim a trial was created, research ran, or a verdict exists. When the backend is available and launch gates are closed, both the human CTA and `start_validation` use the shared `POST /api/trials` route. The CTA navigates only after the server returns a real run identifier and dashboard URL.
- anime.js and Three.js remain optional for one later isolated 3D moment. If added, load both only in that scene using dynamic imports.
- Keep the hero chunk under 300 KB gzipped.
- Keep the existing halftone scene as the deliberate WebGL-free and reduced-motion-safe experience.
- The deployed landing page must reach the plan's Lighthouse performance target of 85 or higher.

## Screen-level ownership

| Screen or component | Primitive and styling | Motion | Data visual |
|---|---|---|---|
| Landing | Tailwind plus shadcn input and button | Motion for DOM hero, CTA, and technology wall; no Motion inside the embedded dashboard | Optional isolated Three.js scene only |
| Trial evidence stream | shadcn cards and badges | Motion staggered entries | None |
| Verdict panel | shadcn accordion and cards | Motion reveal plus verified KokonutUI ticker | Bklit gauge, radar, and bar |
| Agent dock | shadcn buttons and cards | Motion springs and activity entries | Bklit line chart in expanded state |
| Portfolio | shadcn cards, tabs, and buttons | Motion for application UI, verified KokonutUI spotlight | Bklit heatmap |
| Compare | shadcn layout and table primitives | Minimal Motion entries | Bklit radar charts |

## Acceptance checks

- No chart outside Bklit.
- No general UI animation outside Motion.
- anime.js and Three.js, if later installed, appear only in one dynamically loaded landing scene.
- KokonutUI appears only in the two named accents.
- Components consume CSS variables instead of hard-coded product colors.
- Approval controls work by keyboard, including Enter to approve.
- The dashboard collapses to one column and the dock becomes a full-width bottom sheet at narrow widths.
- Muted text combinations pass WCAG AA.
- Reduced-motion behavior is exercised for the dock, evidence stream, verdict reveal, and hero.
- The technology active block advances every 2.4 seconds and pauses on hover or when offscreen.
- The embedded trial dashboard contains no animation or autoplay timer. Only real backend state can advance it beyond Phase 1.
- Reduced motion leaves the technology wall static and makes trial-state transitions immediate.
- The landing contains no Replay or Simulated playback control.
- Only the four selected technology marks appear in the technology wall. No unpermitted or unintegrated supporter mark is present.
- The CTA does not claim successful trial creation until the real shared API route returns success.
- The em dash copy check returns no UI-copy hits before a commit.
