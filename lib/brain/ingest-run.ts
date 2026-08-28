import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parseCorpusFile } from "@/lib/brain/ingest";
import { prisma } from "@/lib/db";

// Idempotent corpus ingestion shared by the CLI script and the boot path:
// upserts by the stable (sourceDoc, headingIndex) key, so re-running on
// every container start is cheap and never duplicates.
export async function ingestCorpus(baseDir = process.cwd()) {
  const dir = path.join(baseDir, "content", "brain");
  const files = (await readdir(dir)).filter((file) => file.endsWith(".md"));

  let total = 0;

  for (const file of files.sort()) {
    const raw = await readFile(path.join(dir, file), "utf8");

    for (const chunk of parseCorpusFile(file, raw)) {
      await prisma.knowledgeChunk.upsert({
        where: {
          knowledge_chunk_source_heading: {
            sourceDoc: chunk.sourceDoc,
            headingIndex: chunk.headingIndex,
          },
        },
        create: chunk,
        update: {
          tags: chunk.tags,
          content: chunk.content,
          contentHash: chunk.contentHash,
        },
      });
      total += 1;
    }
  }

  return { files: files.length, chunks: total };
}
