import { describe, expect, it } from "vitest";

import { parseCorpusFile } from "@/lib/brain/ingest";

const sample = `---
tags: [MONETIZATION, PROBLEM_SEVERITY]
---
# Offer levers

Intro line under the title.

## Dream outcome

What the buyer actually wants.

## Time delay

Faster wins compound.
`;

describe("parseCorpusFile", () => {
  it("chunks by ## heading with stable zero-based indexes and shared tags", () => {
    const chunks = parseCorpusFile("offer-value-equation.md", sample);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      sourceDoc: "offer-value-equation.md",
      headingIndex: 0,
      tags: ["MONETIZATION", "PROBLEM_SEVERITY"],
    });
    expect(chunks[0].content).toContain("## Dream outcome");
    expect(chunks[1].headingIndex).toBe(1);
    expect(chunks[1].content).toContain("## Time delay");
    expect(chunks[0].contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic: same content, same hashes and indexes", () => {
    const first = parseCorpusFile("a.md", sample);
    const second = parseCorpusFile("a.md", sample);
    expect(first).toEqual(second);
  });

  it("rejects files without frontmatter or sections", () => {
    expect(() => parseCorpusFile("x.md", "no frontmatter")).toThrow(
      "corpus_missing_frontmatter",
    );
    expect(() =>
      parseCorpusFile("y.md", "---\ntags: [COMPETITION]\n---\njust a paragraph"),
    ).toThrow("corpus_no_sections");
  });

  it("parses every real corpus file with dimension-only tags", async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const dimensions = new Set([
      "PROBLEM_SEVERITY",
      "DEMAND_SIGNALS",
      "COMPETITION",
      "MONETIZATION",
      "DISTRIBUTION",
      "BUILD_COST",
    ]);

    const dir = path.join(process.cwd(), "content", "brain");
    const files = (await readdir(dir)).filter((file) => file.endsWith(".md"));
    expect(files.length).toBeGreaterThanOrEqual(12);

    for (const file of files) {
      const chunks = parseCorpusFile(
        file,
        await readFile(path.join(dir, file), "utf8"),
      );
      expect(chunks.length, file).toBeGreaterThanOrEqual(3);
      for (const tag of chunks[0].tags) {
        expect(dimensions.has(tag), `${file} tag ${tag}`).toBe(true);
      }
    }
  });
});
