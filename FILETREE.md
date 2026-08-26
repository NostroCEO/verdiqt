# Verdiqt Repository Layout

This is the canonical layout. The application uses Next.js App Router at the repository root with no `src/` directory.

```text
verdiqt/
├── .devpost-hackathon-state.json
├── .env.example
├── .github/
│   └── workflows/
├── AGENTS.md
├── CODEX_PROMPT.md
├── devpost-submission.md          # generated later by the Devpost plugin, if used
├── FILETREE.md
├── LICENSE
├── README.md
├── rules.md
├── ressources.md
├── uitools.md
├── app/
│   ├── (site)/
│   ├── api/
│   ├── portfolio/
│   └── trial/
├── components/
│   ├── agent-dock/
│   ├── portfolio/
│   ├── trial/
│   ├── ui/
│   └── verdict/
├── content/
│   └── brain/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── BRIEF.md
│   ├── DEMO_SCRIPT.md
│   ├── PLAN.md
│   ├── REQUIREMENTS.md
│   ├── STATE.md
│   ├── SUBMISSION_CHECKLIST.md
│   ├── UI_DESIGN.md
│   ├── VALIDATION_FRAMEWORK.md
│   ├── WEBMCP_TOOLS.md
│   ├── decisions/
│   ├── references/
│   │   └── SOURCE_COMPLIANCE.md
│   └── submission/
├── incoming/
├── lib/
│   ├── brain/
│   ├── evidence/
│   ├── github/
│   ├── hooks/
│   ├── verdict/
│   └── webmcp/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── public/
├── scripts/
├── worker/
├── package.json
├── render.yaml
├── tsconfig.json
└── vitest.config.ts
```

Only documentation and empty support directories exist before Plan Task 1. Application directories appear as their tasks create real files.

## Integration Rule

For each supplied file:

1. Read `CODEX_PROMPT.md`, `AGENTS.md`, and `docs/STATE.md` first.
2. Inspect the file's purpose, dependencies, runtime assumptions, and security boundaries.
3. Place it in the canonical location above. Use `incoming/` only when placement is genuinely unresolved.
4. Reconcile it with the relevant contracts and tests as one coherent change.
5. Remove obsolete `.gitkeep` files when real files enter a directory.
6. Verify the affected end-to-end slice before accepting the next file.

Record any durable structural change in the decision log inside `docs/STATE.md`.
