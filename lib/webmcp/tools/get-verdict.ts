import type { ModelContextTool } from "@/lib/webmcp/registry";
import { encodedRunPath, fetchApi, invalidToolInput } from "@/lib/webmcp/tools/api";
import { runIdSchema } from "@/lib/webmcp/tools/schemas";

export const getVerdictTool: ModelContextTool = {
  name: "get_verdict",
  route: "GET /api/trials/:id/verdict",
  description:
    "Get the final ruling for a COMPLETE trial: composite score 0-100, BUILD (70+) / PIVOT (40-69) / KILL (<40), six dimension scores with rationales and evidence citations, the bench's written opinion (next_step.bench_opinion), and the single recommended next step. Summarize the verdict, the bench opinion, and the next step for the user; cite evidence via get_evidence when asked for proof.",
  inputSchema: {
    type: "object",
    properties: {
      run_id: runIdSchema,
    },
    required: ["run_id"],
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
  },
  async execute(input, { signal }) {
    const path = encodedRunPath(input, "/verdict");
    return path
      ? fetchApi(path, { signal })
      : invalidToolInput("run_id", "Provide the run_id returned by start_validation.");
  },
};
