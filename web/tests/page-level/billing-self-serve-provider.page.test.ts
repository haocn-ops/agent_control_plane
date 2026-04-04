import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const billingProvidersPath = path.resolve(testDir, "../../../src/lib/billing-providers.ts");
const appPath = path.resolve(testDir, "../../../src/app.ts");
const settingsPanelPath = path.resolve(testDir, "../../components/settings/workspace-settings-panel.tsx");
const usageDashboardPath = path.resolve(testDir, "../../components/usage/workspace-usage-dashboard.tsx");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("billing self-serve provider resolution keeps mock checkout test-only by default", async () => {
  const [billingProvidersSource, appSource] = await Promise.all([
    readSource(billingProvidersPath),
    readSource(appPath),
  ]);

  assert.match(billingProvidersSource, /allowMockCheckout\?: boolean;/);
  assert.match(
    billingProvidersSource,
    /preferredProvider\?\.supports_checkout &&\s*\(preferredProvider\.code !== "mock_checkout" \|\| args\?\.allowMockCheckout === true\)/s,
  );
  assert.match(
    billingProvidersSource,
    /if \(args\?\.allowMockCheckout === true\) \{\s*const fallback = getBillingProviderDescriptor\("mock_checkout"\);/s,
  );
  assert.match(
    billingProvidersSource,
    /if \(args\?\.allowMockCheckout === true\) \{[\s\S]*?return fallback;\s*\}\s*\n\s*return null;\s*\n\}/s,
  );

  assert.match(appSource, /const configuredSelfServeProvider = getOptionalEnvString\(env, "BILLING_SELF_SERVE_PROVIDER"\);/);
  assert.match(appSource, /const allowMockCheckout = configuredSelfServeProvider\?\.toLowerCase\(\) === "mock_checkout";/);
  assert.match(appSource, /"billing_self_serve_not_configured"/);
  assert.match(appSource, /"No production self-serve billing provider is configured for this workspace"/);
});

test("settings and usage surfaces keep mock checkout labeled as a test-only fallback", async () => {
  const [settingsSource, usageSource] = await Promise.all([
    readSource(settingsPanelPath),
    readSource(usageDashboardPath),
  ]);

  assert.match(settingsSource, /Mock checkout is kept as a test-only fallback; production self-serve flows rely on Stripe when enabled\./);
  assert.match(settingsSource, /This mock checkout entry is retained as a test\/fallback option, not a production self-serve provider\./);
  assert.match(usageSource, /Mock checkout is a test-only fallback; rely on Stripe when it is enabled for production self-serve\./);
});
