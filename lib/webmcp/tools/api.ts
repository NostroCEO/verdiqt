type HttpMethod = "GET" | "POST" | "PUT" | "PATCH";

type ApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  signal: AbortSignal;
};

export function recordFrom(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  return input as Record<string, unknown>;
}

export function stringField(input: unknown, key: string): string | null {
  const value = recordFrom(input)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function optionalStringField(input: unknown, key: string): string | undefined {
  const value = recordFrom(input)[key];
  return typeof value === "string" ? value : undefined;
}

export function optionalNumberField(input: unknown, key: string): number | undefined {
  const value = recordFrom(input)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function optionalStringArrayField(input: unknown, key: string): string[] | undefined {
  const value = recordFrom(input)[key];

  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length > 0 ? strings : undefined;
}

export function encodedRunPath(input: unknown, suffix: string): string | null {
  const runId = stringField(input, "run_id");
  return runId ? "/api/trials/" + encodeURIComponent(runId) + suffix : null;
}

export function invalidToolInput(field: string, hint: string) {
  return {
    error: "invalid_tool_input",
    field,
    hint,
  };
}

export async function fetchApi(path: string, options: ApiRequestOptions): Promise<unknown> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    signal: options.signal,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  // A non-JSON answer is almost always transient (the host restarting during
  // a deploy, a proxy interstitial). The hint must tell the AGENT to retry —
  // agents act on this text, and the old "goes live when the backend deploys"
  // wording made them give up on a ten-second blip (observed live 2026-08-31
  // during a rolling deploy).
  return {
    error: "api_unavailable",
    status: response.status,
    retryable: true,
    hint: "The backend did not answer with JSON - it is likely restarting and will be back within seconds. Wait ~10 seconds and retry this exact call; if it persists, poll get_validation_status.",
  };
}
