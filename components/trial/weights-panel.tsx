"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

const DIMENSION_ORDER = [
  "PROBLEM_SEVERITY",
  "DEMAND_SIGNALS",
  "COMPETITION",
  "MONETIZATION",
  "DISTRIBUTION",
  "BUILD_COST",
] as const;

// The judge reweighs the case: six sliders that must total exactly 100.
// Apply opens a revisioned RESCORE run server-side; the poll loop then
// walks the dashboard through the re-deliberation to the new verdict.
export function WeightsPanel({
  runId,
  weights,
}: {
  runId: string;
  weights: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>(() => ({ ...weights }));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const total = DIMENSION_ORDER.reduce((sum, key) => sum + (draft[key] ?? 0), 0);
  const valid = total === 100;

  async function apply() {
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch(
        `/api/trials/${encodeURIComponent(runId)}/weights`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ weights: draft }),
        },
      );
      setFeedback(
        response.ok
          ? "Reweighed. The court is re-deliberating..."
          : "The court could not accept these weights.",
      );
    } catch {
      setFeedback("The court could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border border-border bg-background">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center gap-2 px-3 text-left transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <SlidersHorizontal className="size-3.5 text-primary" aria-hidden="true" />
        <span className="flex-1 text-xs font-medium">Reweigh the case</span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="border-t border-border/60 px-3 py-3">
          {DIMENSION_ORDER.map((key) => (
            <label key={key} className="mb-2 block last:mb-0">
              <span className="flex items-baseline justify-between font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">
                {key.replaceAll("_", " ")}
                <span className="text-foreground">{draft[key] ?? 0}</span>
              </span>
              <input
                type="range"
                min={0}
                max={60}
                step={5}
                value={draft[key] ?? 0}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [key]: Number(event.target.value),
                  }))
                }
                className="mt-1 block w-full accent-[var(--primary)]"
              />
            </label>
          ))}

          <div className="mt-3 flex items-center gap-3">
            <span
              className={cn(
                "font-mono text-[0.6rem] uppercase tracking-[0.07em]",
                valid ? "text-build" : "text-kill",
              )}
            >
              Total {total} / 100
            </span>
            <button
              type="button"
              disabled={!valid || busy}
              onClick={apply}
              className="cut-action ml-auto h-8 bg-primary px-3 font-mono text-[0.6rem] font-medium uppercase tracking-[0.07em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {busy ? "Applying..." : "Apply and re-deliberate"}
            </button>
          </div>
          {feedback ? (
            <p className="mt-2 text-[0.68rem] text-muted-foreground">{feedback}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
