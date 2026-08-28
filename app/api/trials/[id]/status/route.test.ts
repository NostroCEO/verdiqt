import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  resolveCurrentAnonymousPrincipal: vi.fn(),
  prisma: {
    trial: { findFirst: vi.fn() },
    trialEvent: { findMany: vi.fn() },
  },
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@/lib/access", () => ({
  resolveCurrentAnonymousPrincipal: mocks.resolveCurrentAnonymousPrincipal,
}));

vi.mock("@/lib/db", () => ({
  prisma: mocks.prisma,
}));

import { GET } from "@/app/api/trials/[id]/status/route";
import { microReset } from "@/lib/micro-cache";

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/trials/[id]/status", () => {
  afterEach(() => {
    mocks.cookies.mockReset();
    mocks.resolveCurrentAnonymousPrincipal.mockReset();
    mocks.prisma.trial.findFirst.mockReset();
    mocks.prisma.trialEvent.findMany.mockReset();
    microReset();
  });

  it("makes missing anonymous access indistinguishable from a missing trial", async () => {
    const cookieStore = { get: vi.fn(), set: vi.fn() };
    mocks.cookies.mockResolvedValue(cookieStore);
    mocks.resolveCurrentAnonymousPrincipal.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/trials/trial_123/status"),
      routeContext("trial_123"),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
    expect(mocks.prisma.trial.findFirst).not.toHaveBeenCalled();
  });

  it("reads status only for the current anonymous owner", async () => {
    const createdAt = new Date("2026-08-27T12:00:00.000Z");
    const cookieStore = { get: vi.fn(), set: vi.fn() };
    mocks.cookies.mockResolvedValue(cookieStore);
    mocks.resolveCurrentAnonymousPrincipal.mockResolvedValue({
      kind: "anonymous",
      anonymousSessionId: "anon_123",
    });
    mocks.prisma.trial.findFirst.mockResolvedValue({
      id: "trial_123",
      status: "SCORING",
      pipelineRevision: 1,
      completedRevision: 0,
      compositeScore: null,
      verdict: null,
      createdAt,
      completedAt: null,
      _count: { evidence: 7 },
      approvals: [],
      events: [
        {
          id: "event_1",
          actor: "SYSTEM",
          kind: "stage_started",
          payload: { stage: "SCORING" },
          createdAt,
        },
      ],
    });
    mocks.prisma.trialEvent.findMany.mockResolvedValue([
      {
        id: "event_human",
        kind: "human_pinned",
        payload: { evidenceId: "ev_1" },
        createdAt,
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/trials/trial_123/status"),
      routeContext("trial_123"),
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.trial.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "trial_123",
          anonymousSessionId: "anon_123",
        },
      }),
    );
    expect(await response.json()).toEqual(
      expect.objectContaining({
        run_id: "trial_123",
        status: "SCORING",
        stages_done: ["NORMALIZING", "GATHERING", "CLASSIFYING"],
        evidence_count: 7,
        latest_events: [
          {
            id: "event_1",
            actor: "SYSTEM",
            kind: "stage_started",
            payload: { stage: "SCORING" },
            created_at: "2026-08-27T12:00:00.000Z",
          },
        ],
        human_actions: [
          {
            id: "event_human",
            kind: "human_pinned",
            payload: {},
            created_at: "2026-08-27T12:00:00.000Z",
          },
        ],
      }),
    );
  });

  it("maps pending approvals to the agent contract shape", async () => {
    const createdAt = new Date("2026-08-27T12:00:00.000Z");
    const cookieStore = { get: vi.fn(), set: vi.fn() };
    mocks.cookies.mockResolvedValue(cookieStore);
    mocks.resolveCurrentAnonymousPrincipal.mockResolvedValue({
      kind: "anonymous",
      anonymousSessionId: "anon_123",
    });
    mocks.prisma.trial.findFirst.mockResolvedValue({
      id: "trial_123",
      status: "GATHERING",
      pipelineRevision: 1,
      completedRevision: 0,
      compositeScore: null,
      verdict: null,
      createdAt,
      completedAt: null,
      _count: { evidence: 2 },
      approvals: [
        {
          id: "approval_1",
          kind: "DEEP_SCAN",
          state: "PENDING_HUMAN_APPROVAL",
          requestedRevision: 1,
          payload: { dimension: "MONETIZATION", secretish: "never-shown" },
          createdAt,
        },
      ],
      events: [],
    });
    mocks.prisma.trialEvent.findMany.mockResolvedValue([]);

    const response = await GET(
      new Request("http://localhost/api/trials/trial_123/status"),
      routeContext("trial_123"),
    );

    const body = await response.json();
    expect(body.pending_approvals).toEqual([
      {
        approval_id: "approval_1",
        kind: "DEEP_SCAN",
        state: "PENDING_HUMAN_APPROVAL",
        dimension: "MONETIZATION",
      },
    ]);
    expect(JSON.stringify(body)).not.toContain("never-shown");
  });
});
