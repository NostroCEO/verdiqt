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
