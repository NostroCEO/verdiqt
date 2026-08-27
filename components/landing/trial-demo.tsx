"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import {
  FileSearch,
  FolderGit2,
  Gavel,
  Scale,
  ScanSearch,
  Terminal,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

const AUTO_ADVANCE_DELAY_MS = 4_800;

const steps = [
  { id: "open", number: "01", label: "Open case", event: "CASE_NORMALIZED" },
  { id: "review", number: "02", label: "Review proof", event: "EVIDENCE_REVIEWED" },
  { id: "verdict", number: "03", label: "Read verdict", event: "VERDICT_COMPOSED" },
] as const;

type PreviewStartDetail = { caseName?: string; source?: string };
type StageProps = { caseLabel: string; sourceLabel: string; reduceMotion: boolean };

function cleanLabel(value: string | undefined, fallback: string, max: number) {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : fallback;
}

function caseNameFromSource(source: string | undefined) {
  const cleaned = source?.trim().replace(/\/$/, "");
  return cleaned?.split("/").at(-1)?.replace(/[-_]+/g, " ");
}

function OpenStage({ caseLabel, sourceLabel, reduceMotion }: StageProps) {
  const claims = [
    ["Audience", "Indie SaaS teams"],
    ["Problem", "Release notes consume launch time"],
    ["Category", "Developer workflow"],
    ["Test", "Paid intent before build"],
  ] as const;

  return (
    <div className="h-full pb-8 sm:pb-14">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.1 : 0.36 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-primary">Stage 01 / Intake</p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.035em] sm:mt-2 sm:text-2xl">Turn a repository into a claim.</h3>
        </div>
        <FolderGit2 className="mt-1 size-4 shrink-0 text-primary" />
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.12, duration: 0.32 }}
        className="mt-3 border border-border bg-background p-2.5 sm:mt-5 sm:p-3"
      >
        <p className="truncate font-mono text-[0.55rem] uppercase tracking-[0.08em] text-muted-foreground">{sourceLabel}</p>
        <p className="mt-1 truncate text-xs font-semibold sm:text-sm">{caseLabel}</p>
      </motion.div>

      <div className="mt-2 grid grid-cols-2 gap-px bg-border sm:mt-3">
        {claims.map(([label, value], index) => (
          <motion.div
            key={label}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.18 + index * 0.055 }}
            className="min-h-12 bg-card p-2 sm:min-h-16 sm:p-3"
          >
            <p className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-primary">{label}</p>
            <p className="mt-1 line-clamp-2 text-[0.65rem] leading-4 text-muted-foreground sm:text-xs">{value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ReviewStage({ reduceMotion }: StageProps) {
  const evidence = [
    ["HN-024", "Teams still assemble release notes by hand", "PINNED"],
    ["WEB-118", "Comparable tools show a paid budget", "PINNED"],
    ["GH-071", "Repository signal lacks buyer intent", "REJECTED"],
  ] as const;

  return (
    <div className="h-full pb-8 sm:pb-14">
      <div className="flex items-start justify-between gap-4">
        <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-primary">Stage 02 / Evidence</p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.035em] sm:mt-2 sm:text-2xl">The agent brings breadth. You judge relevance.</h3>
        </motion.div>
        <ScanSearch className="mt-1 size-4 shrink-0 text-primary" />
      </div>

      <div className="mt-3 space-y-1.5 sm:mt-5 sm:space-y-2">
        {evidence.map(([id, finding, state], index) => (
          <motion.div
            key={id}
            initial={reduceMotion ? false : { opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.08 + index * 0.08, duration: 0.3 }}
            className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-2 border border-border bg-background p-2 sm:grid-cols-[4rem_minmax(0,1fr)_4.5rem] sm:gap-3 sm:p-3"
          >
            <span className="font-mono text-[0.52rem] tracking-[0.08em] text-primary">{id}</span>
            <span className="truncate text-[0.65rem] font-medium sm:text-xs">{finding}</span>
            <span className={cn(
              "border px-1.5 py-1 text-center font-mono text-[0.46rem] font-semibold tracking-[0.06em] sm:text-[0.52rem]",
              state === "PINNED" ? "border-primary/45 bg-primary/10 text-primary" : "border-border text-muted-foreground",
            )}>{state}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.38 }}
        className="mt-2 flex items-center justify-between gap-3 border-l-2 border-primary bg-primary/5 px-3 py-2 sm:mt-3"
      >
        <span className="flex items-center gap-2 text-[0.65rem] font-medium sm:text-xs"><UserRound className="size-3.5 text-primary" />Human review recorded</span>
        <span className="font-mono text-[0.5rem] text-muted-foreground">2 KEEP / 1 DROP</span>
      </motion.div>
    </div>
  );
}

function VerdictStage({ reduceMotion }: StageProps) {
  return (
    <div className="h-full pb-8 sm:pb-14">
      <div className="flex items-start justify-between gap-4">
        <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-primary">Stage 03 / Decision</p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.035em] sm:mt-2 sm:text-2xl">A verdict that tells you what to do next.</h3>
        </motion.div>
        <Gavel className="mt-1 size-4 shrink-0 text-primary" />
      </div>

      <div className="mt-3 grid gap-px border border-border bg-border sm:mt-5 sm:grid-cols-[0.76fr_1.24fr]">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.08, type: "spring", stiffness: 250, damping: 20 }}
          className="flex min-h-24 items-center justify-between bg-build/5 px-4 py-3 text-center sm:min-h-44 sm:flex-col sm:justify-center sm:p-4"
        >
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted-foreground">78 / 100</span>
          <span className="border-2 border-build/70 px-4 py-1.5 text-lg font-extrabold tracking-[0.18em] text-build sm:mt-4 sm:text-2xl">BUILD</span>
          <span className="hidden font-mono text-[0.48rem] text-muted-foreground sm:mt-4 sm:block">BUILD / PIVOT / KILL</span>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.18, duration: 0.34 }}
          className="bg-background p-3 sm:p-4"
        >
          <p className="font-mono text-[0.52rem] uppercase tracking-[0.1em] text-primary">Cheapest next test</p>
          <p className="mt-2 text-xs font-semibold leading-4 sm:text-base sm:leading-5">Pre-sell five release-workflow interviews.</p>
          <p className="mt-2 hidden text-xs leading-5 text-muted-foreground sm:block">Stop if fewer than two teams commit. Estimated effort: four hours.</p>
          <div className="mt-3 flex gap-3 border-t border-border pt-2 font-mono text-[0.48rem] text-muted-foreground sm:mt-4 sm:text-[0.54rem]">
            <span>12 CITATIONS</span><span>1 NEXT MOVE</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function EventRail({ activeStep }: { activeStep: number }) {
  return (
    <aside aria-label="Preview event record" className="min-w-0 border-t border-border bg-background lg:border-l lg:border-t-0">
      <p className="hidden border-b border-border px-3 py-3 font-mono text-[0.52rem] uppercase tracking-[0.1em] text-muted-foreground lg:block">Event record</p>
      <ol className="grid h-full grid-cols-3 lg:block lg:h-auto">
        {steps.map((step, index) => {
          const state = index < activeStep ? "DONE" : index === activeStep ? "ACTIVE" : "QUEUED";
          return (
            <li key={step.id} className="min-w-0 border-r border-border px-2 py-2 last:border-r-0 lg:border-b lg:border-r-0 lg:px-3 lg:py-4">
              <span className="flex items-center gap-1.5 font-mono text-[0.46rem] tracking-[0.06em] lg:text-[0.5rem]">
                <span className={cn("size-1.5 shrink-0", index <= activeStep ? "bg-primary" : "bg-border")} />
                <span className={cn(index === activeStep ? "text-foreground" : "text-muted-foreground")}>{state}</span>
              </span>
              <span className="mt-1 hidden truncate font-mono text-[0.48rem] text-muted-foreground lg:block">{step.event}</span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

export function TrialDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isInView = useInView(sectionRef, { amount: 0.25 });
  const reduceMotion = useReducedMotion() === true;
  const [activeStep, setActiveStep] = useState(0);
  const [sequenceKey, setSequenceKey] = useState(0);
  const [launchTicksRemaining, setLaunchTicksRemaining] = useState(0);
  const [caseLabel, setCaseLabel] = useState("Changelog agent");
  const [sourceLabel, setSourceLabel] = useState("github.com/you/changelog-agent");
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const launchCycleActive = launchTicksRemaining > 0;
  const paused =
    reduceMotion ||
    !isInView ||
    hasFocusWithin ||
    (isHovered && !launchCycleActive);

  useEffect(() => {
    function handlePreviewStart(event: Event) {
      const detail = (event as CustomEvent<PreviewStartDetail>).detail ?? {};
      const nextSource = cleanLabel(detail.source, "Public repository", 80);
      const nextCase = cleanLabel(detail.caseName ?? caseNameFromSource(detail.source), "Untitled case", 48);
      setSourceLabel(nextSource);
      setCaseLabel(nextCase);
      setActiveStep(0);
      setSequenceKey((current) => current + 1);
      setLaunchTicksRemaining(reduceMotion ? 0 : steps.length);
    }
    window.addEventListener("verdiqt:preview-start", handlePreviewStart);
    return () => window.removeEventListener("verdiqt:preview-start", handlePreviewStart);
  }, [reduceMotion]);

  useEffect(() => {
    if (paused) return;
    const timeout = window.setTimeout(() => {
      setActiveStep((current) => (current + 1) % steps.length);
      setSequenceKey((current) => current + 1);
      setLaunchTicksRemaining((current) => Math.max(0, current - 1));
    }, AUTO_ADVANCE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [activeStep, paused, sequenceKey]);

  function selectStep(index: number) {
    setActiveStep(index);
    setSequenceKey((current) => current + 1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const nextByKey: Record<string, number> = {
      ArrowRight: (index + 1) % steps.length,
      ArrowDown: (index + 1) % steps.length,
      ArrowLeft: (index - 1 + steps.length) % steps.length,
      ArrowUp: (index - 1 + steps.length) % steps.length,
      Home: 0,
      End: steps.length - 1,
    };
    const next = nextByKey[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectStep(next);
    tabRefs.current[next]?.focus();
  }

  const active = steps[activeStep];
  const terminalLines = [
    ["$ normalize repository", "claim set: 6 dimensions"],
    ["$ review cited evidence", "human record: 2 keep / 1 drop"],
    ["$ compose grounded verdict", "next test attached"],
  ][activeStep];

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={sectionRef}
        id="how-it-works"
        aria-labelledby="proceeding-title"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setHasFocusWithin(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setHasFocusWithin(false);
        }}
        className="scroll-mt-20 border-b border-border bg-background"
      >
        <div className="mx-auto max-w-[80rem] border-x border-border px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">[02] The proceeding</p>
          <h2 id="proceeding-title" className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">One case. Three decisive moves.</h2>

          <div className="mt-7 sm:mt-10">
            <div role="tablist" aria-label="Trial preview stages" className="grid h-10 grid-cols-3 gap-px border-x border-border bg-border">
              {steps.map((step, index) => {
                const selected = index === activeStep;
                return (
                  <button
                    key={step.id}
                    ref={(node) => { tabRefs.current[index] = node; }}
                    id={`proceeding-tab-${step.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="proceeding-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => selectStep(index)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    className={cn(
                      "relative h-10 min-w-0 border-y border-border bg-background px-1 font-mono text-xs uppercase tracking-[-0.02em] outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-3 sm:tracking-[0.08em]",
                      selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {selected ? <motion.span layoutId="active-preview-tab" className="absolute inset-0 bg-surface-2" transition={{ duration: reduceMotion ? 0 : 0.3 }} /> : null}
                    <span className="relative"><span className="mr-1 text-primary sm:mr-2">{step.number}</span>{step.label}</span>
                    {selected && !reduceMotion ? (
                      <motion.span
                        key={`${step.id}-${paused ? "paused" : sequenceKey}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: paused ? 0 : 1 }}
                        transition={{ duration: paused ? 0 : AUTO_ADVANCE_DELAY_MS / 1_000, ease: "linear" }}
                        className="absolute inset-x-0 bottom-0 h-px origin-left bg-primary"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div id="trial-preview" className="mt-2 flex h-[25rem] scroll-mt-32 flex-col overflow-hidden border border-border bg-card sm:h-[32.5rem]">
              <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 sm:h-12 sm:px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center border border-primary/40 bg-primary/10 text-primary"><Gavel className="size-3" /></span>
                  <span className="shrink-0 font-mono text-[0.52rem] uppercase tracking-[0.08em] text-primary">Product preview</span>
                  <span className="truncate border-l border-border pl-2.5 text-xs font-semibold">{caseLabel}</span>
                </div>
                <span className="shrink-0 font-mono text-[0.52rem] text-muted-foreground">0{activeStep + 1} / 03</span>
              </div>

              <div className="grid min-h-0 flex-1 sm:grid-cols-[3rem_minmax(0,1fr)]">
                <aside aria-label="Preview application navigation" className="hidden flex-col items-center border-r border-border bg-background py-3 sm:flex">
                  {[FolderGit2, FileSearch, UserRound, Scale].map((Icon, index) => (
                    <span key={index} className={cn("mb-2 grid size-8 place-items-center border", index === activeStep ? "border-primary/45 bg-primary/10 text-primary" : "border-transparent text-muted-foreground")}><Icon className="size-3.5" /></span>
                  ))}
                </aside>

                <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_2.5rem] lg:grid-cols-[minmax(0,1fr)_11rem] lg:grid-rows-1">
                  <div
                    id="proceeding-panel"
                    role="tabpanel"
                    aria-labelledby={`proceeding-tab-${active.id}`}
                    tabIndex={0}
                    className="relative min-h-0 min-w-0 overflow-hidden bg-card p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5"
                  >
                    <AnimatePresence initial={false} mode="wait">
                      <motion.div
                        key={`${active.id}-${sequenceKey}`}
                        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
                        className="h-full"
                      >
                        {activeStep === 0 ? <OpenStage caseLabel={caseLabel} sourceLabel={sourceLabel} reduceMotion={reduceMotion} /> : null}
                        {activeStep === 1 ? <ReviewStage caseLabel={caseLabel} sourceLabel={sourceLabel} reduceMotion={reduceMotion} /> : null}
                        {activeStep === 2 ? <VerdictStage caseLabel={caseLabel} sourceLabel={sourceLabel} reduceMotion={reduceMotion} /> : null}
                      </motion.div>
                    </AnimatePresence>

                    <motion.div
                      key={`terminal-${active.id}-${sequenceKey}`}
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reduceMotion ? 0 : 0.34, duration: 0.24 }}
                      aria-hidden="true"
                      className="absolute inset-x-3 bottom-2 flex items-center gap-2 border border-border bg-background/95 px-2 py-1 font-mono text-[0.48rem] text-muted-foreground sm:inset-x-auto sm:bottom-3 sm:right-3 sm:w-64 sm:block sm:px-3 sm:py-2 sm:text-[0.54rem]"
                    >
                      <Terminal className="size-3 shrink-0 text-primary sm:mb-1" />
                      <p className="truncate text-foreground">{terminalLines[0]}</p>
                      <p className="hidden truncate sm:block">{terminalLines[1]}</p>
                    </motion.div>
                  </div>

                  <EventRail activeStep={activeStep} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
