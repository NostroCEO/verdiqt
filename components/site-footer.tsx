import { GitHubMark } from "@/components/icons/brand-icons";
import { SITE } from "@/lib/site";

// Shared footer: one of exactly two status surfaces on the site
// (the other is the dashboard connections rail).
export function SiteFooter() {
  return (
    <footer className="border-t border-border/90 px-5 py-8 text-sm text-muted-foreground sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-[80rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>Verdiqt. Build what deserves to live.</span>
        <span className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.68rem] uppercase tracking-[0.08em]">
          <span>{SITE.license} licensed</span>
          {SITE.repoUrl ? (
            <a
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              href={SITE.repoUrl}
              rel="noreferrer"
              target="_blank"
            >
              <GitHubMark className="size-3.5" />
              Source
            </a>
          ) : null}
          <span className="inline-flex items-center gap-2 normal-case tracking-normal">
            <span className="size-1.5 rounded-full bg-build" />
            System build in progress
          </span>
        </span>
      </div>
    </footer>
  );
}
