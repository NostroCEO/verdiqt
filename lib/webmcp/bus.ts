// Client-side agent-channel store and tool-activity bus.
// This is in-page state about OUR registrations and OUR tool invocations only.
// It never carries SSE worker events (ARCHITECTURE.md: agents poll
// get_validation_status; the SSE stream belongs to the human dashboard).

export type AgentChannelState =
  | "checking"
  | "unsupported"
  | "registering"
  | "registered"
  | "partial"
  | "failed";

export type ToolActivityEntry = {
  tool: string;
  status: "ok" | "error";
  at: number;
};

export type AgentChannelSnapshot = {
  state: AgentChannelState;
  registeredCount: number;
  totalCount: number;
  failedTools: readonly string[];
  activity: readonly ToolActivityEntry[];
};

const MAX_ACTIVITY_ENTRIES = 20;

const initialSnapshot: AgentChannelSnapshot = {
  state: "checking",
  registeredCount: 0,
  totalCount: 0,
  failedTools: [],
  activity: [],
};

let snapshot: AgentChannelSnapshot = initialSnapshot;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAgentChannel(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAgentChannelSnapshot(): AgentChannelSnapshot {
  return snapshot;
}

// Must be referentially stable: useSyncExternalStore compares by identity
// during hydration, and the server always renders the "checking" state.
export function getAgentChannelServerSnapshot(): AgentChannelSnapshot {
  return initialSnapshot;
}

export function setAgentChannel(
  update: Partial<Omit<AgentChannelSnapshot, "activity">>,
) {
  snapshot = { ...snapshot, ...update };
  notify();
}

export function recordToolActivity(entry: ToolActivityEntry) {
  snapshot = {
    ...snapshot,
    activity: [entry, ...snapshot.activity].slice(0, MAX_ACTIVITY_ENTRIES),
  };
  notify();
}

export function resetAgentChannel() {
  snapshot = initialSnapshot;
  notify();
}
