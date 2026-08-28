import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg and pg-boss ship optional native requires that webpack cannot bundle;
  // Prisma's engine likewise belongs outside the bundle. These load via
  // runtime require in the server (instrumentation + route handlers).
  serverExternalPackages: ["pg", "pg-boss", "@prisma/client", "prisma"],
};

export default nextConfig;
