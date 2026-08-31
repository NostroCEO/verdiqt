import type { ModelContextTool } from "@/lib/webmcp/registry";
import { fetchApi, stringField } from "@/lib/webmcp/tools/api";

// Rewired 2026-08-31: the original target (POST /api/portfolio/analyze) was
// part of the cut GitHub-OAuth portfolio and never existed as a handler, so
// the tool always returned api_unavailable. Public-repo analysis is the
// normal trial flow — repoUrl into POST /api/trials — which the pipeline
// already normalizes from the repo's README and metadata.
export const analyzeRepoTool: ModelContextTool = {
  name: "analyze_repo",
  route: "POST /api/trials",
  description:
    "Start a validation trial from any public GitHub repository (owner/repo). The court reads the repo's README and metadata to infer the idea, then runs the full evidence trial. Poll get_validation_status until COMPLETE, then call get_verdict.",
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
    const repoFullName = stringField(input, "repo_full_name");
    return fetchApi("/api/trials", {
      method: "POST",
      body: {
        repoUrl: `https://github.com/${repoFullName}`,
      },
      signal,
    });
  },
};
