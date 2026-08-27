import {
  encodeTrialEventCursor,
  formatTrialEventSse,
  isTerminalEventKind,
  type TrialEventCursor,
} from "@/lib/events";

export type StreamableTrialEvent = {
  id: string;
  actor: string;
  kind: string;
  payload: unknown;
  createdAt: Date;
};

export type TrialStreamOptions = {
  listEvents: (cursor: TrialEventCursor | null) => Promise<StreamableTrialEvent[]>;
  initialCursor: TrialEventCursor | null;
  signal?: AbortSignal;
  pollMs?: number;
  heartbeatMs?: number;
};

// SSE core, dependency-injected for tests. Polls newer rows on an interval,
// emits `id: <cursor>` frames so Last-Event-ID resume never gaps or repeats,
// heartbeats to keep proxies from severing the socket, and closes itself
// after flushing a terminal event (the client sees it and calls .close(),
// never entering a reconnect loop). At-least-once delivery upstream is safe:
// the cursor advances only past flushed rows.
export function createTrialEventStream(options: TrialStreamOptions) {
  const pollMs = options.pollMs ?? 1500;
  const heartbeatMs = options.heartbeatMs ?? 15000;
  const encoder = new TextEncoder();

  let cursor = options.initialCursor;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let polling = false;
  let closed = false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {
          // Already errored or cancelled by the consumer.
        }
      };

      const poll = async () => {
        if (polling || closed) return;
        polling = true;

        try {
          const events = await options.listEvents(cursor);

          for (const event of events) {
            const frameCursor = { createdAt: event.createdAt, id: event.id };
            controller.enqueue(
              encoder.encode(
                formatTrialEventSse({
                  id: encodeTrialEventCursor(frameCursor),
                  event: {
                    id: event.id,
                    actor: event.actor,
                    kind: event.kind,
                    payload: event.payload,
                    created_at: event.createdAt,
                  },
                }),
              ),
            );
            cursor = frameCursor;

            if (isTerminalEventKind(event.kind)) {
              cleanup();
              return;
            }
          }
        } catch {
          // Transient read failure: keep the socket open, next tick retries.
        } finally {
          polling = false;
        }
      };

      options.signal?.addEventListener("abort", cleanup, { once: true });
      pollTimer = setInterval(() => void poll(), pollMs);
      heartbeatTimer = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, heartbeatMs);
      void poll();
    },
    cancel() {
      closed = true;
      if (pollTimer) clearInterval(pollTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });
}
