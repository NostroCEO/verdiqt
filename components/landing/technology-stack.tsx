"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";

const technologies = [
  {
    name: "OpenAI",
    role: "Research layer",
    src: "/brands/openai-symbol.svg",
    width: 44,
    height: 44,
    imageClassName: "size-10",
    showName: true,
  },
  {
    name: "Next.js",
    role: "Application shell",
    src: "/brands/nextjs-wordmark.svg",
    width: 139,
    height: 28,
    imageClassName: "h-7 w-auto",
    showName: false,
  },
  {
    name: "Prisma",
    role: "Data boundary",
    src: "/brands/prisma-wordmark.svg",
    width: 132,
    height: 34,
    imageClassName: "h-[2.125rem] w-auto",
    showName: false,
  },
  {
    name: "Render",
    role: "Infrastructure",
    src: "/brands/render-wordmark.svg",
    width: 160,
    height: 66,
    imageClassName: "h-auto w-40",
    showName: false,
  },
] as const;

export function TechnologyStack() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.25 });
  const reduceMotion = useReducedMotion() === true;
  const [activeTechnology, setActiveTechnology] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduceMotion || paused || !isInView) return;

    const timer = window.setInterval(() => {
      setActiveTechnology((current) => (current + 1) % technologies.length);
    }, 2400);

    return () => window.clearInterval(timer);
  }, [isInView, paused, reduceMotion]);

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={sectionRef}
        aria-labelledby="technology-stack-title"
        className="mx-auto max-w-[80rem] border-x border-b border-border/90"
      >
        <div className="grid gap-5 border-y border-border/90 px-6 py-5 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.13em] text-primary">
              [SELECTED STACK]
            </p>
            <h2
              id="technology-stack-title"
              className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground"
            >
              Core systems in the production path.
            </h2>
          </div>
          <p className="max-w-[40rem] font-mono text-[0.65rem] uppercase leading-4 tracking-[0.06em] text-muted-foreground lg:justify-self-end lg:text-right">
            Official transparent marks identify selected technologies. No
            sponsorship or endorsement is implied.
          </p>
        </div>

        <ul
          className="grid grid-cols-2 gap-px bg-border/90 lg:grid-cols-4"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {technologies.map((technology, index) => (
            <motion.li
              key={technology.name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.55 }}
              transition={{ delay: index * 0.055, duration: 0.28 }}
              className="group relative flex min-h-36 flex-col items-center justify-center gap-4 overflow-hidden bg-background px-5 py-7 text-center"
            >
              {activeTechnology === index ? (
                <motion.span
                  layoutId="active-technology-block"
                  className="absolute inset-0 bg-surface"
                  transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
                />
              ) : null}
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px origin-left bg-primary"
                initial={false}
                animate={{ scaleX: activeTechnology === index ? 1 : 0 }}
                transition={{
                  duration: reduceMotion ? 0 : activeTechnology === index ? 2.35 : 0.18,
                  ease: activeTechnology === index ? "linear" : "easeOut",
                }}
              />
              <motion.div
                animate={{
                  opacity: activeTechnology === index ? 1 : 0.48,
                  y: activeTechnology === index && !reduceMotion ? -2 : 0,
                }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
                className="relative flex min-h-16 items-center justify-center gap-3 text-foreground"
              >
                <Image
                  alt={technology.name}
                  className={technology.imageClassName}
                  height={technology.height}
                  src={technology.src}
                  width={technology.width}
                />
                {technology.showName ? (
                  <span className="text-xl font-semibold tracking-[-0.05em]">
                    {technology.name}
                  </span>
                ) : null}
              </motion.div>
              <span className="relative font-mono text-[0.61rem] uppercase tracking-[0.12em] text-muted-foreground">
                <span className="mr-2 text-primary">0{index + 1}</span>
                {technology.role}
              </span>
            </motion.li>
          ))}
        </ul>
      </section>
    </MotionConfig>
  );
}
