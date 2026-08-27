import type { ModelContextTool } from "@/lib/webmcp/registry";
import {
  fetchApi,
  invalidToolInput,
  optionalNumberField,
  optionalStringArrayField,
  stringField,
} from "@/lib/webmcp/tools/api";
import { dimensionSchema } from "@/lib/webmcp/tools/schemas";

export const searchKnowledgeTool: ModelContextTool = {
  name: "search_knowledge",
  description:
    "Search Verdiqt's marketing and validation knowledge base for frameworks and heuristics, for example offer design, demand signals, pricing, distribution.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", minLength: 1, maxLength: 200 },
      tags: {
        type: "array",
        items: dimensionSchema,
        maxItems: 6,
        uniqueItems: true,
      },
      limit: { type: "integer", minimum: 1, maximum: 10, default: 6 },
    },
    required: ["query"],
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
  },
  async execute(input, { signal }) {
    const query = stringField(input, "query");

    if (!query) {
      return invalidToolInput("query", "Provide a query from 1 to 200 characters.");
    }

    const params = new URLSearchParams({ q: query });
    const tags = optionalStringArrayField(input, "tags");
    const limit = optionalNumberField(input, "limit");

    if (tags) {
      params.set("tags", tags.join(","));
    }

    if (limit !== undefined) {
      params.set("limit", String(limit));
    }

    return fetchApi("/api/knowledge/search?" + params.toString(), { signal });
  },
};
