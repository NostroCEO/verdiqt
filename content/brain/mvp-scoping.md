---
tags: [BUILD_COST]
---

# MVP Scoping: Wedges, Timeboxes, and Kill Criteria

## Wedge features beat platforms

An MVP is a wedge: one feature that removes one severe pain for one narrow segment reachable through one channel. The heuristic: if the spec needs more than one persona to justify itself, you are building a platform, and platforms fail validation because no single user feels enough severity to pay. The observable evidence pattern that separates the two shows up in discovery notes. Wedge material sounds like a prospect quoting the cost of the problem in hours or euros and describing the ugly workaround they built themselves. Platform material sounds like "that would be nice to have." Willingness to pay tracks severity, not breadth. Write the wedge as one sentence naming the user, the pain, and the outcome. If the sentence needs an "and," cut until it does not.

## The two-week timebox

Scope the first build to 14 calendar days, roughly 10 build-days. Anything that cannot ship inside that window is not the MVP, it is version two, and version two only exists if version one produces evidence. The check is mechanical: list every feature, estimate each in days, sum. Over 10, cut features until under. The timebox does two jobs. It forces prioritization by making tradeoffs visible on one page, and it caps sunk cost: teams will actually kill a two-week build, while a two-quarter build gets defended long after the signal has gone negative. A scope that keeps escaping its timebox is itself a signal that the wedge is not yet defined.

## Kill criteria before code

Write the failure condition before the first commit, in the form: if fewer than X of Y trial users activate, pay, or return within Z days, we stop. The numbers must be fixed while you are still neutral, because after two weeks of building, motivated reasoning will reframe weak signal as "promising." Useful pre-registered thresholds: activation below 20 percent of signups, zero unprompted pricing questions during trials, week-two churn above 60 percent, or channel acquisition cost above first-year revenue per account. Test the criterion itself: if no plausible result could trigger it, it is decoration, not a kill criterion. A dated, numeric kill line is the cheapest risk control in the entire build.

## Infrastructure before value is deferred failure

Multi-tenancy, SSO, role hierarchies, plan matrices, admin panels: none of it produces validation evidence. The heuristic: any engineering that does not change what the first 10 users experience is premature. Substitute manual scaffolding for every internal system. Onboard by hand instead of self-serve signup, run operations from a spreadsheet instead of a dashboard, take payment through a single payment link instead of a billing engine. The visible cost of early infrastructure is the extra build weeks. The hidden cost is worse: every week of plumbing pushes the evidence date back and raises the sunk cost that makes the kill decision harder to execute. Infrastructure spend before first revenue is the most reliable observable marker of a team avoiding the market test.

## Compliance and data moats multiply build cost

Some segments look like ordinary SaaS but carry hidden multipliers on build cost. Regulated verticals such as health, finance, HR, and education add audit logging, data residency, and certification cycles that run 3 to 12 months, commonly multiplying cost 2x to 5x before the first paying user. Data-moat products carry a cold-start tax: the core value depends on accumulated data that does not exist on day one, so early users see a hollow product and churn before the moat forms. Scoring heuristic: when the wedge cannot deliver its core value without a certification or a proprietary dataset, treat every estimate as a floor and apply the multiplier explicitly. Evidence pattern: a segment where the incumbents are dated and clumsy yet still dominant is usually protected by exactly these costs. That is the moat talking, not an open door.
