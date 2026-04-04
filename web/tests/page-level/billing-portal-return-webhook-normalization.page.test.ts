import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(testDir, "../../../src/app.ts");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("billing portal return URL source keeps explicit -> env -> settings fallback precedence", async () => {
  const source = await readSource(appPath);

  assert.match(
    source,
    /function resolveStripeCustomerPortalReturnUrl\([\s\S]*?if \(explicitReturnUrl\) \{\s*return explicitReturnUrl;\s*\}/s,
  );
  assert.match(source, /const configuredPortalReturnUrl = getOptionalEnvString\(env, "STRIPE_CUSTOMER_PORTAL_RETURN_URL"\);/);
  assert.match(
    source,
    /if \(configuredPortalReturnUrl\) \{\s*return normalizeAbsoluteHttpUrl\(configuredPortalReturnUrl, "STRIPE_CUSTOMER_PORTAL_RETURN_URL"\);\s*\}/s,
  );
  assert.match(source, /return buildAbsoluteBillingManagementUrl\(request, env, intent\);/);

  assert.match(source, /"return_url must be a valid absolute URL when provided"/);
  assert.match(source, /"return_url must use http or https when provided"/);
  assert.match(source, /return_url: parsedUrl\.toString\(\),/);
});

test("stripe webhook normalization keeps subscription update and delete mapped onto internal events", async () => {
  const source = await readSource(appPath);

  assert.match(source, /if \(eventType === "customer\.subscription\.updated" \|\| eventType === "customer\.subscription\.deleted"\) \{/);
  assert.match(source, /const currentPeriodStart =\s*typeof payload\.current_period_start === "number"/s);
  assert.match(source, /const currentPeriodEnd =\s*typeof payload\.current_period_end === "number"/s);
  assert.match(source, /const workspaceId = typeof metadata\.workspace_id === "string" \? metadata\.workspace_id : null;/);
  assert.match(source, /const externalCustomerRef = typeof payload\.customer === "string" \? payload\.customer : null;/);
  assert.match(source, /const externalSubscriptionRef = typeof payload\.id === "string" \? payload\.id : null;/);
  assert.match(
    source,
    /const status =\s*typeof payload\.status === "string"\s*\?\s*payload\.status\s*:\s*eventType === "customer\.subscription\.deleted"\s*\?\s*"cancelled"\s*:\s*null;/s,
  );
  assert.match(
    source,
    /event_type: eventType === "customer\.subscription\.deleted" \? "subscription\.cancelled" : "subscription\.updated",/,
  );
  assert.match(
    source,
    /\.\.\.\(cancelAtPeriodEnd !== null \? \{ cancel_at_period_end: cancelAtPeriodEnd \} : \{\}\),/,
  );
});
