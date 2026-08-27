import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

const defaultWeights = {
  PROBLEM_SEVERITY: 20,
  DEMAND_SIGNALS: 20,
  COMPETITION: 15,
  MONETIZATION: 20,
  DISTRIBUTION: 15,
  BUILD_COST: 10,
};

describe.skipIf(!process.env.DATABASE_URL)("prisma client", () => {
  it("creates and reads a trial with default weights", async () => {
    const session = await prisma.anonymousSession.create({
      data: {
        capabilityHash: "test-capability-" + crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const trial = await prisma.trial.create({
      data: {
        anonymousSessionId: session.id,
        ideaText: "A changelog writer for indie SaaS teams",
        weights: defaultWeights,
      },
    });

    const found = await prisma.trial.findUniqueOrThrow({
      where: { id: trial.id },
      select: {
        id: true,
        ideaText: true,
        weights: true,
        status: true,
      },
    });

    expect(found).toMatchObject({
      id: trial.id,
      ideaText: "A changelog writer for indie SaaS teams",
      status: "QUEUED",
      weights: defaultWeights,
    });

    await prisma.trial.delete({ where: { id: trial.id } });
    await prisma.anonymousSession.delete({ where: { id: session.id } });
  });
});
