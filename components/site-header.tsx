import Link from "next/link";
import { Gavel } from "lucide-react";

import { Badge } from "@/components/ui/badge";

// Shared sticky header. Links are absolute so they work from any route.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/90 bg-background">
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-[80rem] items-center justify-between border-x border-border/90 px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Verdiqt home"
        >
          <span className="grid size-9 place-items-center border border-primary/50 bg-primary text-primary-foreground">
            <Gavel className="size-4.5 transition-transform group-hover:-rotate-6" />
          </span>
          <span className="text-lg font-semibold tracking-[-0.03em]">Verdiqt</span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-8 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground md:flex"
        >
          <Link className="transition-colors hover:text-foreground" href="/#procedural-record">
            The record
          </Link>
          <Link className="transition-colors hover:text-foreground" href="/trial">
            The courtroom
          </Link>
          <Link className="transition-colors hover:text-foreground" href="/trial#agent-access">
            Agent access
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:inline-flex">
            <span className="size-1.5 rounded-full bg-build shadow-[0_0_12px_var(--build)]" />
            Build in progress
          </span>
          <Badge variant="outline" className="border-border/90 bg-background font-mono text-[0.62rem] tracking-[0.08em]">
            Human-led
          </Badge>
        </div>
      </div>
    </header>
  );
}
