// [02] PROCEDURAL RECORD. Light editorial band: the stat ledger opens it,
// the method column explains the six weighted dimensions, the 70/40
// thresholds, and the single next step. Server component, zero client JS.
// All numbers are real product facts; weights mirror DEFAULT_TRIAL_WEIGHTS
// in lib/trials/start.ts and the verdict thresholds in docs/VALIDATION_FRAMEWORK.md.

const ledger = [
  { value: "12", caption: "Tools on the docket" },
  { value: "6", caption: "Weighted dimensions" },
  { value: "0-100", caption: "Composite score" },
  { value: "1", caption: "Next step per verdict" },
] as const;

const dimensions = [
  { name: "Problem severity", weight: 20 },
  { name: "Demand signals", weight: 20 },
  { name: "Competition", weight: 15 },
  { name: "Monetization", weight: 20 },
  { name: "Distribution", weight: 15 },
  { name: "Build cost", weight: 10 },
] as const;

export function ProceduralRecord() {
  return (
    <section
      id="procedural-record"
      aria-labelledby="procedural-record-title"
      className="border-y border-border/90 bg-[#F4F3F1] text-[#111214]"
    >
      <div className="mx-auto w-full max-w-[80rem] border-x border-[#111214]/15">
        <div className="border-b border-[#111214]/15 px-6 py-10 sm:px-10">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-[#111214]/60">
            <span className="mr-2 text-primary">[02]</span>
            Procedural record
          </p>
          <h2
            id="procedural-record-title"
            className="mt-3 max-w-[36rem] text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]"
          >
            Every verdict follows the same procedure.
          </h2>
        </div>

        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <ol className="border-[#111214]/15 lg:border-r" aria-label="Trial facts">
            {ledger.map((row) => (
              <li
                key={row.caption}
                className="flex items-baseline justify-between gap-6 border-b border-[#111214]/15 px-6 py-6 last:border-b-0 sm:px-10"
              >
                <span className="text-[4rem] font-semibold leading-none tracking-[-0.04em] sm:text-[6rem]">
                  {row.value}
                </span>
                <span className="text-right font-mono text-[0.68rem] uppercase tracking-[0.12em] text-[#111214]/60">
                  {row.caption}
                </span>
              </li>
            ))}
          </ol>

          <div className="border-t border-[#111214]/15 lg:border-t-0">
            <div className="border-b border-[#111214]/15 px-6 py-6 sm:px-10">
              <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[#111214]/60">
                The six dimensions
              </h3>
              <ol className="mt-4">
                {dimensions.map((dimension, index) => (
                  <li
                    key={dimension.name}
                    className="flex items-center gap-4 border-b border-[#111214]/10 py-2.5 last:border-b-0"
                  >
                    <span className="w-6 font-mono text-[0.68rem] text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-sm font-medium">{dimension.name}</span>
                    <span className="font-mono text-[0.68rem] text-[#111214]/60">
                      {dimension.weight}%
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid sm:grid-cols-2">
              <div className="border-b border-[#111214]/15 px-6 py-6 sm:border-b-0 sm:border-r sm:px-10">
                <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[#111214]/60">
                  Verdict thresholds
                </h3>
                <p className="mt-4 flex items-baseline gap-3">
                  <span className="border-b-2 border-primary text-[2.5rem] font-semibold leading-none tracking-[-0.04em]">
                    70
                  </span>
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[#111214]/60">
                    and above: build
                  </span>
                </p>
                <p className="mt-3 flex items-baseline gap-3">
                  <span className="border-b-2 border-primary text-[2.5rem] font-semibold leading-none tracking-[-0.04em]">
                    40
                  </span>
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[#111214]/60">
                    and below: kill
                  </span>
                </p>
                <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-[#111214]/60">
                  Between the two: pivot, with a named direction.
                </p>
              </div>
              <div className="px-6 py-6 sm:px-10">
                <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[#111214]/60">
                  After the verdict
                </h3>
                <p className="mt-4 text-sm leading-6 text-[#111214]/80">
                  Every completed trial ends with exactly one recommended next
                  step: the cheapest test that would most change the verdict if
                  it failed. No task lists, no roadmap. One step.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
