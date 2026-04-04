import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const settingsPanelPath = path.resolve(testDir, "../../components/settings/workspace-settings-panel.tsx");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("settings panel keeps local subscription controls for scheduled-end and paused states", async () => {
  const source = await readSource(settingsPanelPath);

  assert.match(source, /subscription\?\.cancel_at_period_end \? <Badge variant="default">Ends at period close<\/Badge>/);
  assert.match(
    source,
    /Manage renewal timing directly in this workspace while provider portal access is unavailable\./,
  );
  assert.match(source, /{subscriptionAction\.cancelling \? "Scheduling\.\.\." : "End at period close"}/);
  assert.match(source, /{subscriptionAction\.resuming \? "Resuming\.\.\." : "Resume renewal"}/);
});

test("settings panel keeps local billing controls gated away from cancelled and paused subscriptions", async () => {
  const source = await readSource(settingsPanelPath);

  assert.match(
    source,
    /const canScheduleCancellation =\s*Boolean\(subscription\)\s*&&\s*!subscription\?\.cancel_at_period_end\s*&&\s*!\["cancelled", "paused"\]\.includes\(subscription\?\.status \?\? ""\)\s*&&\s*\(\(plan\?\.monthly_price_cents \?\? 0\) > 0 \|\| plan\?\.tier === "paid"\);/s,
  );
  assert.match(
    source,
    /const canResumeRenewal =\s*Boolean\(subscription\)\s*&&\s*subscription\?\.cancel_at_period_end === true\s*&&\s*!\["cancelled", "paused"\]\.includes\(subscription\?\.status \?\? ""\);/s,
  );
  assert.match(
    source,
    /const showLocalSubscriptionControls = !isStripeWorkspace && \(canScheduleCancellation \|\| canResumeRenewal\);/,
  );
  assert.match(
    source,
    /showLocalSubscriptionControls && canScheduleCancellation \? \(\s*<Button[\s\S]*?"End at period close"/s,
  );
  assert.match(
    source,
    /showLocalSubscriptionControls && canResumeRenewal \? \(\s*<Button[\s\S]*?"Resume renewal"/s,
  );
});
