// Shared intake helpers for the hero and courtroom filing controls.
export type IntakeMode = "repo" | "idea";

export function getRepoName(value: string) {
  const parts = value.replace(/\/$/, "").split("/");
  return parts.at(-1) || "your-saas";
}

export function isGitHubRepository(value: string) {
  try {
    const normalized = value.startsWith("http") ? value : "https://" + value;
    const url = new URL(normalized);
    const parts = url.pathname.split("/").filter(Boolean);

    return (
      (url.hostname === "github.com" || url.hostname === "www.github.com") &&
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      parts.length === 2
    );
  } catch {
    return false;
  }
}

export function caseNameFrom(mode: IntakeMode, value: string) {
  return mode === "repo"
    ? getRepoName(value)
    : value.split(/\s+/).slice(0, 4).join(" ");
}

export type IntakeSubmission =
  | { outcome: "live"; runId: string; caseName: string }
  | { outcome: "local"; caseName: string }
  | { outcome: "limited"; message: string }
  | { outcome: "error"; message: string };

// Both intakes share this: try the real trial API; while the launch gate is
// closed the page falls back to the honest local preview. 202 is the only
// response that claims a trial exists.
export async function startTrialRequest(
  mode: IntakeMode,
  value: string,
): Promise<IntakeSubmission> {
  const caseName = caseNameFrom(mode, value);

  try {
    const response = await fetch("/api/trials", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(mode === "repo" ? { repoUrl: value } : { ideaText: value }),
    });

    if (response.status === 202) {
      const body = (await response.json()) as { run_id: string };
      return { outcome: "live", runId: body.run_id, caseName };
    }

    if (response.status === 429) {
      return {
        outcome: "limited",
        message: "TODAY'S DOCKET IS FULL. THE COURT REOPENS AT MIDNIGHT UTC.",
      };
    }

    if (response.status === 503) {
      return { outcome: "local", caseName };
    }

    return { outcome: "error", message: "THE COURT COULD NOT ACCEPT THIS CASE." };
  } catch {
    return { outcome: "local", caseName };
  }
}
