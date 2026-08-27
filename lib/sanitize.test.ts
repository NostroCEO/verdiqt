import { describe, expect, it } from "vitest";

import { sanitizeSnippet, wrapEvidence } from "@/lib/sanitize";

describe("sanitizeSnippet", () => {
  it("strips markup to text so scripts never reach prompts or tool results", () => {
    expect(sanitizeSnippet("<script>alert(1)</script>hello")).toBe("hello");
    expect(sanitizeSnippet("<style>.x{color:red}</style>body text")).toBe(
      "body text",
    );
    expect(sanitizeSnippet('<a href="https://x.dev">link text</a> tail')).toBe(
      "link text tail",
    );
  });

  it("strips control characters and collapses whitespace", () => {
    expect(sanitizeSnippet("abc")).toBe("abc");
    expect(sanitizeSnippet("a\n\n  b\t\tc")).toBe("a b c");
  });

  it("caps at the maximum length", () => {
    expect(sanitizeSnippet("x".repeat(600))).toHaveLength(500);
    expect(sanitizeSnippet("hello world", 5)).toBe("hello");
  });

  it("returns an empty string for empty or tag-only input", () => {
    expect(sanitizeSnippet("")).toBe("");
    expect(sanitizeSnippet("<div><br/></div>")).toBe("");
  });
});

describe("wrapEvidence", () => {
  it("produces the exact untrusted evidence tag format", () => {
    expect(wrapEvidence("ev1", "HACKERNEWS", "quoted text")).toBe(
      '<evidence id="ev1" source="HACKERNEWS" trusted="false">quoted text</evidence>',
    );
  });

  it("marks pinned evidence as human-pinned, vouched for relevance not truth", () => {
    expect(wrapEvidence("ev2", "REDDIT", "text", "human-pinned")).toBe(
      '<evidence id="ev2" source="REDDIT" trusted="human-pinned">text</evidence>',
    );
  });

  it("escapes attribute quotes so ids cannot break out of the tag", () => {
    expect(wrapEvidence('e"1', "GITHUB", "t")).toContain('id="e&quot;1"');
  });
});
