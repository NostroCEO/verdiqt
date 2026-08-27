import type { ModelContextTool } from "@/lib/webmcp/registry";
import { fetchApi, optionalNumberField } from "@/lib/webmcp/tools/api";

export const rankPortfolioTool: ModelContextTool = {
  name: "rank_portfolio",
  route: "POST /api/portfolio/rank",
  description:
    "Rank all of the user's analyzed repositories by verdict score to find which project deserves attention. Queues an approval card the human must click, because it can start multiple trials.",
  inputSchema: {
    type: "object",
    properties: {
      max_repos: { type: "integer", minimum: 1, maximum: 10, default: 5 },
    },
    additionalProperties: false,
  },
  async execute(input, { signal }) {
    return fetchApi("/api/portfolio/rank", {
      method: "POST",
      body: {
        maxRepos: optionalNumberField(input, "max_repos"),
      },
      signal,
    });
  },
};
