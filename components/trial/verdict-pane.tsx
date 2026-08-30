"use client";

import { useState } from "react";
import { ChevronDown, Scale } from "lucide-react";
import { motion } from "motion/react";

import { LiveVerdictPanel, scoreToneClass } from "@/components/landing/live-verdict-panel";
import { WeightsPanel } from "@/components/trial/weights-panel";
import type { LiveTrialState } from "@/lib/hooks/use-trial-live";
import { cn, safeHttpUrl } from "@/lib/utils";

// A daily-quota exhaustion is not a crash — it is an intentional pause. The
// courtroom stays in character: the docket is full, proceedings resume. Both
// the shared inference quota and the global trial ceiling surface as this.
export function isRecess(code: string | null): boolean {
  return code != null && code.includes("llm_rate_limited");
}

// Human explanations for the pipeline's typed error codes.
export function explainErrorCode(code: string | null): string {
  if (!code) return "File the case again; every stage reports its progress.";
  if (code.startsWith("github_http")) {
    const status = code.replace("github_http_", "");
    if (status === "403" || status === "429") {
      return "GitHub rate-limited the repository lookup. Retry in a minute, or file the idea as text instead.";
    }
    if (status === "404") {
      return "The GitHub repository was not found. Check the URL and make sure it is public.";
    }
    return `GitHub returned an error (HTTP ${status}). Try again or file the idea as text instead.`;
  }
  if (code.includes("invalid_repo_url")) {
    return "The URL does not point to a valid GitHub repository (expected github.com/owner/repo).";
  }
  if (code.includes("INFERENCE_API_KEY")) {
    return "The scoring model is not configured on the server — the API key is missing.";
  }
  if (code.includes("llm_rate_limited")) {
    return "The daily AI quota has been reached — the free inference tier caps how many trials can run per day. The quota resets automatically at midnight UTC.";
  }
  if (code.includes("classification_all_batches_failed")) {
    return "Evidence classification failed — the AI could not sort the gathered evidence into dimensions. Filing again usually succeeds.";
  }
  if (code.startsWith("llm_schema_violation")) {
    return "The AI returned a malformed answer. Filing the case again usually succeeds.";
  }
  if (code.startsWith("llm_") || code.startsWith("classification")) {
    return "The scoring model returned an unusable answer. Filing again usually succeeds.";
  }
  if (code.includes("normalize_requires")) {
    return "The case was missing both a SaaS idea and a repository URL.";
  }
  return `The trial failed: ${code.replaceAll("_", " ")}`;
}

// Phase 3: deliberation state while scoring, then the real charts plus the
// RAG-grounded rationale accordion with [ev:id] citations.
export function VerdictPane({
  live,
  onFileAnother,
  runId = null,
}: {
  live: LiveTrialState;
  onFileAnother: () => void;
  runId?: string | null;
}) {
  const [openDimension, setOpenDimension] = useState<string | null>(null);
  const evidenceById = new Map(live.evidence.map((item) => [item.id, item]));

  if (live.status !== "COMPLETE") {
    const deliberating = live.status === "SCORING";
    return (
      <div className="border border-border bg-background p-6 text-center">
        {deliberating ? (
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto w-fit"
          >
            <Scale className="size-5 text-primary" />
          </motion.div>
        ) : (
          <Scale className="mx-auto size-5 text-primary" />
        )}
        {deliberating ? (
          <motion.p
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="mt-3 text-sm text-foreground"
          >
            The court is deliberating.
          </motion.p>
        ) : (
          <p className="mt-3 text-sm text-foreground">
            {live.status === "FAILED"
              ? isRecess(live.errorCode)
                ? "The court is in recess."
                : "The trial failed before a verdict was reached."
              : "The court is deliberating."}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {live.status === "FAILED"
            ? explainErrorCode(live.errorCode)
            : deliberating
              ? "Scoring the six dimensions and consulting the bench."
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

      {live.benchOpinion ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", visualDuration: 0.35, bounce: 0.2 }}
          className="mt-4 border border-primary/40 bg-background"
        >
          <p className="border-b border-border px-3 py-2 font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">
            The bench&apos;s ruling
            {live.benchConfidence !== null ? ` · confidence ${live.benchConfidence}/100` : ""}
          </p>
          <p className="px-3 py-3 text-xs leading-5 text-foreground/90">
            {live.benchOpinion}
          </p>
        </motion.div>
      ) : null}

      {live.dimensions ? (
        <div className="mt-4 border border-border bg-background">
          <p className="border-b border-border px-3 py-2 font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">
            The panel&apos;s reasoning, grounded in cited evidence
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
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium">
                      {dimension.dimension.replaceAll("_", " ")}
                    </span>
                    {dimension.keyFinding ? (
                      <span className="block truncate text-[0.68rem] text-primary">
                        {dimension.keyFinding}
                      </span>
                    ) : null}
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
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t border-border/60 bg-surface px-3 py-3"
                  >
                    {dimension.keyFinding ? (
                      <p className="mb-2 border-l-2 border-primary bg-primary/10 px-2 py-1.5 text-xs font-medium text-foreground">
                        {dimension.keyFinding}
                      </p>
                    ) : null}
                    <p className="text-xs leading-5 text-foreground/80">
                      {dimension.rationale}
                    </p>
                    {(() => {
                      const cited = dimension.evidenceIds
                        .map((id) => evidenceById.get(id))
                        .filter((item): item is NonNullable<typeof item> => Boolean(item));
                      if (cited.length === 0) return null;
                      return (
                        <div className="mt-2 border-t border-border/50 pt-2">
                          <p className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-muted-foreground">
                            Sources cited
                          </p>
                          <ul className="mt-1 space-y-1">
                            {cited.map((item) => (
                              <li key={item.id} className="flex items-center gap-2">
                                <a
                                  href={safeHttpUrl(item.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="min-w-0 flex-1 truncate text-[0.68rem] text-foreground underline decoration-border underline-offset-2 hover:text-primary"
                                >
                                  {item.title}
                                </a>
                                <span className="shrink-0 font-mono text-[0.48rem] uppercase tracking-[0.06em] text-muted-foreground">
                                  {item.source.replaceAll("_", " ")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}
                  </motion.div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {runId && live.weights ? (
        <WeightsPanel key={runId} runId={runId} weights={live.weights} />
      ) : null}

      <button
        type="button"
        onClick={onFileAnother}
        className="cut-action mt-4 h-10 w-full bg-primary px-5 font-mono text-xs font-medium uppercase tracking-[0.07em] text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
      >
        File another case
      </button>
    </div>
  );
}
