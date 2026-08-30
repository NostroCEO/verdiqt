"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FolderGit2, Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isGitHubRepository,
  startTrialRequest,
  type IntakeMode,
} from "@/lib/intake";
import { cn } from "@/lib/utils";

const modes: Array<{ id: IntakeMode; label: string; placeholder: string }> = [
  {
    id: "repo",
    label: "GitHub repo",
    placeholder: "https://github.com/you/your-saas",
  },
  {
    id: "idea",
    label: "SaaS idea",
    placeholder: "A decision cockpit for founders who ship too early",
  },
];

// The courtroom's own filing desk: loads Phase 1 in place (the dashboard
// below listens for verdiqt:preview-start) and mirrors the case into the URL
// so the workspace stays shareable. Local preview state only.
export function CourtroomIntake() {
  const router = useRouter();
  const [mode, setMode] = useState<IntakeMode>("repo");
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hasError, setHasError] = useState(false);

  const activeMode = modes.find((item) => item.id === mode) ?? modes[0];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      setHasError(true);
      setFeedback(
        mode === "repo"
          ? "PASTE A PUBLIC GITHUB REPOSITORY TO FILE THE CASE."
          : "STATE THE IDEA TO FILE THE CASE.",
      );
      return;
    }

    if (mode === "repo" && !isGitHubRepository(trimmed)) {
      setHasError(true);
      setFeedback("USE A PUBLIC GITHUB.COM OWNER/REPOSITORY URL.");
      return;
    }

    setHasError(false);
    setFeedback("FILING THE CASE...");

    const submission = await startTrialRequest(mode, trimmed);

    if (submission.outcome === "limited" || submission.outcome === "error") {
      setHasError(true);
      setFeedback(submission.message);
      return;
    }

    if (submission.outcome === "live") {
      // A filed case leaves a clean desk: stale text from the previous case
      // must never sit in the input when the next one is typed (founder bug
      // report 2026-08-28).
      setValue("");
      setFeedback(
        "CASE " + submission.caseName.toUpperCase() + " FILED. THE COURT IS IN SESSION.",
      );
      window.dispatchEvent(
        new CustomEvent("verdiqt:trial-started", {
          detail: {
            runId: submission.runId,
            caseName: submission.caseName,
            source: trimmed,
            inputType: mode,
          },
        }),
      );
      // Carry the case metadata in the URL, not just the run id: re-filing a
      // second case must leave the case file (label, source, input type)
      // correct on its own, without depending on the event reaching the
      // already-mounted dashboard.
      const liveParams = new URLSearchParams({
        run: submission.runId,
        case: submission.caseName,
        source: trimmed,
        type: mode,
      });
      router.replace("/trial?" + liveParams.toString());
      return;
    }

    setValue("");
    setFeedback(
      "CASE " + submission.caseName.toUpperCase() + " LOADED INTO PHASE 1 BELOW.",
    );
    window.dispatchEvent(
      new CustomEvent("verdiqt:preview-start", {
        detail: { caseName: submission.caseName, source: trimmed, inputType: mode },
      }),
    );
    const params = new URLSearchParams({
      case: submission.caseName,
      source: trimmed,
      type: mode,
    });
    router.replace("/trial?" + params.toString());
  }

  return (
    <section
      aria-label="File a case"
      className="mx-auto w-full max-w-[80rem] border-x border-b border-border/90"
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-3 px-6 py-4 sm:px-10 lg:grid-cols-[auto_auto_minmax(0,1fr)_auto] lg:items-center"
      >
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
          File a case
        </p>

        <div className="grid grid-cols-2 border border-border bg-background" role="tablist" aria-label="Case input type">
          {modes.map((item) => {
            const selected = item.id === mode;

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setMode(item.id);
                  setValue("");
                  setHasError(false);
                  setFeedback("");
                }}
                className={cn(
                  "relative inline-flex min-h-11 items-center justify-center gap-2 border-r border-border px-3 font-mono text-sm font-medium uppercase tracking-[0.07em] outline-none transition-colors last:border-r-0 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  selected
                    ? "bg-foreground text-background"
                    : "bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {item.id === "repo" ? (
                  <FolderGit2 className="size-3.5" />
                ) : (
                  <Lightbulb className="size-3.5" />
                )}
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="min-w-0">
          <label htmlFor="trial-input" className="sr-only">
            {activeMode.label}
          </label>
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
            aria-describedby="courtroom-intake-status"
            placeholder={activeMode.placeholder}
            autoComplete="off"
            className="h-11 rounded-none border-border bg-surface px-4 text-sm shadow-none focus-visible:ring-2"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="cut-action h-11 min-w-[11rem] rounded-none px-5 font-mono text-sm font-medium uppercase tracking-[0.07em]"
        >
          Open the case
          <ArrowRight data-icon="inline-end" />
        </Button>

        <p
          id="courtroom-intake-status"
          role="status"
          aria-live="polite"
          className={cn(
            "min-h-4 font-mono text-[0.62rem] uppercase tracking-[0.08em] lg:col-span-4",
            hasError ? "text-kill" : "text-muted-foreground",
            !feedback && "lg:hidden",
          )}
        >
          {feedback}
        </p>
      </form>
    </section>
  );
}
