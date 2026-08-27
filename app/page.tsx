import { Gavel } from "lucide-react";

import { TechnologyStack } from "@/components/landing/technology-stack";
import { LandingHero } from "@/components/landing/landing-hero";
import { TrialDemo } from "@/components/landing/trial-demo";
import { Badge } from "@/components/ui/badge";

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
            <a className="transition-colors hover:text-foreground" href="#technology-stack-title">
              The stack
            </a>
            <a className="transition-colors hover:text-foreground" href="#how-it-works">
              Product demo
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:inline-flex">
              <span className="size-1.5 rounded-full bg-build shadow-[0_0_12px_var(--build)]" />
              Foundation live
            </span>
            <Badge variant="outline" className="border-border/90 bg-background font-mono text-[0.62rem] tracking-[0.08em]">
              Human-led
            </Badge>
          </div>
        </div>
      </header>

      <LandingHero />
      <TechnologyStack />
      <TrialDemo />

      <section className="border-y border-border/80 bg-card/35 px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Built for the agentic web
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
              The agent shares the room. You keep the gavel.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Its actions stay narrow, structured, approval-aware, and in sync
              with the human-visible case state.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Read case state", "Propose actions", "Request approval", "Return structured results"].map(
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
            System build in progress
          </span>
        </div>
      </footer>
    </main>
  );
}
