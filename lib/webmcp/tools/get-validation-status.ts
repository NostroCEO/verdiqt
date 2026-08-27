import type { ModelContextTool } from "@/lib/webmcp/registry";
import { encodedRunPath, fetchApi, invalidToolInput } from "@/lib/webmcp/tools/api";
import { runIdSchema } from "@/lib/webmcp/tools/schemas";

export const getValidationStatusTool: ModelContextTool = {
  name: "get_validation_status",
  route: "GET /api/trials/:id/status",
  description:
    "Get the current status, progress, pending approvals, and recent human actions for a validation trial. Call again after the human changes evidence, weights, or an approval. Statuses: QUEUED, NORMALIZING, GATHERING, CLASSIFYING, SCORING, COMPLETE, FAILED.",
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
    const path = encodedRunPath(input, "/status");
    return path
      ? fetchApi(path, { signal })
      : invalidToolInput("run_id", "Provide the run_id returned by start_validation.");
  },
};
