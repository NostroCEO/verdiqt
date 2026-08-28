// Pure derivations for the live courtroom: phase state machine and progress
// signals, kept out of components so they are unit-testable.

export type TrialStatusValue =
  | "QUEUED"
  | "NORMALIZING"
  | "GATHERING"
  | "CLASSIFYING"
  | "SCORING"
  | "COMPLETE"
  | "FAILED"
  | null;

export type PhaseState = "pending" | "active" | "done" | "failed";

export const PIPELINE_STAGES = [
  "NORMALIZING",
  "GATHERING",
  "CLASSIFYING",
  "SCORING",
] as const;

// Phase 0 = intake, 1 = research, 2 = verdict.
export function phaseIndexFor(status: TrialStatusValue): number {
  if (status === "GATHERING" || status === "CLASSIFYING" || status === "SCORING") {
    return 1;
  }
  if (status === "COMPLETE") return 2;
  // A failed run keeps the user on the research phase, where the failure
  // banner names the reason — never silently back on intake (founder bug
  // report 2026-08-28).
  if (status === "FAILED") return 1;
  return 0;
}

// Once a run starts, phases behind the active one are DONE (they look
// completed), the current one is ACTIVE, later ones PENDING. A failed run
// marks the phase it died in.
export function phaseStates(
  status: TrialStatusValue,
  isLive: boolean,
): [PhaseState, PhaseState, PhaseState] {
  if (!isLive || status === null) {
    return ["active", "pending", "pending"];
  }

  if (status === "FAILED") {
    return ["done", "failed", "pending"];
  }

  const active = phaseIndexFor(status);
  return [0, 1, 2].map((index) =>
    index < active ? "done" : index === active ? "active" : "pending",
  ) as [PhaseState, PhaseState, PhaseState];
}

export type StageState = "pending" | "running" | "done" | "failed";

// The research checklist rows: every stage before the current one is done.
export function stageStates(
  status: TrialStatusValue,
): Record<(typeof PIPELINE_STAGES)[number], StageState> {
  const order: TrialStatusValue[] = [...PIPELINE_STAGES, "COMPLETE"];
  const currentIndex =
    status === "COMPLETE"
      ? order.length - 1
      : order.indexOf(status ?? "QUEUED");

  const result = {} as Record<(typeof PIPELINE_STAGES)[number], StageState>;

  PIPELINE_STAGES.forEach((stage, index) => {
    if (status === "FAILED") {
      // Without a persisted failure stage we mark the first incomplete one.
      result[stage] = index === 0 ? "failed" : "pending";
      return;
    }
    if (status === "COMPLETE" || index < currentIndex) {
      result[stage] = "done";
    } else if (index === currentIndex) {
      result[stage] = "running";
    } else {
      result[stage] = "pending";
    }
  });

  return result;
}

// The signal that fixes "the worker looks dead": ANY progress evidence
// counts, never SSE delivery alone.
export function hasWorkerProgress(input: {
  status: TrialStatusValue;
  evidenceCount: number;
  sawStageEvent: boolean;
}): boolean {
  return (
    input.sawStageEvent ||
    input.evidenceCount > 0 ||
    (input.status !== null && input.status !== "QUEUED")
  );
}

export function isTerminalStatus(status: TrialStatusValue): boolean {
  return status === "COMPLETE" || status === "FAILED";
}

export function isResearchPhase(status: TrialStatusValue): boolean {
  return (
    status === "GATHERING" || status === "CLASSIFYING" || status === "SCORING"
  );
}

// Stable merge for the evidence feed: existing items keep identity (so they
// never re-animate), new items append in server order.
export function mergeEvidenceById<T extends { id: string }>(
  current: T[],
  incoming: T[],
): T[] {
  const known = new Set(current.map((item) => item.id));
  const additions = incoming.filter((item) => !known.has(item.id));
  return additions.length === 0 && incoming.length === current.length
    ? current
    : [...current, ...additions];
}
