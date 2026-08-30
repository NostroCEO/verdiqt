import { analyzeRepoTool } from "@/lib/webmcp/tools/analyze-repo";
import { compareIdeasTool } from "@/lib/webmcp/tools/compare-ideas";
import { getEvidenceTool } from "@/lib/webmcp/tools/get-evidence";
import { getNextStepTool } from "@/lib/webmcp/tools/get-next-step";
import { getValidationStatusTool } from "@/lib/webmcp/tools/get-validation-status";
import { getVerdictTool } from "@/lib/webmcp/tools/get-verdict";
import { listReposTool } from "@/lib/webmcp/tools/list-repos";
import { rankPortfolioTool } from "@/lib/webmcp/tools/rank-portfolio";
import { refineIdeaTool } from "@/lib/webmcp/tools/refine-idea";
import { requestDeepScanTool } from "@/lib/webmcp/tools/request-deep-scan";
import { searchKnowledgeTool } from "@/lib/webmcp/tools/search-knowledge";
import { startValidationTool } from "@/lib/webmcp/tools/start-validation";

import { recordToolActivity } from "@/lib/webmcp/bus";

export type ToolExecutionOptions = {
  signal: AbortSignal;
};

export type ModelContextTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  // UI-only contract metadata for the landing inspector. Stripped before the
  // native registerTool call so agents see the exact spec shape.
  route: string;
  execute: (input: unknown, options: ToolExecutionOptions) => Promise<unknown>;
};

export type NativeModelContextTool = Omit<ModelContextTool, "route">;

export type ModelContext = {
  registerTool: (
    tool: NativeModelContextTool,
    options?: { signal?: AbortSignal },
  ) => Promise<void>;
  // Current-spec optional surface, feature-detected as progressive
  // enhancement only (a required live client may lack either member).
  getTools?: (options?: { fromOrigins?: string[] }) => Promise<unknown>;
  addEventListener?: (type: "toolchange", listener: () => void) => void;
  removeEventListener?: (type: "toolchange", listener: () => void) => void;
};

// The full documented tool contract. Every tool's route + input schema is
// validated in tests against this list, regardless of what a given deployment
// registers.
export const webmcpTools: ModelContextTool[] = [
  startValidationTool,
  getValidationStatusTool,
  getEvidenceTool,
  requestDeepScanTool,
  getVerdictTool,
  refineIdeaTool,
  compareIdeasTool,
  getNextStepTool,
  listReposTool,
  analyzeRepoTool,
  rankPortfolioTool,
  searchKnowledgeTool,
];

// The tools actually registered with the browser and shown in the on-page
// docket. list_repos and rank_portfolio require GitHub OAuth (listing a user's
// repos / ranking their portfolio); OAuth is disabled in the hosted demo, so
// they are gated out — an agent and the docket only ever see tools that
// actually work. This keeps the WebMCP-leverage story honest: no dead tools on
// the tie-breaking criterion. They return automatically when
// NEXT_PUBLIC_GITHUB_OAUTH_ENABLED is "true".
export const activeTools: ModelContextTool[] =
  process.env.NEXT_PUBLIC_GITHUB_OAUTH_ENABLED === "true"
    ? webmcpTools
    : webmcpTools.filter(
        (tool) => tool !== listReposTool && tool !== rankPortfolioTool,
      );

export function getModelContext(): ModelContext | null {
  if (typeof document === "undefined") {
    return null;
  }

  const doc = document as Document & { modelContext?: ModelContext };
  if (doc.modelContext) {
    return doc.modelContext;
  }

  // Some WebMCP clients (notably in-app browsers) expose the surface on
  // navigator instead of document; document stays primary per the spec.
  const nav = navigator as Navigator & { modelContext?: ModelContext };
  return nav.modelContext ?? null;
}

function isErrorResult(value: unknown) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { error?: unknown }).error === "string"
  );
}

// The wrapper forwards (input, options) verbatim and returns or rethrows the
// original value unchanged; only name, timestamp, and ok/error status reach
// the in-page bus. Agent payloads never do.
export function toNativeTool(tool: ModelContextTool): NativeModelContextTool {
  const { route: _route, execute, ...nativeShape } = tool;

  return {
    ...nativeShape,
    execute: async (input, options) => {
      try {
        const result = await execute(input, options);
        recordToolActivity({
          tool: tool.name,
          status: isErrorResult(result) ? "error" : "ok",
          at: Date.now(),
        });
        return result;
      } catch (error) {
        recordToolActivity({ tool: tool.name, status: "error", at: Date.now() });
        throw error;
      }
    },
  };
}

export type ToolRegistrationResult = {
  name: string;
  ok: boolean;
};

export async function registerAllTools(
  modelContext: ModelContext,
  tools: ModelContextTool[],
  signal: AbortSignal,
): Promise<ToolRegistrationResult[]> {
  // allSettled: one rejected registration must not discard the tools the
  // browser accepted (founder decision D15: partial truth over atomic).
  const settled = await Promise.allSettled(
    tools.map((tool) => modelContext.registerTool(toNativeTool(tool), { signal })),
  );

  return settled.map((result, index) => ({
    name: tools[index].name,
    ok: result.status === "fulfilled",
  }));
}
