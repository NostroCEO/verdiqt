// Boot-time wiring that works under the plain `pnpm start` command, so the
// deployment never depends on Blueprint syncs applying: on Render (RENDER
// env is platform-set) the web container first applies pending database
// migrations, then starts the colocated pipeline worker (zero-budget
// topology, founder decision 2026-08-28). Local dev and builds are untouched.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
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
    // Migrations must not be silently skipped: log loudly. The worker below
    // will fail visibly on missing tables, and /api/health stays truthful.
    console.error("migrate deploy failed", error);
  }

  try {
    const { startWorker } = await import("@/lib/worker-boot");
    await startWorker();
  } catch (error) {
    console.error("colocated worker failed to start", error);
  }
}
