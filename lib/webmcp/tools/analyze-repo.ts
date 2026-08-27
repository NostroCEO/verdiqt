import type { ModelContextTool } from "@/lib/webmcp/registry";
import { fetchApi, stringField } from "@/lib/webmcp/tools/api";

export const analyzeRepoTool: ModelContextTool = {
  name: "analyze_repo",
  description:
    "Start a validation trial from one of the signed-in user's repositories. Uses the repo's README and metadata to infer the idea.",
  inputSchema: {
    type: "object",
    properties: {
      repo_full_name: {
        type: "string",
        minLength: 3,
        maxLength: 200,
        pattern: "^[^/\\s]+/[^/\\s]+$",
      },
    },
    required: ["repo_full_name"],
    additionalProperties: false,
  },
  async execute(input, { signal }) {
    return fetchApi("/api/portfolio/analyze", {
      method: "POST",
      body: {
        repoFullName: stringField(input, "repo_full_name"),
      },
      signal,
    });
  },
};
