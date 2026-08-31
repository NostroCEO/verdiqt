import OpenAI from "openai";
import type { ZodType } from "zod";

// Zero-budget inference (docs/STATE.md, founder D20): the OpenAI SDK pointed
// at a free-tier OpenAI-compatible endpoint (Groq). Hard caps keep every
// trial inside the free quota; tests always mock this module.
export const INFERENCE_DEFAULTS = {
  baseURL: "https://api.groq.com/openai/v1",
  model: "openai/gpt-oss-120b",
  timeoutMs: 60_000,
  maxRetries: 2,
} as const;

export const TRIAL_CAPS = {
  maxLlmCallsPerTrial: 20,
  maxEvidenceItemsPerTrial: 48,
} as const;

const globalForLlm = globalThis as typeof globalThis & {
  verdiqtLlmClients?: Map<string, OpenAI>;
};

// Gemini's OpenAI-compat layer wraps error bodies in an ARRAY
// ([{"error": ...}]), which the OpenAI SDK cannot parse — every provider
// error surfaced as the useless "404 status code (no body)" and masked the
// real message (observed live 2026-08-31: a model-gating message hid behind
// it for hours). Unwrap at the fetch layer so errorCode carries the truth.
async function unwrappingFetch(
  url: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const response = await fetch(url, init);
  if (response.ok) return response;

  const text = await response.text();
  let body = text;
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object") {
        body = JSON.stringify(parsed[0]);
      }
    } catch {
      // Not JSON after all; pass the original body through.
    }
  }

  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export type InferenceProvider = {
  baseURL: string;
  model: string;
  apiKey: string;
};

// Failover chain (founder decision 2026-08-31): free-tier quotas are
// per-model pools that drain mid-day, so one provider is never enough for
// the judging window. The primary is INFERENCE_*; fallbacks come from
// INFERENCE_FALLBACK_* and INFERENCE_FALLBACK2_* — each needs only _MODEL,
// and inherits the PRIMARY's base URL and key when its own are unset (so a
// same-key different-pool fallback like gemini-3.1-flash-lite is one env
// var). A provider is tried until its quota is exhausted for the day, then
// the chain advances.
function configuredProviders(): InferenceProvider[] {
  const apiKey = process.env.INFERENCE_API_KEY;
  if (!apiKey) {
    throw new Error("INFERENCE_API_KEY is required for inference");
  }

  const primary: InferenceProvider = {
    baseURL: process.env.INFERENCE_BASE_URL ?? INFERENCE_DEFAULTS.baseURL,
    model: inferenceModel(),
    apiKey,
  };

  const providers = [primary];
  for (const prefix of ["INFERENCE_FALLBACK", "INFERENCE_FALLBACK2"]) {
    const model = process.env[`${prefix}_MODEL`];
    if (!model) continue;
    providers.push({
      baseURL: process.env[`${prefix}_BASE_URL`] ?? primary.baseURL,
      model,
      apiKey: process.env[`${prefix}_API_KEY`] ?? primary.apiKey,
    });
  }

  return providers;
}

function clientFor(provider: InferenceProvider): OpenAI {
  const cache = (globalForLlm.verdiqtLlmClients ??= new Map<string, OpenAI>());
  const key = `${provider.baseURL}|${provider.apiKey}`;
  let client = cache.get(key);
  if (!client) {
    client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      timeout: INFERENCE_DEFAULTS.timeoutMs,
      maxRetries: INFERENCE_DEFAULTS.maxRetries,
      fetch: unwrappingFetch,
    });
    cache.set(key, client);
  }
  return client;
}

export function inferenceModel() {
  return process.env.INFERENCE_MODEL ?? INFERENCE_DEFAULTS.model;
}

// OPT-IN ONLY (INFERENCE_PARALLEL_SCORING=true): free-tier RPM ceilings
// (the founder's live Gemini dashboard shows 5 requests/min) make six
// concurrent scoring calls a 429 storm that can exhaust the retry budget
// and fail the trial. The serial loop paces itself under any RPM via the
// wait-and-retry logic. Enable only on a paid or high-RPM tier.
export function supportsParallelScoring() {
  return process.env.INFERENCE_PARALLEL_SCORING === "true";
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("llm_response_not_json");
  }

  return JSON.parse(trimmed.slice(start, end + 1));
}

const RATE_LIMIT_WAITS_MS = [10_000, 25_000];
const RETRY_AFTER_MIN_MS = 2_000;
const RETRY_AFTER_MAX_MS = 20_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Providers say how long the per-minute window needs in the retry-after
// header (Groq: typically 2-8s). Honoring it instead of the flat 10s/25s
// ladder cuts most waits by more than half — the ladder stays as the
// fallback when the header is absent or unparseable. Clamped so a weird
// header can neither spin-loop nor stall the serial worker.
export function retryDelayMs(error: unknown, fallbackMs: number): number {
  const headers =
    typeof error === "object" && error !== null && "headers" in error
      ? (error as { headers?: { get?: (name: string) => string | null } }).headers
      : undefined;
  const retryAfter = Number(headers?.get?.("retry-after"));
  if (!Number.isFinite(retryAfter) || retryAfter <= 0) return fallbackMs;
  return Math.min(RETRY_AFTER_MAX_MS, Math.max(RETRY_AFTER_MIN_MS, retryAfter * 1_000));
}

function isRateLimit(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: number }).status === 429
  );
}

// A per-MINUTE limit clears within our short waits; a per-DAY limit will
// not clear for hours, and waiting on it wedged the serial worker behind
// half-hour zombie trials (observed live 2026-08-28). Daily exhaustion must
// fail fast with a typed error the UI can explain honestly.
function isDailyExhaustion(error: unknown): boolean {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message).toLowerCase()
      : "";
  // Groq spells it "per day"/"TPD"/"RPD"; Gemini's OpenAI-compat layer embeds
  // quota ids like "...PerDayPerProjectPerModel" / "per_day" with no space.
  if (/per day|per_day|perday|tpd|rpd|daily/.test(message)) return true;

  const headers =
    typeof error === "object" && error !== null && "headers" in error
      ? (error as { headers?: { get?: (name: string) => string | null } }).headers
      : undefined;
  const retryAfter = Number(headers?.get?.("retry-after") ?? 0);
  return retryAfter > 120;
}

// One structured call: JSON-mode request, zod validation, exactly one repair
// retry on schema violation (the plan's bound), then a typed failure.
// Free-tier per-minute rate limits (Groq 429s) are waited out instead of
// failing the trial: the worker is serial, so blocking here is safe and the
// window clears within a minute.
export async function structuredCall<T>(input: {
  system: string;
  user: string;
  schema: ZodType<T>;
  schemaName: string;
}): Promise<T> {
  const providers = configuredProviders();

  // Thinking models (Gemini 3.x flash) deliberate for ~45s per call at their
  // default effort — 6+ minutes per trial (measured live 2026-08-31: 47s vs
  // 7.7s at low, equally sharp output). Fast is the DEFAULT for gemini-3*
  // so a missing env var can never recreate the 5-minute trial; the env
  // overrides it ("none" sends nothing). Non-Gemini providers get nothing
  // unless explicitly configured.
  const effortFor = (model: string) => {
    const configured = process.env.INFERENCE_REASONING_EFFORT;
    return configured === "none"
      ? undefined
      : (configured ?? (model.startsWith("gemini-3") ? "low" : undefined));
  };

  const rawRequest = (provider: InferenceProvider, repairNote?: string) => {
    const reasoningEffort = effortFor(provider.model);
    return clientFor(provider).chat.completions.create({
      model: provider.model,
      ...(reasoningEffort
        ? { reasoning_effort: reasoningEffort as "low" | "medium" | "high" }
        : {}),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.system },
        {
          role: "user",
          content: repairNote
            ? `${input.user}\n\nYour previous answer failed validation: ${repairNote}. Return ONLY corrected JSON for the ${input.schemaName} schema.`
            : input.user,
        },
      ],
    });
  };

  // Per-minute 429s are waited out on the SAME provider; daily exhaustion
  // (or a still-limited final retry) advances the failover chain to the
  // next provider's separate quota pool. Only when every configured pool is
  // exhausted does the typed llm_rate_limited failure reach the trial.
  const requestOnProvider = async (
    provider: InferenceProvider,
    repairNote?: string,
  ) => {
    for (const waitMs of RATE_LIMIT_WAITS_MS) {
      try {
        return await rawRequest(provider, repairNote);
      } catch (error) {
        if (!isRateLimit(error)) throw error;
        if (isDailyExhaustion(error)) throw new Error("llm_rate_limited");
        const delayMs = retryDelayMs(error, waitMs);
        console.warn(
          `inference 429 on ${provider.model}; waiting ${delayMs}ms before retrying`,
        );
        await sleep(delayMs);
      }
    }
    try {
      return await rawRequest(provider, repairNote);
    } catch (error) {
      if (isRateLimit(error)) throw new Error("llm_rate_limited");
      throw error;
    }
  };

  const request = async (repairNote?: string) => {
    let exhausted: Error | null = null;
    for (const provider of providers) {
      try {
        return await requestOnProvider(provider, repairNote);
      } catch (error) {
        if (error instanceof Error && error.message === "llm_rate_limited") {
          exhausted = error;
          console.warn(
            `inference quota exhausted on ${provider.model}; advancing failover chain`,
          );
          continue;
        }
        throw error;
      }
    }
    throw exhausted ?? new Error("llm_rate_limited");
  };

  const first = await request();
  const firstParsed = input.schema.safeParse(
    extractJson(first.choices[0]?.message?.content ?? ""),
  );

  if (firstParsed.success) {
    return firstParsed.data;
  }

  const second = await request(firstParsed.error.issues[0]?.message ?? "schema mismatch");
  const secondParsed = input.schema.safeParse(
    extractJson(second.choices[0]?.message?.content ?? ""),
  );

  if (secondParsed.success) {
    return secondParsed.data;
  }

  throw new Error(`llm_schema_violation:${input.schemaName}`);
}
