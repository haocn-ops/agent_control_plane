import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const onboardingWizardPath = path.resolve(testDir, "../../components/onboarding/workspace-onboarding-wizard.tsx");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("onboarding wizard keeps first-demo status hints, blockers, and recommended next actions", async () => {
  const source = await readSource(onboardingWizardPath);

  assert.match(source, /const latestDemoRun = onboardingState\?\.latest_demo_run \?\? null;/);
  assert.match(source, /const latestDemoRunHint = onboardingState\?\.latest_demo_run_hint \?\? null;/);
  assert.match(source, /const blockers: Array<\{\s*code: string;[\s\S]*severity: "blocking" \| "warning";/);
  assert.match(source, /blockers\.find\(\(item\) => item\.severity === "blocking"\)/);
  assert.match(source, /blockers\.find\(\(item\) => item\.severity === "warning"\)/);
  assert.match(source, /const recommendedNext:\s*\{\s*surface:\s*OnboardingSurface;/);
  assert.match(source, /Recommended next step/, "UI still renders the recommended next step CTA");
  assert.match(source, /First demo run succeeded|Demo run in progress|Behind on prerequisites/);
  assert.match(source, /latestDemoRunHint\?\.status_label/);
  assert.match(source, /latestDemoRunHint\?\.suggested_action/);
  assert.match(source, /const recommendedNextHref = buildVerificationChecklistHandoffHref\(/);
  assert.match(source, /const verificationChecklistHref = buildVerificationChecklistHandoffHref\(/);
  assert.match(source, /const goLiveDrillHref = buildVerificationChecklistHandoffHref\(/);
  assert.match(source, /const deliveryGuidance = onboardingState\?\.delivery_guidance \?\? null;/);
  assert.match(source, /const recoveryLane = getRecoveryLane\(/);
});

test("onboarding wizard navigation keeps blockers and evidence handoff context", async () => {
  const source = await readSource(onboardingWizardPath);

  assert.match(source, /blockers\.map\(\(blocker\) => \(/);
  assert.match(source, /const expandedNextActions = \[\.\.\.nextActions\.map\(\(action\) => action\)\];/);
  assert.match(source, /Open Playground and execute the first demo flow/);
  assert.match(source, /Capture verification evidence/);
  assert.match(source, /continue the guided walkthrough/);
  assert.match(source, /firstDemoStatusText/);
  assert.match(source, /firstDemoStatusVariant/);
  assert.match(source, /latestDemoRunHint\?\.needs_attention/);
  assert.match(source, /const goLiveDrillHref = buildVerificationChecklistHandoffHref\(/);
  assert.match(source, /blockers\.find\(\(item\) => item\.severity === "blocking"/);
  assert.match(source, /Completed: \{new Date\(latestDemoRun\.completed_at\)\.toLocaleString\(\)\}/);
});
