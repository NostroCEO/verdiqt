"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";

import {
  getAgentChannelSnapshot,
  getAgentChannelServerSnapshot,
  subscribeAgentChannel,
  type AgentChannelSnapshot,
} from "@/lib/webmcp/bus";
import { webmcpTools } from "@/lib/webmcp/registry";
import { cn } from "@/lib/utils";

// [04] AGENT ACCESS. Landing chrome for the real tool registry: the docket
// leads as the object, detection state is one quiet status row (public copy
// stays protocol-name-free per docs/STATE.md), and the feed shows in-page
// tool invocations only: name, time, status. Never payloads, never SSE.

function statusLine(snapshot: AgentChannelSnapshot) {
  switch (snapshot.state) {
    case "checking":
      return "CHECKING THIS BROWSER FOR AN AGENT CLIENT";
    case "registering":
      return "REGISTERING TOOLS WITH THIS BROWSER";
    case "registered":
      return `${snapshot.totalCount} TOOLS REGISTERED WITH THIS BROWSER`;
    case "partial":
      return `${snapshot.registeredCount} OF ${snapshot.totalCount} TOOLS REGISTERED`;
    case "failed":
      return "TOOL REGISTRATION FAILED IN THIS BROWSER";
    case "unsupported":
      return "NO AGENT CLIENT DETECTED IN THIS BROWSER";
  }
}

function statusDetail(state: AgentChannelSnapshot["state"]) {
  if (state === "unsupported") {
    return "The registry below is what a connected agent can call.";
  }
  if (state === "failed") {
    return "The catalog below stays readable; registration will retry on the next visit.";
  }
  return null;
}

function formatTime(at: number) {
  return new Date(at).toLocaleTimeString("en-GB", { hour12: false });
}

export function AgentSandbox() {
  const snapshot = useSyncExternalStore(
    subscribeAgentChannel,
    getAgentChannelSnapshot,
    getAgentChannelServerSnapshot,
  );
  const [openTool, setOpenTool] = useState<string | null>(null);

  const live = snapshot.state === "registered" || snapshot.state === "partial";

  return (
    <section
      id="agent-access"
      aria-labelledby="agent-access-title"
      className="mx-auto w-full max-w-[80rem] border-x border-b border-border/90"
    >
      <div className="grid gap-5 border-b border-border/90 px-6 py-10 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span className="mr-2 text-primary">[02]</span>
            Agent access
          </p>
          <h2
            id="agent-access-title"
            className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]"
          >
            The same case, open to your agent.
          </h2>
          <p className="mt-3 max-w-[34rem] text-sm leading-6 text-foreground/75">
            Every tool below is registered by this page itself. An agent reads
            the docket, starts trials, gathers verdicts, and asks you before
            anything expensive runs.
          </p>
        </div>
        <div
          role="status"
          aria-live="polite"
          className="lg:justify-self-end lg:text-right"
        >
          <p className="inline-flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-foreground">
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5",
                live ? "bg-build" : "bg-muted-foreground",
              )}
            />
            {statusLine(snapshot)}
          </p>
          {statusDetail(snapshot.state) ? (
            <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
              {statusDetail(snapshot.state)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr]">
        <ol className="border-border/90 lg:border-r">
          {webmcpTools.map((tool, index) => {
            const open = openTool === tool.name;
            const failed = snapshot.failedTools.includes(tool.name);
            const readOnly = tool.annotations?.readOnlyHint === true;

            return (
              <li key={tool.name} className="border-b border-border/90 last:border-b-0">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`tool-panel-${tool.name}`}
                  onClick={() => setOpenTool(open ? null : tool.name)}
                  className="flex min-h-11 w-full items-center gap-4 px-6 py-3 text-left outline-none transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-10"
                >
                  <span className="w-6 shrink-0 font-mono text-[0.68rem] text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm text-foreground">
                      {tool.name}
                    </span>
                  </span>
                  {failed ? (
                    <span className="shrink-0 border border-kill/60 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-kill">
                      Err
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "shrink-0 border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em]",
                      readOnly
                        ? "border-border text-muted-foreground"
                        : "border-primary/50 text-primary",
                    )}
                  >
                    {readOnly ? "Read" : "Act"}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                      open && "rotate-180",
                    )}
                  />
                </button>
                {open ? (
                  <div
                    id={`tool-panel-${tool.name}`}
                    className="border-t border-border/60 bg-surface px-6 py-4 sm:px-10"
                  >
                    <p className="max-w-[38rem] text-sm leading-6 text-foreground/80">
                      {tool.description}
                    </p>
                    <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
                      Route contract
                      <span className="ml-2 normal-case text-foreground/80">{tool.route}</span>
                    </p>
                    <pre className="mt-3 max-h-56 overflow-auto border border-border/60 bg-background p-3 font-mono text-[0.68rem] leading-relaxed text-foreground/75">
                      {JSON.stringify(tool.inputSchema, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        <aside aria-label="Session tool activity" className="border-t border-border/90 lg:border-t-0">
          <p className="border-b border-border/90 px-6 py-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground sm:px-10 lg:px-6">
            Session activity
          </p>
          {snapshot.activity.length === 0 ? (
            <p className="px-6 py-6 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground sm:px-10 lg:px-6">
              No tool activity yet in this session.
            </p>
          ) : (
            <ol className="divide-y divide-border/60">
              {snapshot.activity.map((entry) => (
                <li
                  key={`${entry.tool}-${entry.at}`}
                  className="flex min-h-10 items-center gap-3 px-6 py-2 font-mono text-[0.68rem] sm:px-10 lg:px-6"
                >
                  <span className="text-muted-foreground">{formatTime(entry.at)}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{entry.tool}</span>
                  {entry.status === "error" ? (
                    <span className="border border-kill/60 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-[0.1em] text-kill">
                      Err
                    </span>
                  ) : (
                    <span className="text-muted-foreground">ok</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </section>
  );
}
