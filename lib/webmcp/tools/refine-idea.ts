import type { ModelContextTool } from "@/lib/webmcp/registry";
import {
  encodedRunPath,
  fetchApi,
  invalidToolInput,
  stringField,
} from "@/lib/webmcp/tools/api";
import { runIdSchema } from "@/lib/webmcp/tools/schemas";

export const refineIdeaTool: ModelContextTool = {
  name: "refine_idea",
  route: "POST /api/trials/:id/refine",
  description:
    "Re-run validation on a pivoted version of an existing idea. Creates a new linked trial so the two can be compared with compare_ideas.",
  inputSchema: {
    type: "object",
    properties: {
      run_id: runIdSchema,
      pivot_text: { type: "string", minLength: 1, maxLength: 2000 },
    },
    required: ["run_id", "pivot_text"],
    additionalProperties: false,
  },
  async execute(input, { signal }) {
    const path = encodedRunPath(input, "/refine");

    if (!path) {
      return invalidToolInput("run_id", "Provide the run_id returned by start_validation.");
    }

    return fetchApi(path, {
      method: "POST",
      body: {
        pivotText: stringField(input, "pivot_text"),
      },
      signal,
    });
  },
};
