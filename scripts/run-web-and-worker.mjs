import { spawn } from "node:child_process";

// Zero-budget colocation (founder decision 2026-08-28): the pipeline worker
// is started by Next's instrumentation hook INSIDE the web process (see
// instrumentation-node.ts), so this launcher must start only the web server.
// Spawning `pnpm worker` here too would run a second worker with its own
// pg-boss and Prisma pools — doubled connections for zero throughput.
function run(name, command, args) {
  const child = spawn(command, args, { stdio: "inherit", env: process.env });

  child.on("exit", (code) => {
    console.log(`${name} exited with code ${code}`);
    process.exit(code ?? 1);
  });

  return child;
}

console.log("starting verdiqt web (worker colocates via instrumentation)");
run("web", "pnpm", ["start"]);
