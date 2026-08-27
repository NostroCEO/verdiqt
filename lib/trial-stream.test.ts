import { describe, expect, it, vi } from "vitest";

import { decodeTrialEventCursor } from "@/lib/events";
import { createTrialEventStream, type StreamableTrialEvent } from "@/lib/trial-stream";

function event(
  id: string,
  kind: string,
  at: string,
  payload: unknown = {},
): StreamableTrialEvent {
  return { id, actor: "SYSTEM", kind, payload, createdAt: new Date(at) };
}

describe("createTrialEventStream", () => {
  it("streams frames with resumable cursors and closes after the terminal event", async () => {
    const batches: StreamableTrialEvent[][] = [
      [event("e1", "stage_started", "2026-08-27T12:00:00.000Z")],
      [event("e2", "trial_completed", "2026-08-27T12:00:01.000Z", { revision: 1 })],
    ];
    const listEvents = vi.fn(async () => batches.shift() ?? []);

    const stream = createTrialEventStream({
      listEvents,
      initialCursor: null,
      pollMs: 5,
      heartbeatMs: 60_000,
    });

    const body = await new Response(stream).text();
    const frames = body.split("\n\n").filter(Boolean);

    expect(frames).toHaveLength(2);
    expect(frames[0]).toContain("event: trial-event");
    expect(frames[0]).toContain('"kind":"stage_started"');
    expect(frames[1]).toContain('"kind":"trial_completed"');

    const idLine = frames[1].split("\n").find((line) => line.startsWith("id: "));
    const cursor = decodeTrialEventCursor(idLine!.slice(4));
    expect(cursor).toEqual({
      createdAt: new Date("2026-08-27T12:00:01.000Z"),
      id: "e2",
    });
  });

  it("resumes from the supplied cursor and advances it past flushed rows", async () => {
    const initialCursor = {
      createdAt: new Date("2026-08-27T12:00:00.000Z"),
      id: "e1",
    };
    const cursors: Array<unknown> = [];
    const listEvents = vi.fn(async (cursor: unknown) => {
      cursors.push(cursor);
      if (cursors.length === 1) {
        return [event("e2", "stage_started", "2026-08-27T12:00:01.000Z")];
      }
      return [event("e3", "trial_failed", "2026-08-27T12:00:02.000Z")];
    });

    await new Response(
      createTrialEventStream({
        listEvents,
        initialCursor,
        pollMs: 5,
        heartbeatMs: 60_000,
      }),
    ).text();

    expect(cursors[0]).toEqual(initialCursor);
    expect(cursors[1]).toEqual({
      createdAt: new Date("2026-08-27T12:00:01.000Z"),
      id: "e2",
    });
  });

  it("closes on abort without emitting further frames", async () => {
    const controller = new AbortController();
    const listEvents = vi.fn(async () => []);

    const stream = createTrialEventStream({
      listEvents,
      initialCursor: null,
      pollMs: 5,
      heartbeatMs: 60_000,
      signal: controller.signal,
    });

    controller.abort();
    const body = await new Response(stream).text();

    expect(body).toBe("");
  });

  it("keeps the socket warm with heartbeat comments", async () => {
    const listEvents = vi
      .fn(async () => [] as StreamableTrialEvent[])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValue([event("e1", "trial_completed", "2026-08-27T12:00:00.000Z")]);

    const body = await new Response(
      createTrialEventStream({
        listEvents,
        initialCursor: null,
        pollMs: 20,
        heartbeatMs: 10,
      }),
    ).text();

    expect(body).toContain(": heartbeat\n\n");
    expect(body).toContain('"kind":"trial_completed"');
  });
});
