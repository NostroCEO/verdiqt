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
      ts_rank_cd(
        setweight(to_tsvector('english', split_part("content", E'\n', 1)), 'A') ||
        setweight(to_tsvector('english', "content"), 'B'),
        websearch_to_tsquery('english', ${query}),
        32
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

// Pipeline grounding. websearch_to_tsquery ANDs plain terms, and a trial's
// category + up to 8 keywords never co-occur in one ~150-word corpus chunk —
// that query shape returned zero passages for essentially every trial. Terms
// are ORed as phrases instead, and when the lexical match still comes up
// short the dimension-tagged chunks backfill at similarity 0, so every
// scoring call is guaranteed k grounding passages from the curated corpus.
export async function retrieveGrounding(
  terms: string[],
  tags: string[],
  k = 4,
): Promise<KnowledgePassage[]> {
  const cleaned = terms
    .map((term) => term.replace(/["']/g, " ").trim())
    .filter(Boolean)
    .slice(0, 12);

  const query = cleaned.map((term) => `"${term}"`).join(" or ");

  const matched = query ? await retrieveKnowledge(query, tags, k) : [];
  if (matched.length >= k) {
    return matched;
  }

  const seen = matched.map((row) => `${row.sourceDoc}#${row.headingIndex}`);
  const backfill = await prisma.$queryRaw<
    Array<{
      content: string;
      sourceDoc: string;
      headingIndex: number;
      tags: string[];
    }>
  >(Prisma.sql`
    SELECT "content", "sourceDoc", "headingIndex", "tags"
    FROM "KnowledgeChunk"
    WHERE "tags" && ${tags}::text[]
      AND NOT ("sourceDoc" || '#' || "headingIndex"::text = ANY(${seen}::text[]))
    ORDER BY "headingIndex" ASC
    LIMIT ${k - matched.length}
  `);

  return [
    ...matched,
    ...backfill.map((row) => ({ ...row, similarity: 0 })),
  ];
}
