import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  trialEvent: {
    create: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    trialEvent: mocks.trialEvent,
  },
}));

import {
  decodeTrialEventCursor,
  emitEvent,
  encodeTrialEventCursor,
  formatTrialEventSse,
} from "@/lib/events";

describe("trial event helpers", () => {
  it("round-trips stable event cursors", () => {
    const cursor = {
      createdAt: new Date("2026-08-27T12:00:00.000Z"),
      id: "event_123",
    };

    expect(decodeTrialEventCursor(encodeTrialEventCursor(cursor))).toEqual(
      cursor,
    );
  });

  it("rejects malformed event cursors", () => {
    expect(decodeTrialEventCursor("not-base64url-json")).toBeNull();
    expect(decodeTrialEventCursor("")).toBeNull();
    expect(
      decodeTrialEventCursor(Buffer.from('"just a string"').toString("base64url")),
    ).toBeNull();
    expect(
      decodeTrialEventCursor(
        Buffer.from(JSON.stringify({ createdAt: "not-a-date", id: "e1" })).toString(
          "base64url",
        ),
      ),
    ).toBeNull();
    expect(
      decodeTrialEventCursor(
        Buffer.from(JSON.stringify({ createdAt: "2026-08-27T12:00:00.000Z" })).toString(
          "base64url",
        ),
      ),
    ).toBeNull();
  });

  it("formats trial events as SSE frames", () => {
    expect(
      formatTrialEventSse({
        id: "cursor_123",
        event: { kind: "stage_started", payload: { stage: "NORMALIZING" } },
      }),
    ).toBe(
      'id: cursor_123\nevent: trial-event\ndata: {"kind":"stage_started","payload":{"stage":"NORMALIZING"}}\n\n',
    );
  });

  it("never emits an unparseable data frame for a missing event", () => {
    expect(formatTrialEventSse({ id: "c1", event: undefined })).toBe(
      "id: c1\nevent: trial-event\ndata: null\n\n",
    );
  });
});

describe("emitEvent", () => {
  afterEach(() => {
    mocks.trialEvent.create.mockReset();
    mocks.trialEvent.upsert.mockReset();
  });

  it("upserts by dedupeKey so a worker retry is an idempotent no-op", async () => {
    mocks.trialEvent.upsert.mockResolvedValue({ id: "event_1" });

    const result = await emitEvent({
      trialId: "trial_1",
      pipelineRunId: "run_1",
      dedupeKey: "run_1:stage_started:NORMALIZING",
      actor: "SYSTEM",
      kind: "stage_started",
      payload: { stage: "NORMALIZING" },
    });

    expect(result).toEqual({ id: "event_1" });
    expect(mocks.trialEvent.upsert).toHaveBeenCalledWith({
      where: { dedupeKey: "run_1:stage_started:NORMALIZING" },
      create: expect.objectContaining({
        trialId: "trial_1",
        pipelineRunId: "run_1",
        actor: "SYSTEM",
        kind: "stage_started",
        payload: { stage: "NORMALIZING" },
      }),
      update: {},
    });
    expect(mocks.trialEvent.create).not.toHaveBeenCalled();
  });

  it("plain-creates keyless events", async () => {
    mocks.trialEvent.create.mockResolvedValue({ id: "event_2" });

    await emitEvent({
      trialId: "trial_1",
      actor: "HUMAN",
      kind: "evidence_pinned",
      payload: { dimension: "MONETIZATION" },
    });

    expect(mocks.trialEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        trialId: "trial_1",
        actor: "HUMAN",
        kind: "evidence_pinned",
      }),
    });
    expect(mocks.trialEvent.upsert).not.toHaveBeenCalled();
  });
});
