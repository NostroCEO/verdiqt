"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

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

// Founder rule (2026-08-28): scores wear their meaning. At or above the
// BUILD threshold (70) green, in the PIVOT band (40-69) orange, below red.
export function scoreToneClass(score: number) {
  if (score >= 70) return "text-build";
  if (score >= 40) return "text-pivot";
  return "text-kill";
}

// The composite counts up to its final value — the system arrives at the
// number instead of teleporting to it. State-driven, plays once per verdict.
function CountUpScore({ value, className }: { value: number; className?: string }) {
  const raw = useMotionValue(0);
  const rounded = useTransform(raw, (current) => Math.round(current));

  useEffect(() => {
    const controls = animate(raw, value, { duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [raw, value]);

  return <motion.span className={className}>{rounded}</motion.span>;
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

  const tone =
    verdict === "BUILD" ? "text-build" : verdict === "KILL" ? "text-kill" : "text-pivot";

  return (
    <div>
      <motion.p
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", visualDuration: 0.35, bounce: 0.35 }}
        className="mb-3 flex items-baseline gap-2 font-mono text-sm uppercase tracking-[0.08em]"
      >
        <span className={tone}>Verdict: {verdict}</span>
        <span className="text-muted-foreground">·</span>
        <CountUpScore value={compositeScore} className={scoreToneClass(compositeScore)} />
        <span className="text-muted-foreground">/ 100</span>
      </motion.p>
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
