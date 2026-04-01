import { DurableObject } from "cloudflare:workers";

interface RateLimitState {
  window_start_ms: number;
  count: number;
}

interface RateLimitCheckRequest {
  limit: number;
  window_seconds: number;
  now_ms?: number;
}

interface RateLimitCheckResponse {
  allowed: boolean;
  limit: number;
  remaining: number;
  retry_after_seconds: number;
  window_started_at: string;
  window_ends_at: string;
}

export class RateLimiter extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/check") {
      return new Response("Not found", { status: 404 });
    }

    const payload = (await request.json()) as RateLimitCheckRequest;
    const limit = Number(payload.limit);
    const windowSeconds = Number(payload.window_seconds);
    if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(windowSeconds) || windowSeconds <= 0) {
      return Response.json(
        {
          error: "invalid_rate_limit_config",
        },
        { status: 400 },
      );
    }

    const nowMs = Number.isFinite(payload.now_ms) ? Number(payload.now_ms) : Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
    const windowEndsAtMs = windowStartMs + windowMs;
    const current = await this.ctx.storage.get<RateLimitState>("state");
    const state =
      current && current.window_start_ms === windowStartMs
        ? current
        : {
            window_start_ms: windowStartMs,
            count: 0,
          };

    if (state.count >= limit) {
      return Response.json({
        allowed: false,
        limit,
        remaining: 0,
        retry_after_seconds: Math.max(1, Math.ceil((windowEndsAtMs - nowMs) / 1000)),
        window_started_at: new Date(windowStartMs).toISOString(),
        window_ends_at: new Date(windowEndsAtMs).toISOString(),
      } satisfies RateLimitCheckResponse);
    }

    const nextState: RateLimitState = {
      window_start_ms: windowStartMs,
      count: state.count + 1,
    };
    await this.ctx.storage.put("state", nextState);

    return Response.json({
      allowed: true,
      limit,
      remaining: Math.max(0, limit - nextState.count),
      retry_after_seconds: 0,
      window_started_at: new Date(windowStartMs).toISOString(),
      window_ends_at: new Date(windowEndsAtMs).toISOString(),
    } satisfies RateLimitCheckResponse);
  }
}
