import Link from "next/link";
import { ArrowRight } from "lucide-react";

// [03] The mid-page bridge: one job, route the visitor into the courtroom
// where the live workspace and the agent registry live.
export function CourtroomCta() {
  return (
    <section
      aria-labelledby="courtroom-cta-title"
      className="mx-auto w-full max-w-[80rem] border-x border-b border-border/90"
    >
      <div className="grid gap-8 px-6 py-20 sm:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span className="mr-2 text-primary">[03]</span>
            The courtroom
          </p>
          <h2
            id="courtroom-cta-title"
            className="mt-4 max-w-[32rem] text-[2.5rem] font-medium leading-[1.1] tracking-normal"
          >
            The proceeding is already in session.
          </h2>
          <p className="mt-4 max-w-[30rem] text-base leading-6 text-foreground/75">
            Step into the live trial workspace: the case dashboard, the tool
            docket your agent can call, and the session record.
          </p>
        </div>
        <div className="lg:justify-self-end">
          <Link
            href="/trial"
            className="cut-action inline-flex h-12 min-w-[14rem] items-center justify-center gap-2 bg-primary px-6 font-mono text-sm font-medium uppercase tracking-[0.07em] text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Enter the courtroom
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
