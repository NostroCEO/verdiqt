import { getStartedBoss, RUN_TRIAL_QUEUE, type RunTrialJob } from "@/lib/queue";
import { claimRun, runPipeline } from "@/worker/pipeline";

// Long-running background worker (Render Background Worker service; the
// render.yaml entry is added at the founder-approved paid-plan gate).
async function main() {
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

  const shutdown = async () => {
    console.log("verdiqt worker stopping");
    await boss.stop({ graceful: true });
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

main().catch((error) => {
  console.error("verdiqt worker failed to start", error);
  process.exit(1);
});
