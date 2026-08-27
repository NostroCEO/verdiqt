import type { Metadata } from "next";
import { Suspense } from "react";

import { AgentSandbox } from "@/components/landing/agent-sandbox";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TrialDashboard } from "@/components/landing/trial-demo";
import { TrialWorkspace } from "@/components/trial-workspace";

export const metadata: Metadata = {
  title: "Verdiqt | The courtroom",
  description:
    "The live trial workspace: the case dashboard and the tool docket a connected agent can call.",
};

export default function TrialPage() {
  return (
    <main className="editorial-shell relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      <SiteHeader />

      <div className="mx-auto w-full max-w-[80rem] border-x border-b border-border/90 px-6 py-5 sm:px-10">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <span className="mr-2 text-primary">[01]</span>
          The proceeding
          <span className="ml-3 normal-case tracking-normal text-foreground/70">
            The live trial workspace. Phase 1 opens with your case.
          </span>
        </p>
      </div>
      <Suspense fallback={<TrialDashboard />}>
        <TrialWorkspace />
      </Suspense>

      <AgentSandbox />

      <SiteFooter />
    </main>
  );
}
