"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Database,
  FileSearch,
  FolderGit2,
  Gavel,
  LockKeyhole,
  Scale,
  Server,
  Terminal,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useSyncExternalStore } from "react";
import { useTrialLive } from "@/lib/hooks/use-trial-live";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { ArchiveRail } from "@/components/trial/archive-rail";
import { GavelStrike } from "@/components/trial/gavel-strike";
import { ResearchPane } from "@/components/trial/research-pane";
import { VerdictPane } from "@/components/trial/verdict-pane";
import { phaseIndexFor, phaseStates } from "@/lib/trial-progress";
import {
  getAgentChannelSnapshot,
  getAgentChannelServerSnapshot,
  subscribeAgentChannel,
} from "@/lib/webmcp/bus";

// T5.2: the panel mirrors the provider's real registration state instead of
// hardcoded copy. One line per state, dashboard rail is one of exactly two
// status surfaces on the page (the other is the footer).
function AgentChannelPanel() {
  const snapshot = useSyncExternalStore(
    subscribeAgentChannel,
    getAgentChannelSnapshot,
    getAgentChannelServerSnapshot,
  );

  const line = (() => {
    switch (snapshot.state) {
      case "checking":
        return "Agent channel: checking browser";
      case "unsupported":
        return "Agent channel: no agent client in this browser";
      case "registering":
        return "Agent channel: registering tools";
      case "registered":
        return `Agent channel: ${snapshot.totalCount} tools registered`;
      case "partial":
        return `Agent channel: ${snapshot.registeredCount} of ${snapshot.totalCount} tools registered`;
      case "failed":
        return "Agent channel: registration error";
    }
  })();

  return (
    <div className="border-t border-border p-3">
      <p className="font-mono text-[0.48rem] uppercase tracking-[0.08em] text-muted-foreground">
        Agent channel
      </p>
      <p aria-live="polite" className="mt-2 text-xs leading-5 text-foreground">
        {line}
      </p>
    </div>
  );
}

const phases = [
  { id: "intake", number: "01", label: "Intake" },
  { id: "research", number: "02", label: "Research" },
  { id: "verdict", number: "03", label: "Verdict" },
] as const;

type IntakeMode = "repo" | "idea";

type PreviewStartDetail = {
  caseName?: string;
  source?: string;
  inputType?: IntakeMode;
};

type DashboardIntake = {
  caseLabel: string;
  sourceLabel: string;
  inputType: IntakeMode;
  hasInput: boolean;
};

function cleanLabel(value: string | undefined, fallback: string, max: number) {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : fallback;
}

function inferInputType(source: string | undefined): IntakeMode {
  return source?.includes("github.com/") ? "repo" : "idea";
}

function SystemRow({
  icon: Icon,
  label,
  value,
  active = false,
}: {
  icon: typeof Server;
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <li className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0">
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
        <span className="truncate text-[0.68rem] text-foreground sm:text-xs">{label}</span>
      </span>
      <span
        className={cn(
          "shrink-0 font-mono text-[0.48rem] uppercase tracking-[0.06em]",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </li>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-20 border border-border bg-background p-3">
      <p className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
    </div>
  );
}

type TrialStartedDetail = PreviewStartDetail & { runId?: string };

export function TrialDashboard({
  initialIntake,
  initialRunId,
}: {
  initialIntake?: PreviewStartDetail;
  initialRunId?: string;
} = {}) {
  const [intake, setIntake] = useState<DashboardIntake>(() =>
    initialIntake && (initialIntake.caseName || initialIntake.source)
      ? {
          caseLabel: cleanLabel(initialIntake.caseName, "Untitled case", 64),
          sourceLabel: cleanLabel(initialIntake.source, "No input supplied", 120),
          inputType:
            initialIntake.inputType ?? inferInputType(initialIntake.source),
          hasInput: true,
        }
      : {
          caseLabel: "No case loaded",
          sourceLabel: "File a case above",
          inputType: "repo",
          hasInput: false,
        },
  );

  const [runId, setRunId] = useState<string | null>(initialRunId ?? null);
  const live = useTrialLive(runId);

  useEffect(() => {
    function applyDetail(detail: TrialStartedDetail) {
      setIntake({
        caseLabel: cleanLabel(detail.caseName, "Untitled case", 64),
        sourceLabel: cleanLabel(detail.source, "No input supplied", 120),
        inputType: detail.inputType ?? inferInputType(detail.source),
        hasInput: true,
      });
      if (detail.runId) {
        setRunId(detail.runId);
        // A new case starts on the pipeline's clock, never on a tab pinned
        // during the previous case.
        setChosenView(null);
      }
    }

    function handlePreviewStart(event: Event) {
      applyDetail((event as CustomEvent<TrialStartedDetail>).detail ?? {});
    }

    window.addEventListener("verdiqt:preview-start", handlePreviewStart);
    window.addEventListener("verdiqt:trial-started", handlePreviewStart);
    return () => {
      window.removeEventListener("verdiqt:preview-start", handlePreviewStart);
      window.removeEventListener("verdiqt:trial-started", handlePreviewStart);
    };
  }, []);

  const router = useRouter();
  // null = the view follows the pipeline; a number = the user chose a tab.
  const [chosenView, setChosenView] = useState<number | null>(null);

  const isLive = runId !== null;
  const activePhase = isLive ? phaseIndexFor(live.status) : 0;
  const states = phaseStates(live.status, isLive);
  const failed = live.status === "FAILED";

  // The pipeline advancing always retakes the window (founder rule: phase 1
  // to phase 2 must actually switch). A manual tab choice holds only until
  // the run reaches its next phase.
  const lastActivePhaseRef = useRef(activePhase);
  useEffect(() => {
    if (activePhase !== lastActivePhaseRef.current) {
      lastActivePhaseRef.current = activePhase;
      setChosenView(null);
    }
  }, [activePhase]);

  const displayedView = isLive ? (chosenView ?? activePhase) : 0;

  function switchRun(nextRunId: string) {
    setRunId(nextRunId);
    setChosenView(null);
    router.replace("/trial?run=" + encodeURIComponent(nextRunId));
  }

  function returnToIntake() {
    const input = document.getElementById("trial-input");

    // Both pages carry a filing control with this id (hero on /, the
    // courtroom intake on /trial); scroll to whichever hosts us.
    if (!input) {
      window.location.assign("/#top");
      return;
    }

    input.scrollIntoView({ behavior: "auto", block: "center" });
    input.focus({ preventScroll: true });
  }

  return (
    <div
      id="how-it-works"
      className="editorial-light scroll-mt-20 border-b border-border bg-background text-foreground"
    >
      <div className="mx-auto max-w-[80rem] border-x border-border p-3 sm:p-6 lg:p-8">
        <div
          id="trial-preview"
          data-active-phase="intake"
          className="editorial-dark-frame scroll-mt-24 overflow-hidden border border-border bg-card text-foreground"
        >
          <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-3 py-2 sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center border border-primary/40 bg-primary/10 text-primary">
                <Gavel className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[0.48rem] uppercase tracking-[0.1em] text-primary sm:text-[0.52rem]">
                  Verdiqt trial dashboard
                </p>
                <p className="truncate text-xs font-semibold sm:text-sm">{intake.caseLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "border px-2 py-1 font-mono text-[0.48rem] uppercase tracking-[0.07em]",
                  failed
                    ? "border-kill/50 bg-kill/10 text-kill"
                    : "border-primary/40 bg-primary/10 text-primary",
                )}
              >
                {failed ? "Trial failed" : `Phase 0${activePhase + 1} active`}
              </span>
              <span className="hidden border border-border px-2 py-1 font-mono text-[0.48rem] uppercase tracking-[0.07em] text-muted-foreground sm:inline-flex">
                {isLive
                  ? live.status === "COMPLETE"
                    ? "Run complete"
                    : live.workerSeen
                      ? "Worker running"
                      : "Run queued"
                  : "No backend run"}
              </span>
            </div>
          </header>

          <nav aria-label="Trial phases" className="grid h-11 grid-cols-3 gap-px bg-border">
            {phases.map((phase, index) => {
              const phaseState = states[index as 0 | 1 | 2];
              const viewed = index === displayedView;
              // Locks exist only BEFORE a run starts; once live, every
              // phase is viewable (founder rule).
              const clickable = isLive || index === 0;

              return (
                <button
                  key={phase.id}
                  type="button"
                  aria-current={viewed ? "step" : undefined}
                  disabled={!clickable}
                  onClick={() => (isLive ? setChosenView(index) : undefined)}
                  className={cn(
                    "relative min-w-0 border-y border-border px-2 font-mono text-[0.58rem] uppercase tracking-[0.04em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:text-xs sm:tracking-[0.08em]",
                    viewed
                      ? "bg-surface-2 text-foreground"
                      : clickable
                        ? "bg-background text-muted-foreground hover:bg-surface hover:text-foreground"
                        : "cursor-not-allowed bg-background text-muted-foreground/50",
                    phaseState === "failed" && "text-kill",
                  )}
                >
                  <span className="mr-1.5 text-primary sm:mr-2">{phase.number}</span>
                  {phase.label}
                  {phaseState === "done" ? (
                    <Check className="ml-1.5 inline size-3 text-primary" />
                  ) : !clickable ? (
                    <LockKeyhole className="ml-1.5 inline size-2.5" />
                  ) : null}
                  {viewed ? (
                    <motion.span
                      layoutId="trial-phase-underline"
                      className="absolute inset-x-0 bottom-0 h-px bg-primary"
                    />
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="grid min-h-[34rem] lg:grid-cols-[3.25rem_minmax(0,1fr)_15rem]">
            <aside
              aria-label="Dashboard navigation"
              className="hidden border-r border-border bg-background py-3 lg:block"
            >
              {[FolderGit2, FileSearch, UserRound, Scale, BarChart3].map((Icon, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={index === 0 ? "Intake view" : "Locked dashboard view"}
                  disabled={index !== 0}
                  className={cn(
                    "mx-auto mb-2 grid size-8 place-items-center border",
                    index === 0
                      ? "border-primary/45 bg-primary/10 text-primary"
                      : "cursor-not-allowed border-transparent text-muted-foreground/35",
                  )}
                >
                  <Icon className="size-3.5" />
                </button>
              ))}
            </aside>

            <main className="min-w-0 bg-card p-3 sm:p-5 lg:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[0.52rem] uppercase tracking-[0.1em] text-primary">
                    {isLive
                      ? `Phase 0${displayedView + 1} / ${phases[displayedView].label}`
                      : "Phase 01 / Trial intake"}
                  </p>
                  <h2 className="mt-2 flex items-center gap-3 text-xl font-semibold tracking-[-0.04em] sm:text-2xl">
                    {failed
                      ? "The trial failed. File the case again."
                      : isLive
                        ? live.status === "COMPLETE"
                          ? "The verdict is in."
                          : "The court is in session."
                        : intake.hasInput
                          ? "Input loaded. Ready for trial creation."
                          : "Waiting for a case."}
                    {isLive && live.status === "COMPLETE" && !failed ? (
                      <GavelStrike key={runId ?? "verdict"} />
                    ) : null}
                  </h2>
                  <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
                    {isLive
                      ? "Only persisted pipeline state advances these phases; every value below is read from the live trial."
                      : "Phase 1 remains selected until the real trial API accepts this input. Research and verdict cannot be opened early."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={returnToIntake}
                  className="h-9 border border-border bg-background px-3 font-mono text-[0.56rem] uppercase tracking-[0.07em] text-foreground outline-none hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {intake.hasInput ? "Change input" : "Add GitHub URL"}
                </button>
              </div>

              <div className="mt-5 border border-border bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                  <span className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-muted-foreground">
                    Current case
                  </span>
                  <span
                    className={cn(
                      "border px-2 py-1 font-mono text-[0.48rem] uppercase tracking-[0.06em]",
                      intake.hasInput
                        ? "border-primary/45 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {intake.hasInput ? "Input ready" : "Waiting"}
                  </span>
                </div>
                <div className="grid gap-px bg-border sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <div className="min-w-0 bg-background p-3">
                    <p className="truncate text-sm font-semibold">{intake.caseLabel}</p>
                    <p className="mt-1 truncate font-mono text-[0.52rem] text-muted-foreground sm:text-[0.58rem]">
                      {intake.sourceLabel}
                    </p>
                  </div>
                  <div className="bg-background p-3">
                    <p className="font-mono text-[0.48rem] uppercase tracking-[0.08em] text-muted-foreground">
                      Input type
                    </p>
                    <p className="mt-1 text-xs text-foreground">
                      {intake.inputType === "repo" ? "Public repository" : "SaaS idea"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <MetricCard label="Evidence" value={String(live.evidenceCount)} />
                <MetricCard
                  label="Score"
                  value={live.compositeScore !== null ? String(live.compositeScore) : "--"}
                />
                <MetricCard label="Verdict" value={live.verdict ?? "--"} />
              </div>

              {isLive ? (
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={displayedView}
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -28 }}
                    transition={{ type: "spring", visualDuration: 0.45, bounce: 0.16 }}
                    className="mt-3"
                  >
                    {displayedView === 0 ? (
                      live.caseFile ? (
                        <div className="border border-border bg-background p-4">
                          <p className="font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">
                            The case as the court read it
                          </p>
                          <p className="mt-2 text-sm text-foreground">
                            {live.caseFile.oneLiner}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-foreground/70">
                            Audience: {live.caseFile.audience}. Problem:{" "}
                            {live.caseFile.problem}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {live.caseFile.keywords.map((keyword) => (
                              <span
                                key={keyword}
                                className="border border-border px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.06em] text-muted-foreground"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="border border-border bg-background p-4 text-xs leading-5 text-foreground/80">
                          The case is filed and the run is live. The court is
                          reading it now; Phase 2 shows the research as it
                          happens and Phase 3 holds the verdict.
                        </div>
                      )
                    ) : displayedView === 1 ? (
                      <ResearchPane
                        status={live.status}
                        evidence={live.evidence}
                        sourceStates={live.sourceStates}
                      />
                    ) : (
                      <VerdictPane live={live} onFileAnother={returnToIntake} />
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="mt-3 grid gap-px bg-border sm:grid-cols-2">
                  <div className="min-h-28 bg-background p-3">
                    <p className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-muted-foreground">
                      Evidence feed
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <LockKeyhole className="size-3.5" />
                      Locked until the case is filed.
                    </div>
                  </div>
                  <div className="min-h-28 bg-background p-3">
                    <p className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-muted-foreground">
                      Gauge and radar
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <LockKeyhole className="size-3.5" />
                      Locked until a real verdict exists.
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 border border-border bg-background px-3 py-2 font-mono text-[0.52rem] text-muted-foreground">
                <Terminal className="size-3 text-primary" />
                <span className="truncate text-foreground">
                  {isLive
                    ? `$ ${live.lastEventKind ?? "run accepted"}`
                    : intake.hasInput
                      ? "$ input loaded into phase 01"
                      : "$ waiting for github input"}
                </span>
                <span className="ml-auto hidden shrink-0 sm:inline">
                  {isLive ? `pipeline: ${(live.status ?? "queued").toLowerCase()}` : "pipeline: idle"}
                </span>
              </div>
            </main>

            <aside className="border-t border-border bg-background lg:border-l lg:border-t-0">
              <div className="border-b border-border px-3 py-3">
                <p className="font-mono text-[0.5rem] uppercase tracking-[0.09em] text-muted-foreground">
                  System
                </p>
                <p className="mt-1 text-xs font-semibold text-foreground">Current connections</p>
              </div>
              <ul>
                <SystemRow
                  icon={Activity}
                  label="Intake UI"
                  value={intake.hasInput ? "Ready" : "Waiting"}
                  active
                />
                <SystemRow
                  icon={Server}
                  label="Trial API"
                  value={live.connected ? "Connected" : "Not connected"}
                  active={live.connected}
                />
                <SystemRow
                  icon={Database}
                  label="Postgres"
                  value={live.connected ? "Connected" : "Not connected"}
                  active={live.connected}
                />
                <SystemRow
                  icon={Activity}
                  label="Worker"
                  value={live.workerSeen ? "Running" : "Not connected"}
                  active={live.workerSeen}
                />
              </ul>
              <ArchiveRail activeRunId={runId} onSelect={switchRun} />
              <AgentChannelPanel />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
