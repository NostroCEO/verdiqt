import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  structuredCall: vi.fn(),
  fetchRepoBrief: vi.fn(),
}));

vi.mock("@/lib/llm", () => ({
  structuredCall: mocks.structuredCall,
}));

vi.mock("@/lib/github/readme", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/github/readme")>();
  return { ...actual, fetchRepoBrief: mocks.fetchRepoBrief };
});

import { parseRepoUrl } from "@/lib/github/readme";
import { normalizeIdea } from "@/lib/verdict/normalize";

const normalized = {
  oneLiner: "AI changelog writer for indie SaaS teams",
  audience: "indie SaaS founders",
  problem: "changelogs never get written",
  category: "changelog automation",
  keywords: ["changelog", "release notes"],
};

describe("parseRepoUrl", () => {
  it("accepts full urls and owner/name shorthand, rejects everything else", () => {
    expect(parseRepoUrl("https://github.com/acme/tool")).toEqual({
      owner: "acme",
      name: "tool",
    });
    expect(parseRepoUrl("acme/tool")).toEqual({ owner: "acme", name: "tool" });
    expect(parseRepoUrl("https://gitlab.com/acme/tool")).toBeNull();
    expect(parseRepoUrl("not a repo")).toBeNull();
  });
});

describe("normalizeIdea", () => {
  afterEach(() => {
    mocks.structuredCall.mockReset();
    mocks.fetchRepoBrief.mockReset();
  });

  it("rejects zero or two inputs", async () => {
    await expect(normalizeIdea({})).rejects.toThrow(
      "normalize_requires_exactly_one_input",
    );
    await expect(
      normalizeIdea({ ideaText: "x", repoUrl: "acme/tool" }),
    ).rejects.toThrow("normalize_requires_exactly_one_input");
  });

  it("wraps repo content in evidence tags before prompting", async () => {
    mocks.fetchRepoBrief.mockResolvedValue({
      name: "acme/tool",
      description: "writes changelogs",
      readmeExcerpt: "Generates release notes from commits",
      language: "TypeScript",
      topics: ["changelog", "automation"],
      stars: 420,
    });
    mocks.structuredCall.mockResolvedValue(normalized);

    const result = await normalizeIdea({ repoUrl: "https://github.com/acme/tool" });

    expect(result).toEqual(normalized);
    const call = mocks.structuredCall.mock.calls[0][0];
    expect(call.user).toContain('<evidence id="repo-readme" source="GITHUB" trusted="false">');
    expect(call.schemaName).toBe("NormalizedIdea");
  });

  it("sanitizes free-text ideas before prompting", async () => {
    mocks.structuredCall.mockResolvedValue(normalized);

    await normalizeIdea({ ideaText: "<script>x</script>changelog writer" });

    expect(mocks.structuredCall.mock.calls[0][0].user).toContain(
      "changelog writer",
    );
    expect(mocks.structuredCall.mock.calls[0][0].user).not.toContain("<script>");
  });
});
