import type { ModelContextTool } from "@/lib/webmcp/registry";
import {
  encodedRunPath,
  fetchApi,
  invalidToolInput,
  optionalStringField,
} from "@/lib/webmcp/tools/api";
import {
  dimensionSchema,
  evidenceSourceSchema,
  runIdSchema,
} from "@/lib/webmcp/tools/schemas";

export const getEvidenceTool: ModelContextTool = {
  name: "get_evidence",
  description:
    "List evidence gathered for a trial. Optionally filter by dimension or source. Includes the human's pinned or rejected state per item.",
  inputSchema: {
    type: "object",
    properties: {
      run_id: runIdSchema,
      dimension: dimensionSchema,
      source: evidenceSourceSchema,
    },
    required: ["run_id"],
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
    untrustedContentHint: true,
  },
  async execute(input, { signal }) {
    const path = encodedRunPath(input, "/evidence");

    if (!path) {
      return invalidToolInput("run_id", "Provide the run_id returned by start_validation.");
    }

    const params = new URLSearchParams();
    const dimension = optionalStringField(input, "dimension");
    const source = optionalStringField(input, "source");

    if (dimension) {
      params.set("dimension", dimension);
    }

    if (source) {
      params.set("source", source);
    }

    return fetchApi(path + (params.size > 0 ? "?" + params.toString() : ""), { signal });
  },
};
