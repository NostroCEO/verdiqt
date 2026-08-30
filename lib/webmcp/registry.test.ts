import Ajv from "ajv";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ModelContext, ModelContextTool } from "@/lib/webmcp/registry";
import { activeTools, registerAllTools, webmcpTools } from "@/lib/webmcp/registry";
import { startValidationTool } from "@/lib/webmcp/tools/start-validation";

const expectedToolNames = [
  "start_validation",
  "get_validation_status",
  "get_evidence",
  "request_deep_scan",
  "get_verdict",
  "refine_idea",
  "compare_ideas",
  "get_next_step",
  "list_repos",
  "analyze_repo",
  "rank_portfolio",
  "search_knowledge",
];

describe("WebMCP registry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("exports exactly the documented 12 tools", () => {
    expect(webmcpTools.map((tool) => tool.name)).toEqual(expectedToolNames);
  });

  it("gates the OAuth-only portfolio tools out of the active set by default", () => {
    // NEXT_PUBLIC_GITHUB_OAUTH_ENABLED is unset in tests, so the two tools that
    // need GitHub OAuth are excluded from what actually registers and displays.
    const activeNames = activeTools.map((tool) => tool.name);
    expect(activeNames).not.toContain("list_repos");
    expect(activeNames).not.toContain("rank_portfolio");
    expect(activeTools).toHaveLength(webmcpTools.length - 2);
    // Everything else stays: analyze_repo works on public repos, no OAuth.
    expect(activeNames).toContain("analyze_repo");
    expect(activeNames).toContain("start_validation");
  });

  it("compiles every input schema as JSON Schema", () => {
    const ajv = new Ajv({
      strict: true,
      allowUnionTypes: false,
      validateFormats: false,
    });

    for (const tool of webmcpTools) {
      expect(() => ajv.compile(tool.inputSchema), tool.name).not.toThrow();
    }
  });

  it("passes one lifecycle AbortSignal to every registration", async () => {
    const signal = new AbortController().signal;
    const registered: Array<{ tool: ModelContextTool; signal?: AbortSignal }> = [];
    const modelContext: ModelContext = {
      registerTool: vi.fn(async (tool, options) => {
        registered.push({ tool, signal: options?.signal });
      }),
    };

    await registerAllTools(modelContext, webmcpTools, signal);

    expect(registered).toHaveLength(12);
    expect(registered.every((entry) => entry.signal === signal)).toBe(true);
  });

  it("forwards the execution AbortSignal to same-origin fetch", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          run_id: "run_123",
          status: "QUEUED",
          dashboard_url: "/trial/run_123",
        }),
        {
          headers: { "content-type": "application/json" },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await startValidationTool.execute(
      { idea_text: "A changelog writer for indie SaaS teams" },
      { signal: controller.signal },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trials",
      expect.objectContaining({
        credentials: "include",
        signal: controller.signal,
        method: "POST",
      }),
    );
  });
});
