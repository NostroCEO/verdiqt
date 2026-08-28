// Boot-time wiring under the plain `pnpm start` command, so deployment never
// depends on Blueprint syncs. The NEXT_RUNTIME condition is compile-time
// defined per bundle: the edge bundle dead-code-eliminates the import and
// never sees pg or prisma.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootNode } = await import("./instrumentation-node");
    await bootNode();
  }
}
