# Verdiqt — Devpost project description

Live app: https://verdiqt-web.onrender.com
Public repo: https://github.com/NostroCEO/verdiqt (MIT license)
New project, built from scratch for The WebMCP Challenge.

---

## Inspiration

AI made building software cheap. It did not make building the *right* software cheap. People now ship a SaaS product in a weekend — and find out at launch that nobody wanted it.

Verdiqt moves that painful discovery to *before* you write the first line of code. You put your idea on trial, and a court decides whether it deserves to live.

## What it does

You file a case: your SaaS idea in a sentence, or a link to a public GitHub repo you already built. Then the courtroom goes to work, and you watch every step happen live:

1. **The case file.** The court reads your idea and writes it up: who it's for, what problem it solves, what to search for.
2. **The investigation.** Real research across five real communities — Hacker News, Reddit, GitHub, Stack Overflow, and Product Hunt. Every finding appears on screen with a link to its source, and every source reports honestly: gathered, failed, or empty. If the first search comes back thin, the court automatically widens its search.
3. **The deliberation.** Six AI judges each take one question: *Is the pain real? Is anyone actively looking for this? Who already exists? Who would pay? Can you reach these people? Can you build it fast enough?* Each judge delivers their score the moment they finish — you literally watch the bench board fill in, one verdict at a time.
4. **The ruling.** A presiding judge reads the entire case file and rules: **BUILD**, **PIVOT**, or **KILL** — with a score out of 100, the reasoning behind every number, and exactly one recommended next step (a real, cheap test you can run this week).

A full trial takes about a minute. And if you refine your idea and try again, the court *remembers*: the evidence you marked as important and the previous ruling follow your case, so every iteration builds on the last.

## How WebMCP powers it

Here's the part that makes Verdiqt different: **the page itself is open to AI agents.**

Using WebMCP, the courtroom page registers 10 typed tools directly with your browser — `start_validation`, `get_evidence`, `get_verdict`, `refine_idea`, and so on. That means an AI assistant like ChatGPT can open the site and *work the same courtroom you see*, no plugins, no API keys, no copy-pasting:

- **The agent never guesses at buttons.** It gets real, typed tools with instructions built into their descriptions — so any WebMCP-capable agent completes the full journey (file → research → verdict → refine) with zero site-specific prompting.
- **You see everything the agent does.** Every tool call shows up in the page's Session Activity feed with a timestamp, while the trial dashboard streams the same research and scores to your eyes.
- **Humans keep the gavel.** When an agent wants something expensive — a deeper research scan, for example — it queues an approval card that only a human click can release. Agents investigate; humans authorize.
- **Same rules for everyone.** The agent sees exactly what you see: your cases, nobody else's.

A human and an AI agent, working the same case, on the same page, at the same time — each doing what they're best at. That two-way loop is only possible because WebMCP puts the tools *inside the page*.

## How we built it

**Zero cash out of pocket.** The whole product runs on free tiers and hackathon credits: one small server runs the website *and* the research pipeline, the AI judges run on free model APIs, and when one provider's daily quota runs dry, the court automatically switches to a backup provider mid-trial and keeps ruling. Constraints became design: the court paces itself under rate limits, shows its deliberation while it works, and never wastes a token.

**The model argues; the code rules.** Anti-hallucination isn't a prompt — it's enforced in code. Judges may only cite evidence the court actually gathered: invented citations are stripped automatically, and a high score that loses its citations gets capped. When public evidence is thin, the judge is allowed to use domain judgment — but the ruling must *say so*, out loud, in the rationale. Uncertainty is never dressed up as certainty.

**Privacy without accounts.** No sign-up. Your browser gets an unguessable key; only its fingerprint is stored. Your cases are yours — anyone else asking for them gets an identical "not found."

## Challenges, accomplishments, what's next

**Challenges.** Running a multi-stage AI pipeline on free tiers meant treating every token and every request as scarce — the wait-and-retry pacing, the provider failover, and the one-at-a-time trial queue all exist because of it. And WebMCP is new enough that the tool contract itself was a design problem: we learned that the workflow belongs *inside* the tool descriptions, so agents teach themselves the journey.

**Accomplishments.** A complete, evidence-cited validation trial in about a minute. A deliberation you can actually watch. A surface that serves two audiences at once — humans get a courtroom, agents get a toolbox, and each can see the other working.

**What's next.** GitHub sign-in to put your whole repo graveyard on trial at once, re-trials over time to watch a verdict change as markets move, and Reddit's expanded API access for even deeper community evidence.

---

## Testing it (for judges)

Open **https://verdiqt-web.onrender.com** — no account, no code, no setup. The app is always-on and responds instantly.

**As a human.** File a case right from the landing page — any SaaS idea in a sentence, or a public GitHub repo URL. Watch the three phases: the case file, evidence streaming in source by source, the deliberation board filling in judge by judge, then the full verdict with charts, cited reasoning, the bench's opinion, and your one next step.

**As an agent.**
- *ChatGPT's in-app browser* supports WebMCP out of the box: open the live URL there and ask, "Put this idea on trial: AI changelog writer for indie SaaS teams."
- *Chrome 149+*: enable `chrome://flags/#enable-webmcp-testing`, restart, open the site, and use any WebMCP-capable agent surface. The 10 registered tools are inspectable in DevTools.

The agent will follow the built-in workflow on its own: `start_validation` → poll `get_validation_status` until `COMPLETE` (about a minute) → `get_verdict`, then `get_evidence` or `get_next_step` for detail. Watch the page while it works — every tool call and pipeline stage is visible there.

In the unlikely event you see a daily-limit message, enter the access code from the submission form at `/judge` — it lifts the trial ceiling for your browser. You should never need it.
