"use client";

import { useEffect, useState } from "react";

export type LiveTrialState = {
  status:
    | "QUEUED"
    | "NORMALIZING"
    | "GATHERING"
    | "CLASSIFYING"
    | "SCORING"
    | "COMPLETE"
    | "FAILED"
    | null;
  evidenceCount: number;
  compositeScore: number | null;
  verdict: string | null;
  lastEventKind: string | null;
  connected: boolean;
  workerSeen: boolean;
  error: string | null;
};

const initialState: LiveTrialState = {
  status: null,
  evidenceCount: 0,
  compositeScore: null,
  verdict: null,
  lastEventKind: null,
  connected: false,
  workerSeen: false,
  error: null,
};

// Live trial state for the dashboard: one authoritative status fetch, then
// the SSE stream. Every event triggers a status refetch (persisted state is
// the single source of truth; events are only the wake-up signal), and the
// browser's automatic Last-Event-ID resume covers transient drops. The
// server closes the stream after the terminal event; we mirror that close.
export function useTrialLive(runId: string | null): LiveTrialState {
  const [state, setState] = useState<LiveTrialState>(initialState);

  useEffect(() => {
    if (!runId) {
      setState(initialState);
      return;
    }

    let cancelled = false;
    let source: EventSource | null = null;

    async function refetchStatus() {
      try {
        const response = await fetch(`/api/trials/${encodeURIComponent(runId!)}/status`, {
          cache: "no-store",
          credentials: "include",
        });
        if (cancelled) return false;

        if (!response.ok) {
          setState((current) => ({ ...current, error: `status_${response.status}` }));
          return false;
        }

        const body = (await response.json()) as {
          status: LiveTrialState["status"];
          evidence_count: number;
          composite_score: number | null;
          verdict: string | null;
        };

        setState((current) => ({
          ...current,
          status: body.status,
          evidenceCount: body.evidence_count,
          compositeScore: body.composite_score,
          verdict: body.verdict,
          connected: true,
          error: null,
        }));

        return body.status === "COMPLETE" || body.status === "FAILED";
      } catch {
        if (!cancelled) {
          setState((current) => ({ ...current, error: "status_unreachable" }));
        }
        return false;
      }
    }

    void refetchStatus().then((terminal) => {
      if (cancelled || terminal) return;

      source = new EventSource(`/api/trials/${encodeURIComponent(runId!)}/stream`);

      source.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as { kind?: string };
          const kind = event.kind ?? null;

          setState((current) => ({
            ...current,
            lastEventKind: kind,
            workerSeen: current.workerSeen || kind === "stage_started",
          }));

          void refetchStatus().then((terminal2) => {
            if (terminal2) source?.close();
          });
        } catch {
          // Ignore unparseable frames; the next status refetch corrects us.
        }
      };

      source.onerror = () => {
        // EventSource reconnects on its own with Last-Event-ID; only note
        // the hiccup so the UI can stay honest if it persists.
        setState((current) =>
          current.status === "COMPLETE" || current.status === "FAILED"
            ? current
            : { ...current, error: "stream_reconnecting" },
        );
      };
    });

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [runId]);

  return state;
}
