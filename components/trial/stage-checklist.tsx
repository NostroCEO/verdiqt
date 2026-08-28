"use client";

import { Check, CircleDashed, X } from "lucide-react";
import { motion } from "motion/react";

import { PIPELINE_STAGES, stageStates, type TrialStatusValue } from "@/lib/trial-progress";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<(typeof PIPELINE_STAGES)[number], string> = {
  NORMALIZING: "Reading the case",
  GATHERING: "Gathering public evidence",
  CLASSIFYING: "Sorting evidence by dimension",
  SCORING: "Scoring the six dimensions",
};

// The designed loading state: four stage rows that narrate the run. Done
// rows look done (check + primary), the running row pulses its marker via a
// finite-feeling spring driven by state changes only.
export function StageChecklist({
  status,
  failedAtStage,
}: {
  status: TrialStatusValue;
  failedAtStage?: string | null;
}) {
  const states = stageStates(status, failedAtStage);

  return (
    <ol aria-label="Pipeline stages" className="border border-border bg-background">
      {PIPELINE_STAGES.map((stage) => {
        const state = states[stage];

        return (
          <li
            key={stage}
            className={cn(
              "flex min-h-10 items-center gap-3 border-b border-border/60 px-3 transition-colors last:border-b-0 hover:bg-surface",
              state === "pending" && "text-muted-foreground/60",
            )}
          >
            <span className="grid size-5 shrink-0 place-items-center border border-border">
              {state === "done" ? (
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", visualDuration: 0.25, bounce: 0.4 }}
                >
                  <Check className="size-3 text-primary" />
                </motion.span>
              ) : state === "running" ? (
                <CircleDashed className="size-3 animate-spin text-primary motion-reduce:animate-none" />
              ) : state === "failed" ? (
                <X className="size-3 text-kill" />
              ) : (
                <span className="size-1.5 bg-border" />
              )}
            </span>
            {state === "running" ? (
              <motion.span
                animate={{ opacity: [1, 0.55, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="flex-1 text-xs text-foreground motion-reduce:animate-none"
              >
                {STAGE_LABELS[stage]}
              </motion.span>
            ) : (
              <span
                className={cn(
                  "flex-1 text-xs",
                  state === "done" && "text-foreground/80",
                )}
              >
                {STAGE_LABELS[stage]}
              </span>
            )}
            <span className="font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">
              {state === "running" ? "In progress" : state === "done" ? "Done" : state === "failed" ? "Failed" : "Waiting"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
