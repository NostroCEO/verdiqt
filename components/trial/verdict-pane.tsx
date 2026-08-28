"use client";

import { useState } from "react";
import { ChevronDown, Scale } from "lucide-react";
import { motion } from "motion/react";

import { LiveVerdictPanel, scoreToneClass } from "@/components/landing/live-verdict-panel";
import type { LiveTrialState } from "@/lib/hooks/use-trial-live";
import { cn } from "@/lib/utils";

// Human explanations for the pipeline's typed error codes.
export function explainErrorCode(code: string | null): string {
  if (!code) return "File the case again; every stage reports its progress.";
  if (code.startsWith("github_http")) {
    return "GitHub rate-limited the repository lookup. Retry in a minute, or file the idea as text instead.";
  }
  if (code.includes("INFERENCE_API_KEY")) {
    return "The scoring model is not configured on the server yet.";
  }
  if (code.startsWith("llm_") || code.startsWith("classification")) {
    return "The scoring model returned an unusable answer. Filing again usually succeeds.";
  }
  return `Reason: ${code}`;
}

// Phase 3: deliberation state while scoring, then the real charts plus the
// RAG-grounded rationale accordion with [ev:id] citations.
export function VerdictPane({
  live,
  onFileAnother,
}: {
  live: LiveTrialState;
  onFileAnother: () => void;
}) {
  const [openDimension, setOpenDimension] = useState<string | null>(null);

  if (live.status !== "COMPLETE") {
    return (
      <div className="border border-border bg-background p-6 text-center">
        <Scale className="mx-auto size-5 text-primary" />
        <p className="mt-3 text-sm text-foreground">
          {live.status === "FAILED"
            ? "The trial failed before a verdict was reached."
            : "The court is deliberating."}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {live.status === "FAILED"
            ? explainErrorCode(live.errorCode)
            : "The verdict unlocks the moment scoring completes."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {live.compositeScore !== null &&
      live.verdict &&
      live.dimensions &&
      live.dimensions.length === 6 ? (
        <LiveVerdictPanel
          compositeScore={live.compositeScore}
          verdict={live.verdict}
          dimensions={live.dimensions}
          pivotDirection={live.pivotDirection}
          nextStepAction={live.nextStepAction}
        />
      ) : (
        <p className="text-xs text-muted-foreground">Loading the verdict…</p>
      )}

      {live.dimensions ? (
        <div className="mt-4 border border-border bg-background">
          <p className="border-b border-border px-3 py-2 font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">
            The reasoning, grounded in cited evidence
          </p>
          {live.dimensions.map((dimension) => {
            const open = openDimension === dimension.dimension;
            return (
              <div key={dimension.dimension} className="border-b border-border/60 last:border-b-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenDimension(open ? null : dimension.dimension)}
                  className="flex min-h-10 w-full items-center gap-3 px-3 text-left transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="flex-1 text-xs font-medium">
                    {dimension.dimension.replaceAll("_", " ")}
                  </span>
                  <span className={cn("font-mono text-xs", scoreToneClass(dimension.score))}>
                    {dimension.score}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-muted-foreground transition-transform motion-reduce:transition-none",
                      open && "rotate-180",
                    )}
                  />
                </button>
                {open ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t border-border/60 bg-surface px-3 py-3 text-xs leading-5 text-foreground/80"
                  >
                    {dimension.rationale}
                  </motion.p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onFileAnother}
        className="cut-action mt-4 h-10 bg-primary px-5 font-mono text-xs font-medium uppercase tracking-[0.07em] text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        File another case
      </button>
    </div>
  );
}
