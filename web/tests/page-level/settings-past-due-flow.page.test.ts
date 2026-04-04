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

test("billing summary keeps past-due resolve-billing action semantics", async () => {
  const source = await readSource(appPath);

  assert.match(
    source,
    /if \(subscription\.status === "past_due"\)[\s\S]*?status_label: "Billing attention needed",/,
  );
  assert.match(
    source,
    /if \(subscription\.status === "past_due"\)[\s\S]*?description: "The subscription is past due and feature access may tighten if billing is not resolved\.",/,
  );
  assert.match(
    source,
    /if \(subscription\.status === "past_due"\)[\s\S]*?action: \{[\s\S]*?kind: "resolve_billing",[\s\S]*?label: resolveBillingSelfServeEnabled \? "Resolve billing" : "Coordinate billing recovery",[\s\S]*?href: "\/settings\?intent=resolve-billing",[\s\S]*?availability: resolveBillingSelfServeEnabled \? "ready" : "staged",/,
  );
});

test("settings panel keeps past-due portal versus local renewal flow text", async () => {
  const source = await readSource(settingsPanelPath);

  assert.match(
    source,
    /setSubscriptionAction\(\{\s*openingPortal: false,\s*cancelling: false,\s*resuming: false,\s*error: null,\s*notice: "Subscription will now end at the close of the current billing period\.",/s,
  );
  assert.match(
    source,
    /setSubscriptionAction\(\{\s*openingPortal: false,\s*cancelling: false,\s*resuming: false,\s*error: null,\s*notice: "Automatic renewal has been restored for this subscription\.",/s,
  );
  assert.match(
    source,
    /Open the billing provider portal to manage payment methods, invoices, and renewal settings\./,
  );
  assert.match(
    source,
    /Manage renewal timing directly in this workspace while provider portal access is unavailable\./,
  );
});
