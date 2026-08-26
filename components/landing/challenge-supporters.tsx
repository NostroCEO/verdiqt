"use client";

import { MotionConfig, motion } from "motion/react";

const supporters = [
  "OpenAI",
  "Cloudflare",
  "Vercel",
  "Shopify",
  "Google Chrome",
  "Render",
  "Netlify",
] as const;

export function ChallengeSupporters() {
  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-labelledby="challenge-supporters-title"
        className="mx-auto max-w-[80rem] border-x border-b border-border/90"
      >
        <div className="flex flex-col gap-2 border-y border-border/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <h2
            id="challenge-supporters-title"
            className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.12em] text-foreground"
          >
            <span className="mr-2 text-primary">[OFFICIAL HUB]</span>
            WebMCP Challenge supporters
          </h2>
          <p className="max-w-[36rem] font-mono text-[0.65rem] uppercase leading-4 tracking-[0.06em] text-muted-foreground sm:text-right">
            Listed by the official challenge resource hub. No endorsement of
            Verdiqt is implied.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-px bg-border/90 sm:grid-cols-4 lg:grid-cols-7">
          {supporters.map((supporter, index) => (
            <motion.li
              key={supporter}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: index * 0.035, duration: 0.26 }}
              className="group col-span-1 flex min-h-20 items-center justify-center bg-background px-3 text-center transition-colors last:col-span-2 hover:bg-surface sm:last:col-span-1"
            >
              <span className="text-sm font-semibold tracking-[-0.02em] text-muted-foreground transition-colors group-hover:text-foreground sm:text-base">
                {supporter}
              </span>
            </motion.li>
          ))}
        </ul>
      </section>
    </MotionConfig>
  );
}
