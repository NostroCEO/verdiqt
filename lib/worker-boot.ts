import { getStartedBoss, RUN_TRIAL_QUEUE, type RunTrialJob } from "@/lib/queue";
import { claimRun, runPipeline } from "@/worker/pipeline";

// Worker bootstrap shared by the CLI entry (worker/index.ts) and the
// zero-budget colocation path (instrumentation.ts inside the web container).
export async function startWorker() {
  const boss = await getStartedBoss();

  await boss.work<RunTrialJob>(RUN_TRIAL_QUEUE, async (jobs) => {
    for (const job of jobs) {
      const { pipelineRunId } = job.data;

      const claimed = await claimRun(pipelineRunId);
      if (!claimed) {
        // Duplicate delivery or already-terminal run: nothing to do.
        continue;
      }

      await runPipeline(pipelineRunId);
    }
  });

  console.log(`verdiqt worker listening on queue "${RUN_TRIAL_QUEUE}"`);
  return boss;
}
