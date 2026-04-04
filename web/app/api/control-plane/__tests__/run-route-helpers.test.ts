import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRunPath,
  proxyRunDetailRequest,
} from "../runs/route-helpers";

test("buildRunPath composes base path with optional suffix", () => {
  assert.equal(buildRunPath("run_123"), "/api/v1/runs/run_123");
  assert.equal(buildRunPath("run_123", "/graph"), "/api/v1/runs/run_123/graph");
});

test("proxyRunDetailRequest appends request search params", async () => {
  const request = new Request("https://example.com/api/runs/run_123/events?cursor=abc");
  let calledPath: string | null = null;
  const fakeProxy = async (path: string) => {
    calledPath = path;
    return new Response(null, { status: 200 });
  };

  const response = await proxyRunDetailRequest({
    request,
    runId: "run_123",
    suffix: "/events",
    proxy: fakeProxy,
  });

  assert.equal(response.status, 200);
  assert.equal(calledPath, "/api/v1/runs/run_123/events?cursor=abc");
});
