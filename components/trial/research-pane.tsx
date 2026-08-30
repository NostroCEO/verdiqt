"use client";

import { AnimatePresence, motion } from "motion/react";
import { Ban, Globe, Pin } from "lucide-react";

import {
  GitHubMark,
  HackerNewsMark,
  ProductHuntMark,
  RedditMark,
  StackOverflowMark,
} from "@/components/icons/brand-icons";
import { StageChecklist } from "@/components/trial/stage-checklist";
import { explainErrorCode } from "@/components/trial/verdict-pane";
import type { LiveEvidenceItem } from "@/lib/hooks/use-trial-live";
import type { TrialStatusValue } from "@/lib/trial-progress";
import { cn, safeHttpUrl } from "@/lib/utils";

// Official platform marks (founder rule 2026-08-28): the research feed shows
// exactly where each piece of evidence comes from. WEB_SEARCH is served by
// Stack Overflow's public API, so it wears that mark truthfully.
const SOURCES: Record<
  string,
  { label: string; icon: (props: { className?: string }) => React.ReactElement }
> = {
  HACKERNEWS: { label: "Hacker News", icon: HackerNewsMark },
  GITHUB: { label: "GitHub", icon: GitHubMark },
  PRODUCT_HUNT: { label: "Product Hunt", icon: ProductHuntMark },
  WEB_SEARCH: { label: "Stack Overflow", icon: StackOverflowMark },
  REDDIT: { label: "Reddit", icon: RedditMark },
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Phase 2 made visible: where the information comes from, listing in as it
// is gathered. Items are keyed by id, so only NEW rows play the entrance
// (12px rise, spring), per motion.dev AnimatePresence semantics.
export function ResearchPane({
  status,
  evidence,
  sourceStates = {},
  runId = null,
  errorCode = null,
  failedAtStage = null,
}: {
  status: TrialStatusValue;
  evidence: LiveEvidenceItem[];
  sourceStates?: Record<string, { state: string; count: number }>;
  runId?: string | null;
  errorCode?: string | null;
  failedAtStage?: string | null;
}) {
  const researching =
    status === "NORMALIZING" || status === "GATHERING" || status === "CLASSIFYING";

  // The human judges: pin marks relevance, reject removes an item from
  // scoring, both open a RESCORE revision server-side. The poll loop picks
  // up the new run; no local state to reconcile.
  function setHumanState(evidenceId: string, humanState: string) {
    if (!runId) return;
    void fetch(
      `/api/trials/${encodeURIComponent(runId)}/evidence/${encodeURIComponent(evidenceId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ humanState }),
      },
    ).catch(() => {});
  }

  return (
    <div>
      {status === "FAILED" ? (
        <p className="mb-3 border-l-2 border-kill bg-kill/10 px-3 py-2 text-xs text-foreground">
          The trial failed during this phase. {explainErrorCode(errorCode)}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div>
        <p className="mb-2 font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">
          The procedure
        </p>
        <StageChecklist status={status} failedAtStage={failedAtStage} />
      </div>

      <div className="min-w-0">
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">
          {status === "GATHERING" || status === "CLASSIFYING" ? (
            <motion.span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-primary"
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}
          Evidence feed ({evidence.length} items from public sources)
        </p>

        <div className="mb-2 flex flex-wrap gap-1" aria-label="Research sources">
          {Object.entries(SOURCES).map(([key, source]) => {
            const state = sourceStates[key];
            const Icon = source.icon;
            const searching = !state && researching;
            return (
              <span
                key={key}
                className={cn(
                  "inline-flex items-center gap-1 border border-border px-1.5 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.06em]",
                  state?.state === "gathered" && state.count > 0
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-2.5 shrink-0" />
                {source.label}
                {searching ? (
                  <motion.span
                    aria-label="searching"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    ...
                  </motion.span>
                ) : state?.state === "gathered" ? (
                  <span className="text-primary">{state.count}</span>
                ) : state ? (
                  <span>off</span>
                ) : (
                  <span>—</span>
                )}
              </span>
            );
          })}
        </div>

        {evidence.length === 0 ? (
          researching ? (
            <div
              aria-label="Evidence is loading"
              className="border border-border bg-background p-3"
            >
              {[0, 1, 2].map((row) => (
                <motion.div
                  key={row}
                  animate={{ opacity: [0.35, 0.7, 0.35] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: row * 0.25,
                  }}
                  className="mb-2 last:mb-0"
                >
                  <div className="h-2.5 w-3/4 bg-border" />
                  <div className="mt-1.5 h-2 w-1/2 bg-border/70" />
                </motion.div>
              ))}
              <p className="mt-3 text-xs text-muted-foreground">
                Searching Hacker News, GitHub, Product Hunt, Reddit, and Stack
                Overflow for this case...
              </p>
            </div>
          ) : (
            <div className="border border-border bg-background p-4 text-xs text-muted-foreground">
              No evidence gathered yet.
            </div>
          )
        ) : (
          <ul className="max-h-72 overflow-y-auto border border-border bg-background">
            <AnimatePresence initial={false}>
              {evidence.map((item) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", visualDuration: 0.3, bounce: 0.2 }}
                  className={cn(
                    "border-b border-border/60 px-3 py-2 transition-colors last:border-b-0 hover:bg-surface",
                    item.humanState === "REJECTED" && "opacity-45",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex shrink-0 items-center gap-1 border border-border px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.08em] text-primary">
                      {(() => {
                        const Icon = SOURCES[item.source]?.icon;
                        return Icon ? (
                          <Icon className="size-2.5 shrink-0" />
                        ) : (
                          <Globe aria-hidden="true" className="size-2.5" />
                        );
                      })()}
                      {SOURCES[item.source]?.label ?? item.source}
                    </span>
                    <a
                      href={safeHttpUrl(item.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-xs text-foreground hover:text-primary"
                    >
                      {item.title}
                    </a>
                    <span className="shrink-0 font-mono text-[0.5rem] text-muted-foreground">
                      {hostOf(item.url)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[0.5rem] uppercase tracking-[0.06em] text-muted-foreground">
                      {item.dimension.replaceAll("_", " ")}
                    </span>
                    <span aria-label={`strength ${item.strength} of 5`} className="inline-flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((dot) => (
                        <span
                          key={dot}
                          className={cn(
                            "size-1",
                            dot <= item.strength ? "bg-primary" : "bg-border",
                          )}
                        />
                      ))}
                    </span>
                    {runId ? (
                      <span className="ml-auto inline-flex gap-1">
                        <button
                          type="button"
                          title={item.humanState === "PINNED" ? "Unpin" : "Pin as relevant"}
                          aria-pressed={item.humanState === "PINNED"}
                          onClick={() =>
                            setHumanState(
                              item.id,
                              item.humanState === "PINNED" ? "NEUTRAL" : "PINNED",
                            )
                          }
                          className={cn(
                            "inline-flex size-5 items-center justify-center border transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                            item.humanState === "PINNED"
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                          )}
                        >
                          <Pin className="size-2.5" />
                        </button>
                        <button
                          type="button"
                          title={item.humanState === "REJECTED" ? "Restore" : "Reject from scoring"}
                          aria-pressed={item.humanState === "REJECTED"}
                          onClick={() =>
                            setHumanState(
                              item.id,
                              item.humanState === "REJECTED" ? "NEUTRAL" : "REJECTED",
                            )
                          }
                          className={cn(
                            "inline-flex size-5 items-center justify-center border transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                            item.humanState === "REJECTED"
                              ? "border-kill bg-kill/15 text-kill"
                              : "border-border text-muted-foreground hover:border-kill hover:text-kill",
                          )}
                        >
                          <Ban className="size-2.5" />
                        </button>
                      </span>
                    ) : null}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
      </div>
    </div>
  );
}
