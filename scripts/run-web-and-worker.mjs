import { spawn } from "node:child_process";

// Zero-budget colocation (founder decision 2026-08-28): the pipeline worker
// runs alongside the web server in the free-tier container instead of a paid
// worker service. Same processes, same contracts, one container. If either
// process dies, the container exits so Render restarts both together.
function run(name, command, args) {
  const child = spawn(command, args, { stdio: "inherit", env: process.env });

  child.on("exit", (code) => {
    console.log(`${name} exited with code ${code}`);
    process.exit(code ?? 1);
  });

  return child;
}

console.log("starting verdiqt web + worker in one container");
run("worker", "pnpm", ["worker"]);
run("web", "pnpm", ["start"]);
