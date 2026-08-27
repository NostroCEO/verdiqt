import type { ModelContextTool } from "@/lib/webmcp/registry";
import { fetchApi, recordFrom } from "@/lib/webmcp/tools/api";

export const compareIdeasTool: ModelContextTool = {
  name: "compare_ideas",
  description: "Compare two or more completed trials side by side across all six dimensions.",
  inputSchema: {
    type: "object",
    properties: {
      run_ids: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 5,
        uniqueItems: true,
      },
    },
    required: ["run_ids"],
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
  },
  async execute(input, { signal }) {
    return fetchApi("/api/trials/compare", {
      method: "POST",
      body: {
        runIds: recordFrom(input).run_ids,
      },
      signal,
    });
  },
};
