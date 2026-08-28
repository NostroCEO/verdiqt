import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Verdiqt | Privacy",
  description: "What Verdiqt stores, for how long, and how to have it deleted.",
};

// Gate A notice (founder decision D19, docs/STATE.md 2026-08-27). Public
// trials are enabled only while this page states the current practice.
export default function PrivacyPage() {
  return (
    <main className="editorial-shell relative isolate min-h-screen bg-background text-foreground">
      <SiteHeader />
      <article className="mx-auto w-full max-w-[80rem] border-x border-b border-border/90 px-6 py-16 sm:px-10">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <span className="mr-2 text-primary">[Privacy]</span>
          Last updated 2026-08-28
        </p>
        <h1 className="mt-4 max-w-[36rem] text-[2.5rem] font-medium leading-[1.1]">
          What Verdiqt stores, and for how long.
        </h1>

        <div className="mt-10 grid max-w-[44rem] gap-8 text-sm leading-6 text-foreground/80">
          <section>
            <h2 className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
              What we store
            </h2>
            <p className="mt-2">
              The idea text or public repository URL you submit, evidence
              snippets gathered from public sources, the resulting scores and
              verdict, an event log of trial activity, and a hashed anonymous
              session identifier. Your session is identified by a random
              cookie; only its hash is stored, and it never appears in URLs or
              results.
            </p>
          </section>
          <section>
            <h2 className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
              How long
            </h2>
            <p className="mt-2">
              Anonymous trials and their data are deleted 30 days after the
              trial completes. Rate-limit counters store a hashed IP for one
              day.
            </p>
          </section>
          <section>
            <h2 className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
              Deletion
            </h2>
            <p className="mt-2">
              Email communication@holding-ayle.com from any address with your
              trial link and we delete the trial and its data. If you later
              sign in with GitHub, we store only your public login and a
              revocable token; unlinking revokes the token and detaches your
              trials.
            </p>
          </section>
          <section>
            <h2 className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
              Third parties
            </h2>
            <p className="mt-2">
              Evidence comes from public APIs (Hacker News, GitHub, Product
              Hunt when enabled). Scoring runs on a hosted open-weights model;
              prompts contain your idea and gathered public snippets, nothing
              else. Nothing is sold or used for advertising.
            </p>
          </section>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
