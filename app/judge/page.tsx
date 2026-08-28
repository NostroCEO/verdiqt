import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Verdiqt | Judge access",
  description: "Exchange a judge access code for unrestricted trial creation.",
};

// The ONLY surface that accepts the judge code: a form body posting to the
// exchange route. The resulting cookie bypasses the anonymous creation
// limit and nothing else.
export default function JudgePage() {
  return (
    <main className="editorial-shell relative isolate min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto w-full max-w-[80rem] border-x border-b border-border/90 px-6 py-20 sm:px-10">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <span className="mr-2 text-primary">[Judge]</span>
          Access exchange
        </p>
        <h1 className="mt-4 max-w-[30rem] text-[2.5rem] font-medium leading-[1.1]">
          Enter the judge access code.
        </h1>
        <p className="mt-4 max-w-[30rem] text-sm leading-6 text-foreground/75">
          The code lifts the daily anonymous trial limit for this browser. It
          grants nothing else.
        </p>
        <form
          method="post"
          action="/api/judge-access"
          className="mt-8 flex max-w-[26rem] flex-col gap-2 sm:flex-row"
        >
          <label htmlFor="judge-code" className="sr-only">
            Judge access code
          </label>
          <input
            id="judge-code"
            name="code"
            type="password"
            autoComplete="off"
            required
            className="h-11 min-w-0 flex-1 border border-border bg-surface px-4 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Access code"
          />
          <button
            type="submit"
            className="cut-action h-11 min-w-[9rem] bg-primary px-5 font-mono text-sm font-medium uppercase tracking-[0.07em] text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Unlock
          </button>
        </form>
      </section>
      <SiteFooter />
    </main>
  );
}
