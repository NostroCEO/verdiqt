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

export function getModelContext(): ModelContext | null {
  if (typeof document === "undefined") {
    return null;
  }

  const doc = document as Document & { modelContext?: ModelContext };
  return doc.modelContext ?? null;
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
