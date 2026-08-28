import { startWorker } from "@/lib/worker-boot";

// Standalone worker entry (local development and any future dedicated
// worker service). The colocated production path boots via instrumentation.
async function main() {
  const boss = await startWorker();

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
