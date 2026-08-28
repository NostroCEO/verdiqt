"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ArchivedCase = {
  run_id: string;
  case_label: string;
  status: string;
  verdict: string | null;
  composite_score: number | null;
};

function verdictClass(verdict: string | null) {
  if (verdict === "BUILD") return "border-build/50 text-build";
  if (verdict === "KILL") return "border-kill/50 text-kill";
  if (verdict === "PIVOT") return "border-pivot/60 text-pivot";
  return "border-border text-muted-foreground";
}

// The session's past cases: every filed case auto-archives here, and any of
// them reopens with a click. Refreshes when the active run changes.
export function ArchiveRail({
  activeRunId,
  onSelect,
}: {
  activeRunId: string | null;
  onSelect: (runId: string) => void;
}) {
  const [cases, setCases] = useState<ArchivedCase[]>([]);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/trials", { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        if (cancelled || !response.ok) return;
        const body = (await response.json()) as { trials: ArchivedCase[] };
        setCases(body.trials);
      })
      .catch(() => {
        // The rail is a convenience; silence is acceptable here.
      });

    return () => {
      cancelled = true;
    };
  }, [activeRunId]);

  // Archiving begins the moment a NEW case starts: the active case is never
  // in its own archive, so the rail only exists once a previous case has
  // been displaced (founder rule, 2026-08-28).
  const archived = cases.filter((entry) => entry.run_id !== activeRunId);

  if (archived.length === 0) return null;

  return (
    <div className="border-t border-border p-3">
      <p className="font-mono text-[0.48rem] uppercase tracking-[0.08em] text-muted-foreground">
        Past cases
      </p>
      <ul className="mt-2 space-y-1">
        {archived.slice(0, 6).map((entry) => (
          <li key={entry.run_id}>
            <button
              type="button"
              onClick={() => onSelect(entry.run_id)}
              className="flex w-full items-center gap-2 border border-transparent px-1.5 py-1 text-left transition-colors hover:border-border hover:bg-surface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="min-w-0 flex-1 truncate text-[0.68rem] text-foreground">
                {entry.case_label}
              </span>
              <span
                className={cn(
                  "shrink-0 border px-1 py-0.5 font-mono text-[0.46rem] uppercase tracking-[0.06em]",
                  verdictClass(entry.verdict),
                )}
              >
                {entry.verdict ?? entry.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
