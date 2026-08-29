import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  verdiqtPrisma?: PrismaClient;
};

// Render free Postgres caps total connections around 95 shared with pg-boss;
// Prisma's default pool (num_cpus * 2 + 1) can eat most of that on a
// many-core host. Explicit small pool keeps the worst case bounded:
// 6 + pg-boss's 4 = 10.
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

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.verdiqtPrisma = prisma;
}
