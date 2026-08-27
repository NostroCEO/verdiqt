import PgBoss from "pg-boss";

export const RUN_TRIAL_QUEUE = "run-trial";

export type RunTrialJob = {
  pipelineRunId: string;
};

const globalForBoss = globalThis as typeof globalThis & {
  verdiqtBoss?: PgBoss;
  verdiqtBossStart?: Promise<PgBoss>;
};

function bossConnectionString() {
  const connectionString =
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL or DIRECT_DATABASE_URL is required");
  }

  if (!process.env.DIRECT_DATABASE_URL) {
    // pg-boss must not run through a transaction pooler once DATABASE_URL
    // maps to PgBouncer; failing closed in production beats silent misrouting.
    if (process.env.NODE_ENV === "production") {
      throw new Error("DIRECT_DATABASE_URL is required in production for pg-boss");
    }

    console.warn("pg-boss falling back to DATABASE_URL; set DIRECT_DATABASE_URL");
  }

  return connectionString;
}

export function getBoss() {
  if (!globalForBoss.verdiqtBoss) {
    globalForBoss.verdiqtBoss = new PgBoss({
      connectionString: bossConnectionString(),
      schema: "pgboss",
      application_name: "verdiqt-worker",
    });
  }

  return globalForBoss.verdiqtBoss;
}

async function startBossAndEnsureQueue() {
  const boss = getBoss();
  await boss.start();
  // pg-boss 10 drops sends silently when the queue row does not exist;
  // createQueue is an idempotent upsert, so ensure it on every cold start.
  await boss.createQueue(RUN_TRIAL_QUEUE);
  return boss;
}

export async function getStartedBoss() {
  if (!globalForBoss.verdiqtBossStart) {
    globalForBoss.verdiqtBossStart = startBossAndEnsureQueue().catch(
      (error: unknown) => {
        globalForBoss.verdiqtBossStart = undefined;
        globalForBoss.verdiqtBoss = undefined;
        throw error;
      },
    );
  }

  return globalForBoss.verdiqtBossStart;
}

export type EnqueueTrialResult = {
  jobId: string | null;
  deduped: boolean;
};

export async function enqueueTrial(input: {
  pipelineRunId: string;
  jobKey: string;
}): Promise<EnqueueTrialResult> {
  const boss = await getStartedBoss();
  const jobId = await boss.send(
    RUN_TRIAL_QUEUE,
    { pipelineRunId: input.pipelineRunId } satisfies RunTrialJob,
    {
      singletonKey: input.jobKey,
      retryLimit: 3,
      retryBackoff: true,
      expireInMinutes: 30,
      retentionDays: 7,
    },
  );

  // With the queue guaranteed to exist, a null send is exactly one thing:
  // the singletonKey already has a queued or active job, so the existing
  // run continues and no parallel work is created.
  return { jobId, deduped: jobId === null };
}
