import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type KnowledgePassage = {
  content: string;
  sourceDoc: string;
  headingIndex: number;
  tags: string[];
  similarity: number;
};

// Zero-budget retrieval (docs/STATE.md, founder D20): Postgres full-text
// ranking instead of paid embeddings. `similarity` keeps the tool-contract
// field name; here it is a ts_rank score, monotonic in relevance.
export async function retrieveKnowledge(
  query: string,
  tags?: string[],
  k = 6,
): Promise<KnowledgePassage[]> {
  const tagFilter = tags && tags.length > 0 ? tags : null;

  const rows = await prisma.$queryRaw<
    Array<{
      content: string;
      sourceDoc: string;
      headingIndex: number;
      tags: string[];
      similarity: number;
    }>
  >(Prisma.sql`
    SELECT
      "content",
      "sourceDoc",
      "headingIndex",
      "tags",
      ts_rank(
        to_tsvector('english', "content"),
        websearch_to_tsquery('english', ${query})
      )::float AS "similarity"
    FROM "KnowledgeChunk"
    WHERE to_tsvector('english', "content")
      @@ websearch_to_tsquery('english', ${query})
      AND (${tagFilter}::text[] IS NULL OR "tags" && ${tagFilter}::text[])
    ORDER BY "similarity" DESC
    LIMIT ${k}
  `);

  return rows;
}
