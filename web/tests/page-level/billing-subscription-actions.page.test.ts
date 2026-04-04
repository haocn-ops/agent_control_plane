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

test("billing cancel/resume routes keep subscription-action contract intact", async () => {
  const source = await readSource(appPath);

  assert.match(
    source,
    /"This subscription is managed by the billing provider portal\. Open the billing portal to change cancellation settings\."/,
  );
  assert.match(
    source,
    /"This subscription is managed by the billing provider portal\. Open the billing portal to change renewal settings\."/,
  );
  assert.match(source, /"This subscription cannot be scheduled for cancellation"/);
  assert.match(
    source,
    /"This subscription must be replaced through checkout before it can become active again"/,
  );

  assert.match(
    source,
    /if \(currentSubscription\.cancel_at_period_end === 1\)[\s\S]*?return json\(\s*buildWorkspaceBillingSubscriptionResponse\(env, currentPlan, currentSubscription\),/,
  );
  assert.match(
    source,
    /return json\(\s*buildWorkspaceBillingSubscriptionResponse\(env, currentPlan, updatedSubscription\),/,
  );
  assert.match(
    source,
    /"Subscription could not be loaded after cancellation update"/,
  );

  assert.match(
    source,
    /if \(currentSubscription\.cancel_at_period_end !== 1\)[\s\S]*?return json\(\s*buildWorkspaceBillingSubscriptionResponse\(env, currentPlan, currentSubscription\),/,
  );
  assert.match(
    source,
    /return json\(\s*buildWorkspaceBillingSubscriptionResponse\(env, currentPlan, updatedSubscription\),/,
  );
  assert.match(source, /"Subscription could not be loaded after resume update"/);
});
