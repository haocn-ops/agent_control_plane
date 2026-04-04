import assert from "node:assert/strict";
import test from "node:test";

import { buildToolProviderPath, proxyToolProviderPost } from "../tool-providers/route-helpers";

test("buildToolProviderPath keeps update and disable upstream paths stable", () => {
  assert.equal(buildToolProviderPath("provider_123"), "/api/v1/tool-providers/provider_123");
  assert.equal(
    buildToolProviderPath("provider_123", "disable"),
    "/api/v1/tool-providers/provider_123:disable",
  );
});

test("proxyToolProviderPost reuses shared post init for update and disable actions", async () => {
  const previousBase = process.env.CONTROL_PLANE_BASE_URL;
  process.env.CONTROL_PLANE_BASE_URL = "https://control-plane.test";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    assert.equal(String(input), "https://control-plane.test/api/v1/tool-providers/provider_123:disable");
    assert.equal(init?.method, "POST");
    assert.equal(headers.get("accept"), "application/json");
    assert.equal(headers.get("content-type"), "application/json");
    assert.match(headers.get("idempotency-key") ?? "", /^web-/);
    assert.equal(init?.body, '{"enabled":false}');
    return new Response("{}", {
      status: 202,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const response = await proxyToolProviderPost(
      new Request("https://example.com", {
        method: "POST",
        body: '{"enabled":false}',
        headers: {
          "content-type": "application/json",
        },
      }),
      "provider_123",
      "disable",
      async () =>
        ({
          source: "metadata",
          source_detail: {
            label: "SaaS metadata",
            is_fallback: false,
            local_only: false,
            warning: null,
          },
          session_user: null,
          workspace: {
            workspace_id: "ws_123",
            slug: "acme",
            display_name: "Acme",
            tenant_id: "tenant_123",
          },
          available_workspaces: [],
          selection: {
            requested_workspace_id: null,
            requested_workspace_slug: null,
            cookie_workspace: null,
          },
        }) as never,
    );
    assert.equal(response.status, 202);
  } finally {
    process.env.CONTROL_PLANE_BASE_URL = previousBase;
    globalThis.fetch = originalFetch;
  }
});
