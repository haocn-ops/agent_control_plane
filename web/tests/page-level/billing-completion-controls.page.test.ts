import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(testDir, "../../../src/app.ts");
const settingsPanelPath = path.resolve(testDir, "../../components/settings/workspace-settings-panel.tsx");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("billing completion route keeps provider-webhook completion semantics for non-mock sessions", async () => {
  const source = await readSource(appPath);

  assert.match(source, /async function completeSaasWorkspaceBillingCheckoutSession\(/);
  assert.match(source, /const idempotencyKey = requireIdempotencyKey\(request\);/);
  assert.match(
    source,
    /const routeKey = `POST:\/api\/v1\/saas\/workspaces\/\$\{workspaceId\}\/billing\/checkout-sessions\/\$\{checkoutSessionId\}:complete`;/,
  );
  assert.match(source, /const payloadHash = await hashPayload\(\{ action: "complete_billing_checkout_session" \}\);/);
  assert.match(source, /if \(session\.billing_provider !== "mock_checkout"\) \{/);
  assert.match(source, /"billing_checkout_completion_deferred"/);
  assert.match(source, /"This checkout session must be finalized by its billing provider webhook flow"/);
  assert.match(source, /if \(session\.status === "expired" \|\| session\.status === "cancelled"\) \{/);
  assert.match(source, /"invalid_state_transition"/);
});

test("settings checkout review and subscription controls keep Stripe-vs-local flow split explicit", async () => {
  const source = await readSource(settingsPanelPath);

  assert.match(source, /function isCheckoutReadyForCompletion\(status: string, billingProvider\?: string \| null\): boolean \{/);
  assert.match(
    source,
    /return isMockBillingProvider\(billingProvider\) && \["created", "open", "ready", "requires_confirmation"\]\.includes\(status\);/,
  );
  assert.match(
    source,
    /notice: isStripeBillingProvider\(session\?\.billing_provider \?\? current\.session\?\.billing_provider\)\s*\?\s*"Provider confirmation received\. Workspace billing summary has been refreshed\."[\s\S]*"Checkout session marked completed\. Workspace billing summary has been refreshed\."/,
  );
  assert.match(
    source,
    /notice: isStripeBillingProvider\(session\?\.billing_provider \?\? current\.session\?\.billing_provider\)\s*\?\s*"Checkout status refreshed\. Stripe sessions update after provider checkout and webhook confirmation\."[\s\S]*"Checkout session status refreshed\."/,
  );
  assert.match(
    source,
    /Stripe manages this session, so completion happens only after its checkout process finishes and the provider webhook confirms the upgrade\./,
  );
  assert.match(
    source,
    /This session is workspace-managed\. When status is ready, use the completion action below to finalize the upgrade\./,
  );
  assert.match(
    source,
    /isCheckoutReadyForCompletion\(checkout\.session\.status, checkout\.session\.billing_provider\) \? \([\s\S]*"Complete upgrade step"/,
  );

  assert.match(
    source,
    /canOpenBillingPortal\s*\?\s*"Open the billing provider portal to manage payment methods, invoices, and renewal settings\."[\s\S]*"Manage renewal timing directly in this workspace while provider portal access is unavailable\."/,
  );
  assert.match(source, /"Open billing portal"/);
  assert.match(source, /"End at period close"/);
  assert.match(source, /"Resume renewal"/);
  assert.match(source, /const session = await createBillingPortalSession\(\{\s*return_url: window\.location\.href,/s);
  assert.match(source, /window\.location\.assign\(session\.portal_url\);/);
});
