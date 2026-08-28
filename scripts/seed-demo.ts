// Warms the live demo: exchanges the judge access code for its cookie, files
// a trial through the public API, polls until the verdict lands, and prints a
// summary. Plain fetch, no dependencies beyond tsx.
//
//   BASE_URL=https://verdiqt-web.onrender.com JUDGE_ACCESS_CODE=... pnpm seed:demo

const BASE_URL = (process.env.BASE_URL ?? "https://verdiqt-web.onrender.com").replace(
  /\/+$/,
  "",
);
const JUDGE_ACCESS_CODE = process.env.JUDGE_ACCESS_CODE;
const IDEA_TEXT = "AI changelog writer for indie SaaS teams";
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1_000;

// Minimal cookie jar: the judge cookie comes from /api/judge-access and the
// anonymous session cookie from the trial-creation response; both must ride
// on every later request or ownership checks 404.
const cookieJar = new Map<string, string>();

function absorbCookies(response: Response) {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies =
    headers.getSetCookie?.() ??
    (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);

  for (const raw of setCookies) {
    const pair = raw.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) {
      cookieJar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      ...(init.headers ?? {}),
      ...(cookieJar.size > 0 ? { cookie: cookieHeader() } : {}),
    },
  });
  absorbCookies(response);
  return response;
}

function fail(message: string): never {
  console.error(`seed-demo: ${message}`);
  process.exit(1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function exchangeJudgeCode() {
  if (!JUDGE_ACCESS_CODE) {
    console.warn(
      "seed-demo: JUDGE_ACCESS_CODE not set; continuing anonymously (daily trial limit applies)",
    );
    return;
  }

  const form = new URLSearchParams({ code: JUDGE_ACCESS_CODE });
  const response = await request("/api/judge-access", { method: "POST", body: form });

  // Success is a 303 redirect to /trial carrying the judge cookie.
  if (response.status !== 303 || !cookieJar.size) {
    fail(`judge code exchange failed (HTTP ${response.status})`);
  }

  console.log("judge access granted");
}

async function startTrial(): Promise<string> {
  const response = await request("/api/trials", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ideaText: IDEA_TEXT }),
  });

  if (response.status !== 202) {
    fail(`trial creation failed (HTTP ${response.status}): ${await response.text()}`);
  }

  const body = (await response.json()) as { run_id?: string; status?: string };
  if (!body.run_id) {
    fail(`trial creation returned no run_id: ${JSON.stringify(body)}`);
  }

  console.log(`trial filed: ${body.run_id} (${body.status})`);
  return body.run_id;
}

async function pollUntilDone(runId: string) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const response = await request(`/api/trials/${runId}/status`);

    if (!response.ok) {
      fail(`status poll failed (HTTP ${response.status})`);
    }

    const status = (await response.json()) as {
      status: string;
      evidence_count: number;
      error_code?: string | null;
    };

    console.log(`status=${status.status} evidence_count=${status.evidence_count}`);

    if (status.status === "COMPLETE") {
      return;
    }
    if (status.status === "FAILED") {
      fail(`trial failed (error_code=${status.error_code ?? "unknown"})`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  fail(`trial did not complete within ${POLL_TIMEOUT_MS / 60_000} minutes`);
}

async function printVerdict(runId: string) {
  const response = await request(`/api/trials/${runId}/verdict`);

  if (!response.ok) {
    fail(`verdict fetch failed (HTTP ${response.status})`);
  }

  const verdict = (await response.json()) as {
    verdict: string;
    composite_score: number;
    pivot_direction?: string | null;
    dimensions: Array<{ dimension: string; score: number; key_finding?: string | null }>;
    next_step?: unknown;
  };

  console.log(
    JSON.stringify(
      {
        run_id: runId,
        verdict: verdict.verdict,
        composite_score: verdict.composite_score,
        pivot_direction: verdict.pivot_direction ?? null,
        dimensions: verdict.dimensions.map((dimension) => ({
          dimension: dimension.dimension,
          score: dimension.score,
          key_finding: dimension.key_finding ?? null,
        })),
        next_step: verdict.next_step ?? null,
        dashboard_url: `${BASE_URL}/trial/${runId}`,
      },
      null,
      2,
    ),
  );
}

async function main() {
  console.log(`seeding demo against ${BASE_URL}`);
  await exchangeJudgeCode();
  const runId = await startTrial();
  await pollUntilDone(runId);
  await printVerdict(runId);
  console.log("seed-demo: done");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
