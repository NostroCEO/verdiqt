import type { ModelContextTool } from "@/lib/webmcp/registry";
import { encodedRunPath, fetchApi, invalidToolInput } from "@/lib/webmcp/tools/api";
import { runIdSchema } from "@/lib/webmcp/tools/schemas";

export const getNextStepTool: ModelContextTool = {
  name: "get_next_step",
  route: "GET /api/trials/:id/next-step",
  description:
    "Get the single recommended next validation action for a completed trial, chosen from Verdiqt's validation playbook.",
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
    const path = encodedRunPath(input, "/next-step");
    return path
      ? fetchApi(path, { signal })
      : invalidToolInput("run_id", "Provide the run_id returned by start_validation.");
  },
};
