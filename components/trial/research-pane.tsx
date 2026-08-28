"use client";

import { AnimatePresence, motion } from "motion/react";
import { Globe } from "lucide-react";

import {
  GitHubMark,
  HackerNewsMark,
  ProductHuntMark,
  RedditMark,
  StackOverflowMark,
} from "@/components/icons/brand-icons";
import { StageChecklist } from "@/components/trial/stage-checklist";
import type { LiveEvidenceItem } from "@/lib/hooks/use-trial-live";
import type { TrialStatusValue } from "@/lib/trial-progress";
import { cn } from "@/lib/utils";

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
        {evidence.length === 0 ? (
          <div className="border border-border bg-background p-4 text-xs text-muted-foreground">
            {status === "GATHERING" || status === "NORMALIZING"
              ? "Searching Hacker News, GitHub, Product Hunt, Reddit, and Stack Overflow for this case..."
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
