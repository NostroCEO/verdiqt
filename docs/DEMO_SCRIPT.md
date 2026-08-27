# Verdiqt Demo Script

Status: draft. Target runtime: 2 minutes 50 seconds. Hard limit: under 3 minutes.

## Founder confirmation gate

Do not record the final demo until the founder confirms all of the following:

- The hero idea remains: **AI changelog writer for indie SaaS teams**.
- The exact idea wording and audience are accurate enough to seed and repeat on camera.
- The live result is credible. Do not script BUILD, PIVOT, or KILL before the seeded trial has produced its real cited verdict.
- Any on-screen evidence, dimension choice, and cheapest next experiment shown below match the deployed trial.
- The live WebMCP flow has passed in both the ChatGPT desktop in-app browser and Chrome 149+ with WebMCP testing enabled.

Replace every bracketed placeholder after the founder confirms the final seeded run.

## Recording setup

- Record the deployed app in the ChatGPT desktop in-app browser.
- Use a clean seeded account or judge path with no personal data or secrets visible.
- Warm the demo trial cache with `pnpm seed:demo`, but execute the collaboration loop live.
- Keep the agent dock, browser prompt, evidence stream, approval action, verdict, and transcript readable at the recorded resolution.
- Close unrelated tabs and disable notifications.
- Capture system audio or a clean voiceover. The final upload needs audible narration.
- Record at least two complete takes.

## Timeline and script

### 0:00 to 0:08 | Cold open: prove it works

**On screen:** Open on a tight live clip of the agent's deep-scan request, the human clicking **Approve**, and the verdict stamp landing. Use the actual deployed run. Then cut to the landing page.

**Narration:**

> An agent asks. A human decides. The evidence delivers the verdict.

### 0:08 to 0:20 | The problem and promise

**On screen:** Open on the Verdiqt landing page. Let the courtroom visual establish the product, then focus the idea input.

**Narration:**

> AI made software cheap to build. It did not make the wrong software worth building. Verdiqt puts the idea on trial before we burn weeks on it.

### 0:20 to 1:50 | The 90-second human-agent hero loop

#### 0:20 to 0:32 | Agent starts the trial

**On screen:** In ChatGPT, send:

> Put this idea on trial in Verdiqt: an AI changelog writer for indie SaaS teams. Focus on demand and monetization. Show me the evidence before you judge it.

The agent uses Verdiqt's registered WebMCP surface to start the trial. The app opens the shared trial dashboard.

**Narration:**

> The agent can drive the real page. There is no research pasted between a chatbot and a dashboard. We are working on the same trial.

#### 0:32 to 0:52 | Evidence arrives live

**On screen:** Show evidence cards streaming into the dashboard. Pause briefly on a card with a readable source, snippet, dimension, and strength.

**Narration:**

> Verdiqt gathers live signals and classifies them across six validation dimensions. Every score must point back to evidence. If there is no source, it does not count.

#### 0:52 to 1:06 | Agent requests, human approves

**On screen:** The agent requests a deeper scan of `[CONFIRMED DIMENSION]`. The agent dock pops open with a pending approval. Click **Approve**.

**Narration:**

> A deeper scan costs time and resources, so the agent cannot quietly run it. It asks. I approve on the page. That gate is part of the collaboration, not a warning bolted on afterward.

#### 1:06 to 1:25 | Human judgment changes the case

**On screen:** Let the new evidence arrive. Pin `[CONFIRMED STRONG EVIDENCE]`, reject `[CONFIRMED IRRELEVANT EVIDENCE]`, then adjust one weight only if the final seeded run makes that action credible.

**Narration:**

> The agent owns breadth. I still own context and taste. I can pin what matters, reject noise, and change the weight of the case.

#### 1:25 to 1:38 | The page talks back to the agent

**On screen:** Show the agent re-reading current trial status, seeing the persisted human actions, and adapting its next analysis. Keep the dock activity feed visible.

**Narration:**

> This is the WebMCP difference. The page tells the agent what I just decided, so it adapts in the same session. The loop runs both ways.

#### 1:38 to 1:50 | Verdict reveal

**On screen:** Trigger or reveal the completed verdict. Let the gauge sweep, radar draw, verdict stamp land, and cheapest next-step card appear. Do not cut before the sequence finishes.

**Narration:**

> The evidence is in. The verdict is `[LIVE VERDICT]`, with a score of `[LIVE SCORE]`. The cheapest next experiment is `[LIVE NEXT STEP]`.

### 1:50 to 2:13 | Prove the judgment is inspectable

**On screen:** Open one dimension accordion. Follow a cited evidence link back to its card. Then open the transcript tab and show the chronological agent and human actions.

**Narration:**

> This is not a black-box scorecard. Each rationale cites the record, and the transcript shows who did what. A judge can inspect the evidence and the collaboration that produced the verdict.

### 2:13 to 2:30 | Show the dogfood case

**On screen:** Switch to a completed Verdiqt-on-Verdiqt trial prepared before recording. Show its cited result for a few seconds. Do not start a second live run.

**Narration:**

> We even put Verdiqt itself on trial. The same evidence-first system we built for founders has to justify this product too.

### 2:30 to 2:50 | Close on WebMCP and impact

**On screen:** Return to the hero trial with the verdict, next step, and agent dock in one frame. End on the Verdiqt name and live URL.

**Narration:**

> Verdiqt is a judgment layer for the AI building era. WebMCP gives the human and agent shared ground to decide what deserves to exist. Less token burn. Fewer abandoned repos. Better ideas get built.

## Camera checklist for the hero loop

- The landing page visibly detects WebMCP before the first prompt.
- The agent starts the provisional changelog-writer trial through the deployed page.
- At least one cited evidence card is readable.
- The deep-scan request creates a visible pending approval.
- The scan does not run before the human approves it.
- Pin, reject, and any weight change appear in the next status read and the transcript.
- The agent visibly responds to the updated human-action context.
- The final verdict, composite score, six-dimension radar, and one cheapest next experiment render correctly.
- A citation link returns to the matching evidence card.
- No loading failure, private credential, personal notification, or debug UI appears.

## Contingency cuts

If the take runs long, preserve the complete 90-second hero loop. Cut in this order:

1. Shorten the dogfood case to five seconds.
2. Show only one citation in the inspectability section.
3. Shorten the opening narration to one sentence.

Do not cut the approval gate, the human pin or reject action, the page-context adaptation, or the cited verdict. Those moments prove the product's central WebMCP claim.

## Claims discipline

- Say only what the deployed build demonstrates in the recorded take.
- Use the actual live verdict, score, evidence, and next step.
- Do not imply that an API or source ran if its adapter was disabled.
- Do not call a tool or browser path verified until it has passed in both target clients.
- Keep the final narration in English and free of the em dash character.
