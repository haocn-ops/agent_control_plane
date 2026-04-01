import { ApiError } from "./http.js";

interface RateLimitConfig {
  limit: number;
  scope: string;
}

interface RateLimitCheckResponse {
  allowed: boolean;
  limit: number;
  remaining: number;
  retry_after_seconds: number;
  window_started_at: string;
  window_ends_at: string;
}

export async function enforceRunCreateRateLimit(env: Env, tenantId: string): Promise<void> {
  const config = readRateLimitConfig(env, "RATE_LIMIT_RUNS_PER_MINUTE", "runs_create");
  await enforceRateLimit(env, tenantId, config);
}

export async function enforceReplayRateLimit(env: Env, tenantId: string): Promise<void> {
  const config = readRateLimitConfig(env, "RATE_LIMIT_REPLAYS_PER_MINUTE", "runs_replay");
  await enforceRateLimit(env, tenantId, config);
}

async function enforceRateLimit(env: Env, tenantId: string, config: RateLimitConfig | null): Promise<void> {
  if (!config) {
    return;
  }

  const scope = `tenant:${tenantId}:${config.scope}`;
  const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(scope));
  const response = await stub.fetch("https://rate-limiter.internal/check", {
    method: "POST",
    body: JSON.stringify({
      limit: config.limit,
      window_seconds: 60,
    }),
  });

  if (!response.ok) {
    throw new Error(`Rate limiter check failed with status ${response.status}`);
  }

  const result = (await response.json()) as RateLimitCheckResponse;
  if (result.allowed) {
    return;
  }

  throw new ApiError(429, "rate_limited", "Run mutation rate limit exceeded", {
    scope: config.scope,
    limit: result.limit,
    remaining: result.remaining,
    retry_after_seconds: result.retry_after_seconds,
    window_started_at: result.window_started_at,
    window_ends_at: result.window_ends_at,
  });
}

function readRateLimitConfig(env: Env, envKey: string, scope: string): RateLimitConfig | null {
  const rawLimit = readEnvNumber(env, envKey);
  if (rawLimit === null || rawLimit <= 0) {
    return null;
  }
  return {
    limit: rawLimit,
    scope,
  };
}

function readEnvNumber(env: Env, key: string): number | null {
  const value = ((env as unknown) as Record<string, unknown>)[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
