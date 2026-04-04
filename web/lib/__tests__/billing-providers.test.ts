import assert from "node:assert/strict";
import test from "node:test";

import { buildBillingProviderRegistry, resolveWorkspaceCheckoutProvider } from "../../../src/lib/billing-providers.ts";

test("resolveWorkspaceCheckoutProvider returns null when mock_checkout is the only checkout-capable provider", () => {
  const provider = resolveWorkspaceCheckoutProvider({ stripeCheckoutEnabled: false });
  assert.equal(provider, null);
});

test("resolveWorkspaceCheckoutProvider can expose mock_checkout when explicitly allowed", () => {
  const provider = resolveWorkspaceCheckoutProvider({
    stripeCheckoutEnabled: false,
    allowMockCheckout: true,
  });
  assert.ok(provider);
  assert.equal(provider?.code, "mock_checkout");
  assert.equal(provider?.display_name, "Mock checkout");
  assert.equal(provider?.supports_checkout, true);
});

test("resolveWorkspaceCheckoutProvider skips mock_checkout when not explicitly allowed", () => {
  const provider = resolveWorkspaceCheckoutProvider({
    preferredProviderCode: "mock_checkout",
    stripeCheckoutEnabled: false,
  });
  assert.equal(provider, null);
});

test("resolveWorkspaceCheckoutProvider selects stripe when enabled by env", () => {
  const provider = resolveWorkspaceCheckoutProvider({
    preferredProviderCode: "stripe",
    stripeCheckoutEnabled: true,
  });
  assert.equal(provider.code, "stripe");
  assert.equal(provider.supports_checkout, true);
});

test("buildBillingProviderRegistry documents mock_checkout as fallback for testing", () => {
  const registry = buildBillingProviderRegistry("stripe", { stripeCheckoutEnabled: true });
  const mockProvider = registry.providers.find((item) => item.code === "mock_checkout");
  assert.ok(mockProvider);
  assert.equal(mockProvider?.status, "staged");
  assert.ok(mockProvider?.notes.some((note) => note.includes("Fallback test provider")));
});
