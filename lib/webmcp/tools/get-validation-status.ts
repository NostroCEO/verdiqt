import type { ModelContextTool } from "@/lib/webmcp/registry";
import { encodedRunPath, fetchApi, invalidToolInput } from "@/lib/webmcp/tools/api";
import { runIdSchema } from "@/lib/webmcp/tools/schemas";

export const getValidationStatusTool: ModelContextTool = {
  name: "get_validation_status",
  route: "GET /api/trials/:id/status",
  description:
    "Poll a running trial by run_id. Statuses: QUEUED, NORMALIZING, GATHERING, CLASSIFYING, SCORING, COMPLETE, FAILED. Keep polling every few seconds while not terminal; when COMPLETE call get_verdict; when FAILED read error_code and tell the user why. Also returns evidence_count, per-source research states, the normalized case_file, pending approvals, and recent human actions — re-read after the human changes anything.",
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
