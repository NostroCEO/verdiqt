"use client";

import { Gauge } from "@/components/charts/gauge";
import { RadarArea } from "@/components/charts/radar-area";
import { RadarAxis } from "@/components/charts/radar-axis";
import { RadarChart } from "@/components/charts/radar-chart";
import { RadarGrid } from "@/components/charts/radar-grid";
import { RadarLabels } from "@/components/charts/radar-labels";
import type { LiveDimensionScore } from "@/lib/hooks/use-trial-live";

const METRIC_LABELS: Record<string, string> = {
  PROBLEM_SEVERITY: "Severity",
  DEMAND_SIGNALS: "Demand",
  COMPETITION: "Competition",
  MONETIZATION: "Monetization",
  DISTRIBUTION: "Distribution",
  BUILD_COST: "Build cost",
};

function verdictColor(verdict: string) {
  if (verdict === "BUILD") return "var(--build)";
  if (verdict === "KILL") return "var(--kill)";
  return "var(--pivot)";
}

// The sanctioned decision-state charts (docs/UI_DESIGN.md): Bklit gauge for
// the composite and radar for the six dimensions, rendered ONLY from a real
// completed verdict. The enter animations are the charts' own; nothing here
// loops or autoplays.
export function LiveVerdictPanel({
  compositeScore,
  verdict,
  dimensions,
  pivotDirection,
  nextStepAction,
}: {
  compositeScore: number;
  verdict: string;
  dimensions: LiveDimensionScore[];
  pivotDirection: string | null;
  nextStepAction: string | null;
}) {
  const metrics = dimensions.map((entry) => ({
    key: entry.dimension,
    label: METRIC_LABELS[entry.dimension] ?? entry.dimension,
  }));
  const values = Object.fromEntries(
    dimensions.map((entry) => [entry.dimension, entry.score]),
  );

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 sm:items-center">
        <Gauge
          value={compositeScore}
          centerValue={compositeScore}
          defaultLabel={verdict}
          className="mx-auto w-full max-w-56"
        />
        <RadarChart
          data={[{ label: "Scores", color: verdictColor(verdict), values }]}
          metrics={metrics}
          size={220}
          className="mx-auto"
        >
          <RadarGrid />
          <RadarAxis />
          <RadarLabels />
          <RadarArea index={0} />
        </RadarChart>
      </div>
      <p className="mt-3 font-mono text-[0.58rem] uppercase tracking-[0.08em] text-muted-foreground">
        {verdict === "PIVOT" && pivotDirection
          ? `Pivot: ${pivotDirection}`
          : nextStepAction
            ? `Next step: ${nextStepAction}`
            : `Verdict ${verdict} at ${compositeScore}.`}
      </p>
    </div>
  );
}
