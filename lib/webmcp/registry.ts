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
  execute: (input: unknown, options: ToolExecutionOptions) => Promise<unknown>;
};

export type ModelContext = {
  registerTool: (
    tool: ModelContextTool,
    options?: { signal?: AbortSignal },
  ) => Promise<void>;
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

export async function registerAllTools(
  modelContext: ModelContext,
  tools: ModelContextTool[],
  signal: AbortSignal,
): Promise<void> {
  await Promise.all(tools.map((tool) => modelContext.registerTool(tool, { signal })));
}
