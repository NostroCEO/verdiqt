import {
  Bot,
  Fingerprint,
  Gavel,
  ScanSearch,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { ChallengeSupporters } from "@/components/landing/challenge-supporters";
import { LandingHero } from "@/components/landing/landing-hero";
import { TrialDemo } from "@/components/landing/trial-demo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const principles = [
  {
    icon: ScanSearch,
    title: "Evidence, not vibes",
    copy: "The designed trial flow ties each finding to a source and a validation dimension.",
  },
  {
    icon: Bot,
    title: "The agent brings breadth",
    copy: "Narrow WebMCP tools let an agent gather context and propose the next useful action.",
  },
  {
    icon: UserRound,
    title: "The human keeps judgment",
    copy: "Approval gates protect consequential work. You pin proof, reject noise, and make the call.",
  },
  {
    icon: Fingerprint,
    title: "Every move stays legible",
    copy: "The planned transcript keeps human and agent actions together in one auditable case history.",
  },
] as const;

export default function Home() {
  return (
    <main className="editorial-shell relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/90 bg-background">
        <div className="mx-auto flex min-h-[4.5rem] w-full max-w-[80rem] items-center justify-between border-x border-border/90 px-5 sm:px-8 lg:px-10">
          <a
            href="#top"
            className="group inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Verdiqt home"
          >
            <span className="grid size-9 place-items-center border border-primary/50 bg-primary text-primary-foreground">
              <Gavel className="size-4.5 transition-transform group-hover:-rotate-6" />
            </span>
            <span className="text-lg font-semibold tracking-[-0.03em]">Verdiqt</span>
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-8 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground md:flex"
          >
            <a className="transition-colors hover:text-foreground" href="#how-it-works">
              The proceeding
            </a>
            <a className="transition-colors hover:text-foreground" href="#principles">
              Human + agent
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:inline-flex">
              <span className="size-1.5 rounded-full bg-build shadow-[0_0_12px_var(--build)]" />
              Foundation live
            </span>
            <Badge variant="outline" className="border-border/90 bg-background font-mono text-[0.62rem] tracking-[0.08em]">
              WebMCP native
            </Badge>
          </div>
        </div>
      </header>

      <LandingHero />
      <ChallengeSupporters />
      <TrialDemo />

      <section
        id="principles"
        aria-labelledby="principles-title"
        className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28"
      >
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div>
            <div className="grid size-11 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              The division of power
            </p>
            <h2
              id="principles-title"
              className="mt-3 max-w-lg text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            >
              One courtroom. Two kinds of judgment.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">
              Verdiqt is designed around collaboration, not autopilot. The agent can
              investigate widely. The human controls what becomes evidence and what
              happens next.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {principles.map((principle) => {
              const Icon = principle.icon;

              return (
                <Card
                  key={principle.title}
                  className="border border-border/75 bg-card/55 transition-transform duration-300 hover:-translate-y-1"
                >
                  <CardHeader>
                    <span className="grid size-9 place-items-center rounded-lg border border-primary/20 bg-primary/8 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <CardTitle className="mt-4 text-base">{principle.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {principle.copy}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-border/80 bg-card/35 px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Built for the agentic web
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
              WebMCP is part of the product, not a demo wrapper.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The intended tools stay narrow, structured, approval-aware, and in
              sync with the human-visible case state.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Read context", "Propose actions", "Request approval", "Return structured results"].map(
              (item) => (
                <span
                  key={item}
                  className="rounded-full border border-border bg-background/55 px-3 py-2 text-xs font-medium text-muted-foreground"
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <footer className="px-5 py-8 text-sm text-muted-foreground sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Verdiqt. Build what deserves to live.</span>
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-build" />
            WebMCP Challenge build in progress
          </span>
        </div>
      </footer>
    </main>
  );
}
