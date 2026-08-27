import type { ModelContextTool } from "@/lib/webmcp/registry";
import {
  encodedRunPath,
  fetchApi,
  invalidToolInput,
  optionalStringField,
  stringField,
} from "@/lib/webmcp/tools/api";
import { dimensionSchema, runIdSchema } from "@/lib/webmcp/tools/schemas";

export const requestDeepScanTool: ModelContextTool = {
  name: "request_deep_scan",
  route: "POST /api/trials/:id/deep-scan-requests",
  description:
    "Request a deeper evidence scan for one dimension of a trial. This queues an approval card in the page UI; the human must click Approve before the scan runs. Poll get_validation_status to see when it completes.",
  inputSchema: {
    type: "object",
    properties: {
      run_id: runIdSchema,
      dimension: dimensionSchema,
      reason: { type: "string", maxLength: 300 },
    },
    required: ["run_id", "dimension"],
    additionalProperties: false,
  },
  async execute(input, { signal }) {
    const path = encodedRunPath(input, "/deep-scan-requests");
    const dimension = stringField(input, "dimension");

    if (!path) {
      return invalidToolInput("run_id", "Provide the run_id returned by start_validation.");
    }

    if (!dimension) {
      return invalidToolInput("dimension", "Provide one of the six dimension enum values.");
    }

    return fetchApi(path, {
      method: "POST",
      body: {
        dimension,
        reason: optionalStringField(input, "reason"),
      },
      signal,
    });
  },
};
