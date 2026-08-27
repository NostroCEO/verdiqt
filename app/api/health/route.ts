export function GET() {
  return Response.json({
    ok: true,
    sha: process.env.RENDER_GIT_COMMIT ?? "dev",
  });
}
