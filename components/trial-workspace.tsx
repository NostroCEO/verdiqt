"use client";

import { useSearchParams } from "next/navigation";

import { TrialDashboard } from "@/components/landing/trial-demo";

// Bridges the landing intake to the courtroom page: /trial?case=&source=&type=
// becomes the dashboard's initial Phase 1 state. Local preview state only,
// no claim that a server trial exists.
export function TrialWorkspace() {
  const params = useSearchParams();
  const runId = params.get("run") ?? undefined;
  const caseName = params.get("case") ?? undefined;
  const source = params.get("source") ?? undefined;
  const type = params.get("type");

  return (
    <TrialDashboard
      initialRunId={runId}
      initialIntake={
        caseName || source || runId
          ? {
              caseName: caseName ?? (runId ? "Case in session" : undefined),
              source: source ?? (runId ? "Live trial" : undefined),
              inputType: type === "idea" ? "idea" : type === "repo" ? "repo" : undefined,
            }
          : undefined
      }
    />
  );
}
