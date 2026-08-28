"use client";

import { motion } from "motion/react";

// The hero's verdict tap, miniaturized for the moment the verdict lands:
// the gavel swings once and settles, the base stays intact (founder rule).
// Plays once per completion (key it by run id); reduced motion collapses to
// a fade via the surrounding MotionConfig.
export function GavelStrike({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={className}
      style={{ display: "inline-block", width: 34, height: 30, position: "relative" }}
    >
      <motion.span
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "70% 75%",
          display: "block",
        }}
        initial={{ rotate: -22 }}
        animate={{ rotate: [-22, -22, 8, 0] }}
        transition={{ duration: 0.9, times: [0, 0.3, 0.7, 1], ease: "easeInOut" }}
      >
        {/* head */}
        <span
          style={{
            position: "absolute",
            left: "8%",
            top: "12%",
            width: "58%",
            height: "26%",
            rotate: "-31deg",
            background: "var(--primary)",
          }}
        />
        {/* handle */}
        <span
          style={{
            position: "absolute",
            left: "48%",
            top: "34%",
            width: "12%",
            height: "46%",
            rotate: "-31deg",
            background: "var(--primary)",
          }}
        />
      </motion.span>
      {/* base: never moves */}
      <span
        style={{
          position: "absolute",
          left: "6%",
          bottom: 0,
          width: "62%",
          height: "12%",
          background: "var(--foreground)",
          opacity: 0.85,
        }}
      />
    </motion.span>
  );
}
