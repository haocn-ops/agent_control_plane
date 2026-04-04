import assert from "node:assert/strict";
import test from "node:test";

import { proxyFallbackGet } from "../fallback-route-helpers";

test("proxyFallbackGet returns upstream on success", async () => {
  let capturedPath = "";
  let capturedIncludeTenant: boolean | undefined;

  const upstream = new Response("ok", { status: 200 });

  const response = await proxyFallbackGet({
    path: "/api/test",
    includeTenant: false,
    proxy: async (path, options) => {
      capturedPath = path;
      capturedIncludeTenant = options?.includeTenant;
      return upstream;
    },
    buildFallback: () => ({ data: { preview: true } }),
  });

  assert.equal(response, upstream);
  assert.equal(capturedPath, "/api/test");
  assert.equal(capturedIncludeTenant, false);
});

test("proxyFallbackGet returns upstream on non fallback errors", async () => {
  const upstream = new Response("server error", { status: 500 });

  const response = await proxyFallbackGet({
    path: "/api/other",
    buildFallback: () => ({ data: { preview: true } }),
    proxy: async () => upstream,
  });

  assert.equal(response, upstream);
});

test("proxyFallbackGet wraps fallback for 404 and 503", async () => {
  const response = await proxyFallbackGet({
    path: "/api/fallback",
    buildFallback: (upstream) => ({
      data: { mode: "preview" },
      meta: { request_id: "custom-request" },
      // Keep the upstream status available for fallback payload builders.
    }),
    proxy: async () => new Response("not found", { status: 404 }),
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload, {
    data: { mode: "preview" },
    meta: {
      request_id: "custom-request",
      trace_id: "preview-trace",
    },
  });
});

test("proxyFallbackGet passes the upstream response to the fallback builder", async () => {
  let observedStatus: number | null = null;

  const response = await proxyFallbackGet({
    path: "/api/delivery",
    buildFallback: (upstream) => {
      observedStatus = upstream.status;
      return { data: { preview: true } };
    },
    proxy: async () => new Response("control plane unavailable", { status: 503 }),
  });

  assert.equal(response.status, 200);
  assert.equal(observedStatus, 503);
});
