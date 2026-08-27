import { createHash } from "node:crypto";

// Pure corpus parsing, separated from the script so it is unit-testable.
// Frontmatter is our own controlled format (a single tags line), parsed
// without adding a parser dependency to the locked stack.

export type CorpusChunk = {
  sourceDoc: string;
  headingIndex: number;
  tags: string[];
  content: string;
  contentHash: string;
};

const FRONTMATTER = /^---\s*\ntags:\s*\[([^\]]*)\]\s*\n---\s*\n/;

export function parseCorpusFile(sourceDoc: string, raw: string): CorpusChunk[] {
  const match = FRONTMATTER.exec(raw);

  if (!match) {
    throw new Error(`corpus_missing_frontmatter:${sourceDoc}`);
  }

  const tags = match[1]
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const body = raw.slice(match[0].length);

  // Chunk by ## headings; the H1 title stays with the first chunk's context.
  const sections = body.split(/\n(?=## )/);
  const chunks: CorpusChunk[] = [];

  for (const section of sections) {
    const content = section.trim();
    if (!content || !content.includes("## ")) continue;

    chunks.push({
      sourceDoc,
      headingIndex: chunks.length,
      tags,
      content,
      contentHash: createHash("sha256").update(content).digest("hex"),
    });
  }

  if (chunks.length === 0) {
    throw new Error(`corpus_no_sections:${sourceDoc}`);
  }

  return chunks;
}
