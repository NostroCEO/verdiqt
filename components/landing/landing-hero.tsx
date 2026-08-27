"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowRight, Check, FolderGit2, Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type IntakeMode = "repo" | "idea";

const modes: Array<{
  id: IntakeMode;
  label: string;
  helper: string;
  placeholder: string;
}> = [
  {
    id: "repo",
    label: "Public GitHub repo",
    helper: "PUBLIC REPOSITORIES ONLY. LIVE RESEARCH IS NOT CONNECTED YET.",
    placeholder: "https://github.com/you/your-saas",
  },
  {
    id: "idea",
    label: "SaaS idea",
    helper: "ONE PRODUCT. ONE AUDIENCE. ONE URGENT PROBLEM.",
    placeholder: "A decision cockpit for founders who ship too early",
  },
];

function getRepoName(value: string) {
  const parts = value.replace(/\/$/, "").split("/");
  return parts.at(-1) || "your-saas";
}

function isGitHubRepository(value: string) {
  try {
    const normalized = value.startsWith("http") ? value : "https://" + value;
    const url = new URL(normalized);
    const parts = url.pathname.split("/").filter(Boolean);

    return (
      (url.hostname === "github.com" || url.hostname === "www.github.com") &&
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      parts.length === 2
    );
  } catch {
    return false;
  }
}

function HalftoneGavel() {
  return (
    <div className="relative flex min-h-[28rem] w-full items-center justify-center overflow-hidden lg:min-h-full">
      <div className="editorial-crosshair" aria-hidden="true" />
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.72, ease: "easeOut" }}
        className="editorial-gavel"
      >
        <motion.span
          className="editorial-gavel-head"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.14, duration: 0.45 }}
        />
        <motion.span
          className="editorial-gavel-handle"
          initial={{ opacity: 0, scaleY: 0.6 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ delay: 0.24, duration: 0.5 }}
        />
        <motion.span
          className="editorial-gavel-base"
          initial={{ opacity: 0, scaleX: 0.7 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.36, duration: 0.42 }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.58, duration: 0.35 }}
        className="absolute bottom-8 left-8 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground lg:bottom-10 lg:left-10"
      >
        <p>TRIAL PROTOCOL 001</p>
        <p className="mt-1 text-foreground">HUMAN APPROVAL REQUIRED</p>
      </motion.div>
    </div>
  );
}

export function LandingHero() {
  const [mode, setMode] = useState<IntakeMode>("repo");
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState(
    "PHASE 1 PREVIEW ONLY. LIVE RESEARCH IS NOT CONNECTED YET.",
  );
  const [hasError, setHasError] = useState(false);

  const activeMode = modes.find((item) => item.id === mode) ?? modes[0];

  function selectMode(nextMode: IntakeMode) {
    setMode(nextMode);
    setValue("");
    setHasError(false);
    setFeedback(
      nextMode === "repo"
        ? "PUBLIC REPOSITORIES ONLY. LIVE RESEARCH IS NOT CONNECTED YET."
        : "WRITE ONE CLEAR SENTENCE. LIVE RESEARCH IS NOT CONNECTED YET.",
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      setHasError(true);
      setFeedback(
        mode === "repo"
          ? "PASTE A PUBLIC GITHUB REPOSITORY TO OPEN THE PREVIEW."
          : "STATE THE IDEA TO OPEN THE PREVIEW.",
      );
      return;
    }

    if (mode === "repo" && !isGitHubRepository(trimmed)) {
      setHasError(true);
      setFeedback("USE A PUBLIC GITHUB.COM OWNER/REPOSITORY URL.");
      return;
    }

    const caseName =
      mode === "repo"
        ? getRepoName(trimmed)
        : trimmed.split(/\s+/).slice(0, 4).join(" ");

    setHasError(false);
    setFeedback("CASE " + caseName.toUpperCase() + " LOADED INTO PHASE 1 BELOW.");

    window.dispatchEvent(
      new CustomEvent("verdiqt:preview-start", {
        detail: {
          caseName,
          source: trimmed,
          inputType: mode,
        },
      }),
    );

    window.requestAnimationFrame(() => {
      document.getElementById("trial-preview")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  }

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="top"
        className="mx-auto grid w-full max-w-[80rem] border-x border-border/90 lg:min-h-[38.75rem] lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div className="flex items-center px-6 py-20 sm:px-10 lg:px-10 lg:py-24">
          <div className="w-full max-w-[39rem]">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36 }}
              className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
            >
              <span className="mr-2 text-primary">[01]</span>
              Evidence court for SaaS ideas
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.48 }}
              className="mt-8 max-w-[38rem] text-[3.5rem] font-medium leading-[1.02] tracking-[-0.055em] sm:text-[4.15rem]"
            >
              Put the idea on trial before you build it.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.42 }}
              className="mt-6 max-w-[31rem] text-base leading-6 text-foreground/75"
            >
              Give Verdiqt a public repository or one sharp idea. Your agent brings
              the evidence. You make the call.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.42 }}
              className="mt-9"
            >
              <div
                className="grid grid-cols-2 border border-border bg-background"
                role="tablist"
                aria-label="Trial input type"
              >
                {modes.map((item) => {
                  const selected = item.id === mode;

                  return (
                    <button
                      key={item.id}
                      id={"intake-tab-" + item.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls="trial-intake-panel"
                      onClick={() => selectMode(item.id)}
                      className={cn(
                        "relative min-h-11 border-r border-border px-3 font-mono text-[0.7rem] uppercase tracking-[0.1em] outline-none transition-colors last:border-r-0 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      selected
                          ? "bg-foreground text-background"
                          : "bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        {item.id === "repo" ? (
                          <FolderGit2 className="size-3.5" />
                        ) : (
                          <Lightbulb className="size-3.5" />
                        )}
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <form
                id="trial-intake-panel"
                role="tabpanel"
                aria-labelledby={"intake-tab-" + mode}
                onSubmit={handleSubmit}
                noValidate
                className="border-x border-b border-border bg-background p-2"
              >
                <label htmlFor="trial-input" className="sr-only">
                  {activeMode.label}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Input
                      id="trial-input"
                      type={mode === "repo" ? "url" : "text"}
                      inputMode={mode === "repo" ? "url" : "text"}
                      value={value}
                      onChange={(event) => {
                        setValue(event.target.value);
                        if (hasError) setHasError(false);
                      }}
                      aria-invalid={hasError}
                      aria-describedby="trial-input-help trial-status"
                      placeholder={activeMode.placeholder}
                      autoComplete="off"
                      className="h-12 rounded-none border-border bg-surface px-4 text-sm shadow-none focus-visible:ring-2"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="cut-action h-12 min-w-[12rem] rounded-none px-5 font-mono text-xs uppercase tracking-[0.08em]"
                  >
                    Open the case
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
                <p
                  id="trial-input-help"
                  className="px-1 pt-2 font-mono text-[0.62rem] tracking-[0.08em] text-muted-foreground"
                >
                  {activeMode.helper}
                </p>
              </form>
            </motion.div>

            <AnimatePresence initial={false} mode="wait">
              <motion.p
                key={feedback}
                id="trial-status"
                role="status"
                aria-live="polite"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "mt-3 min-h-4 font-mono text-[0.62rem] uppercase tracking-[0.08em]",
                  hasError ? "text-kill" : "text-muted-foreground",
                )}
              >
                {feedback}
              </motion.p>
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.38 }}
              className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[0.68rem] uppercase tracking-[0.06em] text-muted-foreground"
            >
              {["Cited evidence", "Human approval", "One next test"].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check className="size-3 text-primary" />
                  {item}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="border-t border-border/90 lg:border-l lg:border-t-0">
          <HalftoneGavel />
        </div>
      </section>
    </MotionConfig>
  );
}
