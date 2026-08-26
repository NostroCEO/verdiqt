"use client";

import { useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  ArrowRight,
  Bot,
  Check,
  FileSearch,
  FolderGit2,
  GitBranch,
  Gavel,
  RotateCcw,
  ScanSearch,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: "case",
    number: "01",
    title: "Open the case",
    copy: "Name the claim. Add an idea or a public repository. Set what the court should test.",
  },
  {
    id: "evidence",
    number: "02",
    title: "Examine evidence",
    copy: "The agent gathers sourced signals while you pin useful proof and reject noise.",
  },
  {
    id: "verdict",
    number: "03",
    title: "Make the call",
    copy: "Six dimensions resolve into BUILD, PIVOT, or KILL, plus the cheapest next test.",
  },
] as const;

function CasePanel({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="grid min-h-[26rem] gap-4 p-4 sm:p-6 lg:grid-cols-[0.78fr_1.22fr]">
      <motion.aside
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.38 }}
        className="rounded-xl border border-border/80 bg-background/45 p-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          <FolderGit2 className="size-4" />
          Public repository
        </div>
        <p className="mt-5 break-all text-sm font-semibold">github.com/you/your-saas</p>
        <div className="mt-5 space-y-2 text-xs text-muted-foreground">
          <p className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
            <span>Visibility</span>
            <span className="text-foreground">Public</span>
          </p>
          <p className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
            <span>Mode</span>
            <span className="text-foreground">Evidence first</span>
          </p>
          <p className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
            <span>Approval gates</span>
            <span className="text-foreground">Required</span>
          </p>
        </div>
      </motion.aside>

      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.08, duration: 0.4 }}
        className="rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Claim 01
          </span>
          <Badge variant="outline" className="border-border bg-card/60">
            DRAFT
          </Badge>
        </div>
        <h3 className="mt-7 max-w-lg text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
          Founders need a faster way to decide what deserves to be built.
        </h3>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          The court will test urgency, willingness to pay, competition, reach,
          execution cost, and timing. The human keeps final control over what
          counts as evidence.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {["Demand", "Monetization", "Competition", "Build cost"].map(
            (dimension, index) => (
              <motion.span
                key={dimension}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.2 + index * 0.04 }}
                className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground"
              >
                {dimension}
              </motion.span>
            ),
          )}
        </div>
      </motion.div>
    </div>
  );
}

function EvidenceRoute({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <svg
      viewBox="0 0 420 80"
      className="h-auto w-full text-primary"
      role="img"
      aria-labelledby="evidence-route-title"
    >
      <title id="evidence-route-title">
        Three evidence sources converging on human review
      </title>
      <path
        d="M18 18H126C160 18 160 40 194 40H238"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1.5"
      />
      <path
        d="M18 40H238"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1.5"
      />
      <path
        d="M18 62H126C160 62 160 40 194 40H238"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1.5"
      />
      <motion.path
        d="M18 18H126C160 18 160 40 194 40H238M18 40H238M18 62H126C160 62 160 40 194 40H238M238 40H396"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: reduceMotion ? 0.15 : 1.15, ease: "easeInOut" }}
      />
      {[18, 40, 62].map((y, index) => (
        <motion.circle
          key={y}
          cx="18"
          cy={y}
          r="4"
          fill="currentColor"
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.18 + index * 0.12 }}
        />
      ))}
      <motion.circle
        cx="396"
        cy="40"
        r="7"
        fill="currentColor"
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: reduceMotion ? 0 : 0.9, type: "spring" }}
      />
    </svg>
  );
}

function EvidencePanel({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="grid min-h-[26rem] gap-4 p-4 sm:p-6 lg:grid-cols-[1.18fr_0.82fr]">
      <div className="rounded-xl border border-border/80 bg-background/45 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Evidence route
          </p>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Simulated
          </span>
        </div>
        <div className="my-3 rounded-lg border border-border/70 bg-card/55 px-2 py-3">
          <EvidenceRoute reduceMotion={reduceMotion} />
        </div>
        <div className="space-y-2.5">
          {[
            ["Founder forums", "Recurring pain confirmed", "PINNED"],
            ["Open web", "Existing budgets found", "PINNED"],
            ["Public GitHub", "Build surface mapped", "REVIEW"],
          ].map(([source, finding, status], index) => (
            <motion.div
              key={source}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : index * 0.04 }}
              className="flex items-center gap-3 rounded-lg border border-border/75 bg-card/55 p-3"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <ScanSearch className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted-foreground">{source}</span>
                <span className="mt-0.5 block truncate text-sm font-medium">
                  {finding}
                </span>
              </span>
              <span className="text-[0.68rem] font-semibold text-primary">{status}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.aside
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.18 }}
        className="flex flex-col rounded-xl border border-border/80 bg-surface-2/55 p-4"
      >
        <div className="flex items-center gap-2 border-b border-border/70 pb-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <Bot className="size-4 text-primary" />
          Agent activity preview
        </div>
        <div className="flex-1 space-y-4 py-5 font-mono text-xs leading-5">
          <p className="text-muted-foreground">
            <span className="text-primary">01</span> Frame the validation claims
          </p>
          <p className="text-muted-foreground">
            <span className="text-primary">02</span> Collect public signals
          </p>
          <p className="text-muted-foreground">
            <span className="text-primary">03</span> Request human review
          </p>
          <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-foreground">
            Three evidence cards are ready for judgment.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <UserRound className="size-4" />
            Human approval
          </span>
          <Badge className="border-primary/25 bg-primary/10 text-primary">
            REQUIRED
          </Badge>
        </div>
      </motion.aside>
    </div>
  );
}

function VerdictPanel({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="grid min-h-[26rem] gap-4 p-4 sm:p-6 lg:grid-cols-[0.82fr_1.18fr]">
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.42 }}
        className="relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-xl border border-build/30 bg-build/5 p-6 text-center"
      >
        <div className="verdict-rings absolute inset-0" aria-hidden="true" />
        <span className="relative text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Composite score
        </span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.18 }}
          className="relative mt-4 text-6xl font-semibold tracking-[-0.07em] text-build"
        >
          78
          <span className="ml-2 inline-block text-lg tracking-normal text-muted-foreground">
            /100
          </span>
        </motion.span>
        <motion.span
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.35, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: -6 }}
          transition={{
            delay: reduceMotion ? 0 : 0.38,
            type: "spring",
            stiffness: 260,
            damping: 18,
          }}
          className="relative mt-7 rounded-lg border-2 border-build/75 bg-build/10 px-6 py-2 text-lg font-extrabold tracking-[0.2em] text-build"
        >
          BUILD
        </motion.span>
      </motion.div>

      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.12 }}
        className="rounded-xl border border-border/80 bg-background/45 p-5 sm:p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          The evidence is in
        </p>
        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
          This one deserves a narrow first build.
        </h3>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          The problem is sharp and reachable. The court still sees pricing risk,
          so the next move is a paid-intent test before the full product.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {["6 cited findings", "2 assumptions challenged", "1 approval gate", "1 next test"].map(
            (item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.28 + index * 0.04 }}
                className="flex items-center gap-2 rounded-lg border border-border/75 bg-card/55 p-3 text-sm"
              >
                <Check className="size-4 shrink-0 text-build" />
                {item}
              </motion.div>
            ),
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
              Cheapest next test
            </p>
            <p className="mt-1.5 text-sm font-medium">Pre-sell five founder interviews</p>
          </div>
          <ArrowRight className="size-5 shrink-0 text-primary" />
        </div>
      </motion.div>
    </div>
  );
}

export function TrialDemo() {
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion === true;
  const [activeStep, setActiveStep] = useState(0);
  const [replayKey, setReplayKey] = useState(0);

  const active = steps[activeStep];

  function selectStep(index: number) {
    setActiveStep(index);
    setReplayKey((current) => current + 1);
  }

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="how-it-works"
        aria-labelledby="proceeding-title"
        className="editorial-light border-b border-border bg-background text-foreground"
      >
        <div className="mx-auto max-w-[80rem] border-x border-border px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                [02] The proceeding
              </p>
              <h2
                id="proceeding-title"
                className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl"
              >
                Three moves. No guessing.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground lg:text-right">
              An interactive product walkthrough. Select each stage to see how a
              repository becomes an evidence-backed decision.
            </p>
          </div>

          <div
            className="grid gap-px overflow-hidden rounded-2xl border border-border/85 bg-border/85 md:grid-cols-3"
            role="tablist"
            aria-label="Trial walkthrough stages"
          >
            {steps.map((step, index) => {
              const selected = index === activeStep;

              return (
                <button
                  key={step.id}
                  id={"proceeding-tab-" + step.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="proceeding-panel"
                  onClick={() => selectStep(index)}
                  className={cn(
                    "relative min-h-36 bg-background p-5 text-left outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-6",
                    selected ? "text-foreground" : "text-muted-foreground hover:bg-card",
                  )}
                >
                  {selected ? (
                    <motion.span
                      layoutId="active-proceeding-step"
                      className="absolute inset-0 bg-foreground/[0.04]"
                      transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    />
                  ) : null}
                  <span className="relative text-xs font-semibold tracking-[0.16em] text-primary">
                    {step.number}
                  </span>
                  <span className="relative mt-4 block text-base font-semibold text-foreground">
                    {step.title}
                  </span>
                  <span className="relative mt-2 block text-sm leading-5">
                    {step.copy}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border/85 bg-card/60">
            <div className="flex flex-col gap-3 border-b border-border/80 bg-background/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  {activeStep === 0 ? (
                    <GitBranch className="size-4" />
                  ) : activeStep === 1 ? (
                    <FileSearch className="size-4" />
                  ) : (
                    <Gavel className="size-4" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold">Trial room walkthrough</p>
                  <p className="text-xs text-muted-foreground">
                    Stage {activeStep + 1} of {steps.length}: {active.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border bg-card/60">
                  SIMULATED
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplayKey((current) => current + 1)}
                  aria-label={"Replay " + active.title + " animation"}
                >
                  <RotateCcw className="size-3.5" />
                  Replay
                </Button>
              </div>
            </div>

            <div
              id="proceeding-panel"
              role="tabpanel"
              aria-labelledby={"proceeding-tab-" + active.id}
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={active.id + "-" + replayKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0.1 : 0.22 }}
                >
                  {activeStep === 0 ? (
                    <CasePanel reduceMotion={reduceMotion} />
                  ) : activeStep === 1 ? (
                    <EvidencePanel reduceMotion={reduceMotion} />
                  ) : (
                    <VerdictPanel reduceMotion={reduceMotion} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
