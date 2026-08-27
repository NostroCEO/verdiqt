import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  verdiqtPrisma?: PrismaClient;
  verdiqtDirectPrisma?: PrismaClient;
};

function createPrismaClient(databaseUrl?: string) {
  return new PrismaClient(
    databaseUrl
      ? {
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        }
      : undefined,
  );
}

export const prisma = globalForPrisma.verdiqtPrisma ?? createPrismaClient();

export const directPrisma =
  globalForPrisma.verdiqtDirectPrisma ??
  createPrismaClient(process.env.DIRECT_DATABASE_URL);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.verdiqtPrisma = prisma;
  globalForPrisma.verdiqtDirectPrisma = directPrisma;
}
