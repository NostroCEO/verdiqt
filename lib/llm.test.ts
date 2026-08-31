import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  constructed: [] as Array<Record<string, unknown>>,
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mocks.create } };
    constructor(opts: Record<string, unknown>) {
      mocks.constructed.push(opts);
    }
  },
}));

import { structuredCall } from "@/lib/llm";

const schema = z.object({ ok: z.boolean() });

const ENV_KEYS = [
  "INFERENCE_API_KEY",
  "INFERENCE_BASE_URL",
  "INFERENCE_MODEL",
  "INFERENCE_REASONING_EFFORT",
  "INFERENCE_FALLBACK_BASE_URL",
  "INFERENCE_FALLBACK_MODEL",
  "INFERENCE_FALLBACK_API_KEY",
  "INFERENCE_FALLBACK2_BASE_URL",
  "INFERENCE_FALLBACK2_MODEL",
  "INFERENCE_FALLBACK2_API_KEY",
] as const;
const savedEnv = new Map<string, string | undefined>();

function ok(content: string) {
  return { choices: [{ message: { content } }] };
}

const dailyExhaustion = {
  status: 429,
  message: "Quota exceeded for metric generate_requests_per_day",
};

describe("structuredCall failover chain", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv.set(key, process.env[key]);
      delete process.env[key];
    }
    process.env.INFERENCE_API_KEY = "primary-key";
    process.env.INFERENCE_BASE_URL = "https://gemini.example/openai/";
    process.env.INFERENCE_MODEL = "gemini-3.6-flash";
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const original = savedEnv.get(key);
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
    mocks.create.mockReset();
    mocks.constructed.length = 0;
    delete (globalThis as { verdiqtLlmClients?: unknown }).verdiqtLlmClients;
  });

  it("advances through the chain on daily exhaustion and inherits primary credentials", async () => {
    process.env.INFERENCE_FALLBACK_MODEL = "gemini-3.1-flash-lite";
    process.env.INFERENCE_FALLBACK2_BASE_URL = "https://groq.example/v1";
    process.env.INFERENCE_FALLBACK2_MODEL = "openai/gpt-oss-120b";
    process.env.INFERENCE_FALLBACK2_API_KEY = "groq-key";

    mocks.create
      .mockRejectedValueOnce(dailyExhaustion)
      .mockRejectedValueOnce(dailyExhaustion)
      .mockResolvedValueOnce(ok('{"ok":true}'));

    const result = await structuredCall({
      system: "s",
      user: "u",
      schema,
      schemaName: "Test",
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.create).toHaveBeenCalledTimes(3);
    const models = mocks.create.mock.calls.map((call) => call[0].model);
    expect(models).toEqual([
      "gemini-3.6-flash",
      "gemini-3.1-flash-lite",
      "openai/gpt-oss-120b",
    ]);
    // gemini-3* defaults to low reasoning effort; other providers send none.
    expect(mocks.create.mock.calls[0][0].reasoning_effort).toBe("low");
    expect(mocks.create.mock.calls[1][0].reasoning_effort).toBe("low");
    expect(mocks.create.mock.calls[2][0]).not.toHaveProperty("reasoning_effort");
  });

  it("throws non-rate-limit errors immediately without touching fallbacks", async () => {
    process.env.INFERENCE_FALLBACK_MODEL = "gemini-3.1-flash-lite";
    const boom = { status: 500, message: "boom" };
    mocks.create.mockRejectedValueOnce(boom);

    await expect(
      structuredCall({ system: "s", user: "u", schema, schemaName: "Test" }),
    ).rejects.toEqual(boom);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("fails typed when every configured pool is exhausted", async () => {
    mocks.create.mockRejectedValue(dailyExhaustion);

    await expect(
      structuredCall({ system: "s", user: "u", schema, schemaName: "Test" }),
    ).rejects.toThrow("llm_rate_limited");
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("INFERENCE_REASONING_EFFORT=none strips the effort field even for gemini-3", async () => {
    process.env.INFERENCE_REASONING_EFFORT = "none";
    mocks.create.mockResolvedValueOnce(ok('{"ok":true}'));

    await structuredCall({ system: "s", user: "u", schema, schemaName: "Test" });

    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty("reasoning_effort");
  });
});
