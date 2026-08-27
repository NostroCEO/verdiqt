import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchApi: vi.fn(),
}));

vi.mock("@/lib/webmcp/tools/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/webmcp/tools/api")>();
  return { ...actual, fetchApi: mocks.fetchApi };
});

import { registerAllTools, toNativeTool, webmcpTools } from "@/lib/webmcp/registry";

// Sample inputs that satisfy each tool's guards, so execute reaches its fetch.
const sampleInputs: Record<string, unknown> = {
  start_validation: { idea_text: "An idea" },
  get_validation_status: { run_id: "r 1" },
  get_evidence: { run_id: "r 1" },
  request_deep_scan: { run_id: "r 1", dimension: "MONETIZATION" },
  get_verdict: { run_id: "r 1" },
  refine_idea: { run_id: "r 1", pivot_text: "Pivot" },
  compare_ideas: { run_ids: ["r 1", "r2"] },
  get_next_step: { run_id: "r 1" },
  list_repos: {},
  analyze_repo: { repo_full_name: "owner/name" },
  rank_portfolio: { max_repos: 3 },
  search_knowledge: { query: "pricing" },
};

function expectedPathPrefix(route: string) {
  const path = route.split(" ")[1];
  return path.replace(":id", encodeURIComponent("r 1")).split("?")[0];
}

describe("tool route metadata", () => {
  afterEach(() => {
    mocks.fetchApi.mockReset();
  });

  it("matches the path each execute actually fetches, for all 12 tools", async () => {
    for (const tool of webmcpTools) {
      mocks.fetchApi.mockReset();
      mocks.fetchApi.mockResolvedValue({});
      const controller = new AbortController();

      const result = await tool.execute(sampleInputs[tool.name], {
        signal: controller.signal,
      });

      expect(mocks.fetchApi, tool.name).toHaveBeenCalledTimes(1);
      const calledPath = mocks.fetchApi.mock.calls[0][0] as string;
      expect(calledPath.split("?")[0], tool.name).toBe(
        expectedPathPrefix(tool.route),
      );
      expect(result, tool.name).toEqual({});
    }
  });

  it("strips the route field from the native registration shape", async () => {
    const registered: unknown[] = [];
    const modelContext = {
      registerTool: vi.fn(async (tool: unknown) => {
        registered.push(tool);
      }),
    };
    const controller = new AbortController();

    const results = await registerAllTools(
      modelContext,
      webmcpTools,
      controller.signal,
    );

    expect(results.every((r) => r.ok)).toBe(true);
    for (const tool of registered) {
      expect(Object.keys(tool as Record<string, unknown>)).not.toContain("route");
    }
  });

  it("reports per-tool registration outcomes without discarding survivors", async () => {
    const modelContext = {
      registerTool: vi.fn(async (tool: { name: string }) => {
        if (tool.name === "rank_portfolio") {
          throw new Error("client rejected tool");
        }
      }),
    };
    const controller = new AbortController();

    const results = await registerAllTools(
      modelContext,
      webmcpTools,
      controller.signal,
    );

    expect(results.filter((r) => r.ok)).toHaveLength(webmcpTools.length - 1);
    expect(results.find((r) => !r.ok)?.name).toBe("rank_portfolio");
  });

  it("keeps the wrapper transparent: forwards options and returns results unchanged", async () => {
    const tool = webmcpTools.find((t) => t.name === "get_verdict");
    if (!tool) throw new Error("missing tool");
    const native = toNativeTool(tool);
    const controller = new AbortController();
    const payload = { verdict: "BUILD" };
    mocks.fetchApi.mockResolvedValue(payload);

    const result = await native.execute(sampleInputs.get_verdict, {
      signal: controller.signal,
    });

    expect(result).toBe(payload);
    expect(mocks.fetchApi.mock.calls[0][1]).toMatchObject({
      signal: controller.signal,
    });
  });
});
