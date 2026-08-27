import type { ModelContextTool } from "@/lib/webmcp/registry";
import { encodedRunPath, fetchApi, invalidToolInput } from "@/lib/webmcp/tools/api";
import { runIdSchema } from "@/lib/webmcp/tools/schemas";

export const getVerdictTool: ModelContextTool = {
  name: "get_verdict",
  description:
    "Get the full scored verdict for a completed trial: composite score, BUILD or PIVOT or KILL, six dimension scores with rationales and evidence citations, and the recommended next step.",
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
