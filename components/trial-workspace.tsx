"use client";

import { useSearchParams } from "next/navigation";

import { TrialDashboard } from "@/components/landing/trial-demo";

// Bridges the landing intake to the courtroom page: /trial?case=&source=&type=
// becomes the dashboard's initial Phase 1 state. Local preview state only,
// no claim that a server trial exists.
export function TrialWorkspace() {
  const params = useSearchParams();
  const caseName = params.get("case") ?? undefined;
  const source = params.get("source") ?? undefined;
  const type = params.get("type");

  return (
    <TrialDashboard
      initialIntake={
        caseName || source
          ? {
              caseName,
              source,
              inputType: type === "idea" ? "idea" : type === "repo" ? "repo" : undefined,
            }
          : undefined
      }
    />
  );
}
