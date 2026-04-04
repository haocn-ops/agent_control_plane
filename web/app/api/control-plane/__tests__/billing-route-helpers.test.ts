import assert from "node:assert/strict";
import test from "node:test";

import { buildBillingGetProxyInit, buildBillingPostProxyInit } from "../workspace/billing/route-helpers";

test("buildBillingGetProxyInit enforces GET method", () => {
  const init = buildBillingGetProxyInit();

  assert.strictEqual(init.method, "GET");
});

test("buildBillingPostProxyInit keeps provided headers, body, and sets POST metadata", async () => {
  const body = JSON.stringify({ foo: "bar" });
  const request = new Request("https://example.com", {
    method: "POST",
    headers: {
      "content-type": "application/custom",
    },
    body,
  });

  const init = await buildBillingPostProxyInit(request);
  const headers = new Headers(init.headers);

  assert.strictEqual(init.method, "POST");
  assert.strictEqual(headers.get("accept"), "application/json");
  assert.strictEqual(headers.get("content-type"), "application/custom");
  assert.strictEqual(init.body, body);
  assert.match(headers.get("idempotency-key") ?? "", /^web-/);
});

test("buildBillingPostProxyInit defaults to application/json when content-type is missing", async () => {
  const request = new Request("https://example.com", {
    method: "POST",
    body: "[]",
  });
  request.headers.delete("content-type");
  const init = await buildBillingPostProxyInit(request);
  const headers = new Headers(init.headers);

  assert.strictEqual(headers.get("accept"), "application/json");
  assert.strictEqual(headers.get("content-type"), "application/json");
  assert.match(headers.get("idempotency-key") ?? "", /^web-/);
});
