import type { Actor, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type TrialEventCursor = {
  createdAt: Date;
  id: string;
};

export function encodeTrialEventCursor(cursor: TrialEventCursor) {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
    }),
  ).toString("base64url");
}

export function decodeTrialEventCursor(value: string): TrialEventCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string"
    ) {
      return null;
    }

    const createdAt = new Date(parsed.createdAt);

    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return { createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

export async function emitEvent(input: {
  trialId: string;
  pipelineRunId?: string;
  dedupeKey?: string;
  actor: Actor;
  kind: string;
  payload: Prisma.InputJsonValue;
}) {
  const data = {
    trialId: input.trialId,
    pipelineRunId: input.pipelineRunId,
    dedupeKey: input.dedupeKey,
    actor: input.actor,
    kind: input.kind,
    payload: input.payload,
  };

  // Queue delivery is at-least-once; a retried stage re-emitting the same
  // dedupeKey must be an idempotent no-op that returns the existing row.
  if (input.dedupeKey) {
    return prisma.trialEvent.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: data,
      update: {},
    });
  }

  return prisma.trialEvent.create({ data });
}

export function formatTrialEventSse(input: {
  id: string;
  event: unknown;
}) {
  return [
    `id: ${input.id}`,
    "event: trial-event",
    `data: ${JSON.stringify(input.event ?? null)}`,
    "",
    "",
  ].join("\n");
}
