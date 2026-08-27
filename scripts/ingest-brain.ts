import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parseCorpusFile } from "@/lib/brain/ingest";
import { prisma } from "@/lib/db";

// Idempotent corpus ingestion: re-running updates existing chunks by the
// stable (sourceDoc, headingIndex) key without duplication. Embeddings are
// intentionally not written (zero-budget decision: retrieval is Postgres
// full-text; the vector column stays for a future upgrade).
async function main() {
  const dir = path.join(process.cwd(), "content", "brain");
  const files = (await readdir(dir)).filter((file) => file.endsWith(".md"));

  let total = 0;

  for (const file of files.sort()) {
    const raw = await readFile(path.join(dir, file), "utf8");
    const chunks = parseCorpusFile(file, raw);

    for (const chunk of chunks) {
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

    console.log(`${file}: ${chunks.length} chunks`);
  }

  console.log(`ingested ${total} chunks from ${files.length} files`);
}

main()
  .catch((error) => {
    console.error("ingest failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
