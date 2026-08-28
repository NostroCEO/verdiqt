import type { ModelContextTool } from "@/lib/webmcp/registry";
import { fetchApi, optionalStringField } from "@/lib/webmcp/tools/api";

export const startValidationTool: ModelContextTool = {
  name: "start_validation",
  route: "POST /api/trials",
  description:
    "START HERE to validate a SaaS idea. Provide either idea_text describing the idea, or repo_url pointing to a public GitHub repository. Returns a run_id. WORKFLOW: 1) call this, 2) poll get_validation_status every few seconds until status is COMPLETE (about 30s), 3) call get_verdict for the final BUILD/PIVOT/KILL ruling, 4) optionally get_evidence and get_next_step. Report the verdict, score, and next step to the user.",
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
