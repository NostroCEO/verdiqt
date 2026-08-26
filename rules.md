# The WebMCP Challenge: working rules reference

Last verified from the live Devpost challenge data on 2026-08-26.

This file is an implementation checklist, not a replacement for the [official rules](https://webmcp.devpost.com/rules). If this file conflicts with Devpost, the official rules win. Re-check the official page and announcements immediately before submission.

## Event status and dates

- Event: The WebMCP Challenge, hosted by OpenAI
- Format: online
- Current phase when verified: submissions open
- Registration and submission period: August 25, 2026 at 11:00 AM PT through September 3, 2026 at 1:00 PM PT
- Judging period: September 4, 2026 at 10:00 AM PT through September 21, 2026 at 5:00 PM PT
- Winners announced: on or around September 23, 2026 at 2:00 PM PT

Internal freeze policy, following the Devpost FAQ: after the September 3 deadline, do not edit the submitted Devpost entry, public repository, or deployed site until winners are announced. Continue work only in a separate fork that does not change the submitted version. The official access obligation runs through the judging period; the repository adopts the later winners announcement as the safer operational cutoff.

## Eligibility preflight

The official rules require an individual entrant, or the representative of a team or organization, to be at least the age of majority where they live. Entrants must be based in a country or territory supported for OpenAI API access and must not fall under a listed exclusion or conflict-of-interest category.

The live Devpost eligibility summary lists these excluded locations: Belarus, Brazil, China, Crimea, Cuba, Donetsk People's Republic, Hong Kong, Iran, North Korea, Luhansk People's Republic, Quebec, Russia, Syria, and Venezuela. The full rules also cover sanctions, sponsor and administrator relationships, judges, affiliates, and other conflicts. Verify personal eligibility against the official text rather than relying only on this summary.

Teams are optional and Devpost lists no team-size cap. A team or organization must appoint an eligible representative.

The official rules allow at most one submission per entrant.

## What must be built

Build a WebMCP-powered web app that explores a future where people and agents interact, collaborate, and create together. Existing projects are allowed, but work that predates August 25, 2026 must be meaningfully extended with WebMCP during the submission period, and the new work must be clearly identified.

For Verdiqt, this means WebMCP must be central to the product experience. The submission must demonstrate a person and an agent operating the same live validation trial, with visible state changes, citations, and approval boundaries.

## Required submission artifacts

- A working live URL accessible in ChatGPT's in-app browser or Google Chrome with WebMCP enabled
- A text description explaining why the use case fits WebMCP, how the experience improves, what people and agents can now do together, and how WebMCP was implemented
- A public YouTube demo video shorter than three minutes, with audio, showing the project functioning and explaining the WebMCP use
- A public GitHub, GitLab, or Bitbucket repository with all necessary source code, assets, and setup instructions
- A complete open-source license file that is visible and detectable on the repository page
- The required Devpost form answers, including tested agent or client, AI tools used, learning level, and career value

The live project must remain free to access and available to judges throughout the judging period. The demo must use only material the entrant owns or is authorized to use, including music, footage, imagery, and third-party marks.

If authentication is enabled, provide working judge credentials and testing instructions in the private submission field. Never place shared credentials in the public repository.

## Judging criteria

Section 7 starts with a Stage One pass or fail viability review for theme alignment and reasonable use of the required APIs or SDKs. A submission must pass that gate to reach scored judging.

In Stage Two, section 7 makes the four criteria equally weighted. Each is evaluated on a five-point scale. Ties are resolved by comparing criteria in the listed order until the tie is broken.

1. WebMCP Leverage: substantial, skillful, working, non-trivial use of WebMCP
2. Execution: a coherent runnable product experience, not only a proof of concept
3. Potential Impact: a credible and specific problem, audience, and demonstrated solution
4. Creativity and Ambition: novelty, inventiveness, and differentiation

## Release and testing gate

Before submission:

- Test the deployed app in ChatGPT's in-app browser.
- Test it in the supported Chrome path with WebMCP enabled.
- Exercise every declared WebMCP tool and every approval boundary.
- For every third-party API, SDK, data source, asset, and service, record the applicable authorization, credentials, terms check, and enabled or disabled state. Do not enable a source whose approved use is unresolved.
- Verify the public repository in an incognito window.
- Verify the license is detected on the repository page.
- Verify access is free and remains available through judging, with any required judge credentials tested in a clean session.
- Verify the demo contains no unlicensed music, images, footage, or third-party branding.
- Confirm the live app, README, and video all describe only behavior that is actually working.
- Put the strongest working moment in the first 15 seconds of the demo.
- Confirm all team invitations, if any, have been accepted.
- Confirm the Devpost entry is submitted, not left as a draft.

## Canonical links

- [Challenge home](https://webmcp.devpost.com/)
- [Official rules](https://webmcp.devpost.com/rules)
- [Resources and FAQ](https://webmcp.devpost.com/resources)
- [Discussion board](https://webmcp.devpost.com/forum_topics)
