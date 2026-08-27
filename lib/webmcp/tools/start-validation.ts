import type { ModelContextTool } from "@/lib/webmcp/registry";
import { fetchApi, optionalStringField } from "@/lib/webmcp/tools/api";

export const startValidationTool: ModelContextTool = {
  name: "start_validation",
  description:
    "Start a validation trial for a SaaS idea. Provide either idea_text describing the idea, or repo_url pointing to a public GitHub repository. Returns a run_id to poll with get_validation_status.",
  inputSchema: {
    type: "object",
    properties: {
      idea_text: { type: "string", minLength: 1, maxLength: 2000 },
      repo_url: { type: "string", format: "uri" },
    },
    oneOf: [
      {
        properties: { idea_text: {}, repo_url: false },
        required: ["idea_text"],
      },
      {
        properties: { idea_text: false, repo_url: {} },
        required: ["repo_url"],
      },
    ],
    additionalProperties: false,
  },
  async execute(input, { signal }) {
    return fetchApi("/api/trials", {
      method: "POST",
      body: {
        ideaText: optionalStringField(input, "idea_text"),
        repoUrl: optionalStringField(input, "repo_url"),
      },
      signal,
    });
  },
};
