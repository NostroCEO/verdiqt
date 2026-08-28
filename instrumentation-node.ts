// Node-runtime boot: applies pending migrations and starts the colocated
// pipeline worker (zero-budget topology, founder decision 2026-08-28).
// Imported ONLY from instrumentation.ts behind the NEXT_RUNTIME guard so the
// edge bundle never sees pg or prisma.
export async function bootNode() {
  if (process.env.RENDER !== "true" && process.env.COLOCATED_WORKER !== "true") {
    return;
  }

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);

  try {
    const { stdout } = await run("node_modules/.bin/prisma", ["migrate", "deploy"], {
      env: process.env,
    });
    console.log("migrate deploy:", stdout.trim().split("\n").at(-1));
  } catch (error) {
    // Never silently skipped: the worker below fails visibly on missing
    // tables and the logs carry the cause.
    console.error("migrate deploy failed", error);
  }

  try {
    const { ingestCorpus } = await import("@/lib/brain/ingest-run");
    const result = await ingestCorpus();
    console.log(`corpus ingested: ${result.chunks} chunks from ${result.files} files`);
  } catch (error) {
    console.error("corpus ingest failed", error);
  }

  try {
    const { startWorker } = await import("@/lib/worker-boot");
    await startWorker();
  } catch (error) {
    console.error("colocated worker failed to start", error);
  }

  try {
    const { startRetentionLoop } = await import("@/lib/retention");
    startRetentionLoop();
  } catch (error) {
    console.error("retention loop failed to start", error);
  }
}
