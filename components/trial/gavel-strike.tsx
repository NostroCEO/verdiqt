"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

// The hero's verdict tap, miniaturized for the moment the verdict lands:
// same halftone pieces, same swing timing (raised hold, strike, settle),
// same static base (founder rule) — plus a neon glow and a soft spring
// entrance before the strike. Plays once per completion (key it by run id);
// reduced motion collapses to a fade via the surrounding MotionConfig.
export function GavelStrike({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.72, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", visualDuration: 0.5, bounce: 0.28 }}
      className={cn("editorial-gavel editorial-gavel--mini editorial-gavel--neon inline-block", className)}
    >
      <motion.span
        className="absolute inset-0 block"
        style={{ transformOrigin: "62% 78%" }}
        initial={{ rotate: -16 }}
        animate={{ rotate: [-16, -16, 6, 0] }}
        transition={{ duration: 1.15, times: [0, 0.4, 0.74, 1], ease: "easeInOut" }}
      >
        <span className="editorial-gavel-head" />
        <span className="editorial-gavel-handle" />
      </motion.span>
      {/* base: never moves */}
      <span className="editorial-gavel-base" />
    </motion.span>
  );
}
