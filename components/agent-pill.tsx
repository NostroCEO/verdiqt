"use client";

import { useSyncExternalStore } from "react";

import {
  getAgentChannelSnapshot,
  getAgentChannelServerSnapshot,
  subscribeAgentChannel,
} from "@/lib/webmcp/bus";
import { cn } from "@/lib/utils";

// Header presence indicator: proof the page is agent-native, visible on any
// route. It renders NOTHING unless an agent client is actually present in this
// browser (ChatGPT's in-app browser, or Chrome 149+ with the WebMCP flag), so
// a normal visit leaves the header unchanged. When a client is connected it
// shows the live registered tool count — the same "N tools" the agent sees.
export function AgentPill() {
  const snapshot = useSyncExternalStore(
    subscribeAgentChannel,
    getAgentChannelSnapshot,
    getAgentChannelServerSnapshot,
  );

  // No agent client detected (or detection still settling / failed): stay out
  // of the way entirely.
  if (
    snapshot.state === "checking" ||
    snapshot.state === "unsupported" ||
    snapshot.state === "failed"
  ) {
    return null;
  }

  const ready =
    snapshot.state === "registered" || snapshot.state === "partial";
  const label =
    snapshot.state === "registering"
      ? "Connecting…"
      : snapshot.state === "partial"
        ? `Agent · ${snapshot.registeredCount}/${snapshot.totalCount} tools`
        : `Agent · ${snapshot.totalCount} tools`;

  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-primary"
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          ready
            ? "bg-build shadow-[0_0_10px_var(--build)]"
            : "bg-primary/60",
        )}
      />
      {label}
    </span>
  );
}
