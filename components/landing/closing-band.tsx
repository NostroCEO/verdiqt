"use client";

import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";

// [06] Closing band: returns the reader to the intake, focuses the input,
// and preserves anything already typed. No claims of live research.
export function ClosingBand() {
  function returnToIntake() {
    const input = document.getElementById("trial-input");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.getElementById("top")?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });

    if (input instanceof HTMLInputElement) {
      input.focus({ preventScroll: true });
    }
  }

  return (
    <section
      aria-labelledby="closing-band-title"
      className="mx-auto w-full max-w-[80rem] border-x border-b border-border/90"
    >
      <div className="grid gap-8 px-6 py-24 sm:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span className="mr-2 text-primary">[06]</span>
            Open the case
          </p>
          <h2
            id="closing-band-title"
            className="mt-4 max-w-[30rem] text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.04em]"
          >
            The court is ready when you are.
          </h2>
        </div>
        <div className="lg:justify-self-end">
          <Button
            type="button"
            size="lg"
            onClick={returnToIntake}
            className="cut-action h-12 min-w-[14rem] rounded-none px-6 font-mono text-sm font-medium uppercase tracking-[0.07em]"
          >
            Open the case
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  );
}
