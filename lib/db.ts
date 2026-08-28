import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  verdiqtPrisma?: PrismaClient;
  verdiqtDirectPrisma?: PrismaClient;
};

// Render free Postgres caps total connections around 95 shared with pg-boss;
// Prisma's default pool (num_cpus * 2 + 1 PER client, and this file creates
// two clients) can eat most of that on a many-core host. Explicit small pools
// keep the worst case bounded: 6 + 3 + pg-boss's 4 = 13.
function withPoolLimit(url: string | undefined, limit: number) {
  if (!url) return url;
  if (url.includes("connection_limit=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connection_limit=${limit}&pool_timeout=20`;
}

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

export const prisma =
  globalForPrisma.verdiqtPrisma ??
  createPrismaClient(withPoolLimit(process.env.DATABASE_URL, 6));

export const directPrisma =
  globalForPrisma.verdiqtDirectPrisma ??
  createPrismaClient(withPoolLimit(process.env.DIRECT_DATABASE_URL, 3));

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.verdiqtPrisma = prisma;
  globalForPrisma.verdiqtDirectPrisma = directPrisma;
}
