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
  verdiqtLlm?: OpenAI;
};

export function getLlmClient() {
  if (!globalForLlm.verdiqtLlm) {
    const apiKey = process.env.INFERENCE_API_KEY;

    if (!apiKey) {
      throw new Error("INFERENCE_API_KEY is required for inference");
    }

    globalForLlm.verdiqtLlm = new OpenAI({
      apiKey,
      baseURL: process.env.INFERENCE_BASE_URL ?? INFERENCE_DEFAULTS.baseURL,
      timeout: INFERENCE_DEFAULTS.timeoutMs,
      maxRetries: INFERENCE_DEFAULTS.maxRetries,
    });
  }

  return globalForLlm.verdiqtLlm;
}

export function inferenceModel() {
  return process.env.INFERENCE_MODEL ?? INFERENCE_DEFAULTS.model;
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

const RATE_LIMIT_WAITS_MS = [10_000, 25_000, 60_000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimit(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: number }).status === 429
  );
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
  const client = getLlmClient();
  const model = inferenceModel();

  const rawRequest = (repairNote?: string) =>
    client.chat.completions.create({
      model,
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

  const request = async (repairNote?: string) => {
    for (const waitMs of RATE_LIMIT_WAITS_MS) {
      try {
        return await rawRequest(repairNote);
      } catch (error) {
        if (!isRateLimit(error)) throw error;
        console.warn(`groq 429; waiting ${waitMs}ms before retrying`);
        await sleep(waitMs);
      }
    }
    return rawRequest(repairNote);
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
