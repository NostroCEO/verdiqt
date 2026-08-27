import { Gavel } from "lucide-react";

import { AgentSandbox } from "@/components/landing/agent-sandbox";
import { ClosingBand } from "@/components/landing/closing-band";
import { LandingHero } from "@/components/landing/landing-hero";
import { ProceduralRecord } from "@/components/landing/procedural-record";
import { TechnologyStack } from "@/components/landing/technology-stack";
import { TrialDashboard } from "@/components/landing/trial-demo";
import { Badge } from "@/components/ui/badge";
import { SITE } from "@/lib/site";

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
            <a className="transition-colors hover:text-foreground" href="#procedural-record">
              The record
            </a>
            <a className="transition-colors hover:text-foreground" href="#trial-preview">
              The proceeding
            </a>
            <a className="transition-colors hover:text-foreground" href="#agent-access">
              Agent access
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:inline-flex">
              <span className="size-1.5 rounded-full bg-build shadow-[0_0_12px_var(--build)]" />
              Build in progress
            </span>
            <Badge variant="outline" className="border-border/90 bg-background font-mono text-[0.62rem] tracking-[0.08em]">
              Human-led
            </Badge>
          </div>
        </div>
      </header>

      <LandingHero />
      <ProceduralRecord />

      <div className="mx-auto w-full max-w-[80rem] border-x border-b border-border/90 px-6 py-5 sm:px-10">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <span className="mr-2 text-primary">[03]</span>
          The proceeding
          <span className="ml-3 normal-case tracking-normal text-foreground/70">
            The live trial workspace. Phase 1 opens with your case.
          </span>
        </p>
      </div>
      <TrialDashboard />

      <AgentSandbox />
      <TechnologyStack />
      <ClosingBand />

      <footer className="border-t border-border/90 px-5 py-8 text-sm text-muted-foreground sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[80rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Verdiqt. Build what deserves to live.</span>
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.68rem] uppercase tracking-[0.08em]">
            <span>{SITE.license} licensed</span>
            {SITE.repoUrl ? (
              <a
                className="transition-colors hover:text-foreground"
                href={SITE.repoUrl}
                rel="noreferrer"
                target="_blank"
              >
                Source
              </a>
            ) : null}
            <span className="inline-flex items-center gap-2 normal-case tracking-normal">
              <span className="size-1.5 rounded-full bg-build" />
              System build in progress
            </span>
          </span>
        </div>
      </footer>
    </main>
  );
}
