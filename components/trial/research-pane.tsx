"use client";

import { AnimatePresence, motion } from "motion/react";

import { StageChecklist } from "@/components/trial/stage-checklist";
import type { LiveEvidenceItem } from "@/lib/hooks/use-trial-live";
import type { TrialStatusValue } from "@/lib/trial-progress";
import { cn } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  HACKERNEWS: "Hacker News",
  GITHUB: "GitHub",
  PRODUCT_HUNT: "Product Hunt",
  WEB_SEARCH: "Web search",
  REDDIT: "Reddit",
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
}: {
  status: TrialStatusValue;
  evidence: LiveEvidenceItem[];
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div>
        <p className="mb-2 font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">
          The procedure
        </p>
        <StageChecklist status={status} />
      </div>

      <div className="min-w-0">
        <p className="mb-2 font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">
          Evidence feed ({evidence.length} items from public sources)
        </p>
        {evidence.length === 0 ? (
          <div className="border border-border bg-background p-4 text-xs text-muted-foreground">
            {status === "GATHERING" || status === "NORMALIZING"
              ? "Searching Hacker News, GitHub, and Product Hunt for this case..."
              : "No evidence gathered yet."}
          </div>
        ) : (
          <ul className="max-h-72 overflow-y-auto border border-border bg-background">
            <AnimatePresence initial={false}>
              {evidence.map((item) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", visualDuration: 0.3, bounce: 0.2 }}
                  className="border-b border-border/60 px-3 py-2 transition-colors last:border-b-0 hover:bg-surface"
                >
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 border border-border px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.08em] text-primary">
                      {SOURCE_LABELS[item.source] ?? item.source}
                    </span>
                    <a
                      href={item.url}
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
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
