import { ingestCorpus } from "@/lib/brain/ingest-run";
import { prisma } from "@/lib/db";

// CLI wrapper around the shared idempotent ingestion (also run at boot by
// instrumentation-node.ts on Render).
ingestCorpus()
  .then((result) => {
    console.log(`ingested ${result.chunks} chunks from ${result.files} files`);
  })
  .catch((error) => {
    console.error("ingest failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
