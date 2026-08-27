import type { ModelContextTool } from "@/lib/webmcp/registry";
import { fetchApi } from "@/lib/webmcp/tools/api";

export const listReposTool: ModelContextTool = {
  name: "list_repos",
  route: "GET /api/portfolio/repos",
  description:
    "List the signed-in user's public GitHub repositories available for portfolio analysis. Requires the human to be signed in with GitHub on the page.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
    untrustedContentHint: true,
  },
  async execute(_input, { signal }) {
    return fetchApi("/api/portfolio/repos", { signal });
  },
};
