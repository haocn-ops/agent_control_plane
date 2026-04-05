import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");
const browserSpecPath = path.resolve(
  webDir,
  "tests/browser/admin-readiness-credentials-onboarding-playground-verification-return.smoke.spec.ts",
);

test("browser readiness credentials onboarding->playground->verification smoke keeps admin-readiness continuity explicit without overstating coverage", async () => {
  const browserSmokeSpec = await readFile(browserSpecPath, "utf8");

  assert.match(
    browserSmokeSpec,
    /admin readiness credentials branch -> onboarding -> playground -> verification -> admin keeps readiness browser continuity/,
  );
  assert.match(
    browserSmokeSpec,
    /\/admin\?week8_focus=credentials&attention_organization=org_preview&attention_workspace=preview/,
  );
  assert.match(browserSmokeSpec, /Governance focus/);
  assert.match(browserSmokeSpec, /Credentials/);
  assert.match(browserSmokeSpec, /Preview Organization/);
  assert.match(browserSmokeSpec, /Preview Workspace/);
  assert.match(browserSmokeSpec, /Clear all focus/);
  assert.match(browserSmokeSpec, /Week 8 readiness summary/);
  assert.match(browserSmokeSpec, /Drill-down active: Credentials/);
  assert.match(browserSmokeSpec, /Open onboarding flow/);
  assert.match(browserSmokeSpec, /Step 4: Run playground demo/);
  assert.match(browserSmokeSpec, /source=admin-readiness/);
  assert.match(browserSmokeSpec, /week8_focus=credentials/);
  assert.match(browserSmokeSpec, /attention_workspace=preview/);
  assert.match(browserSmokeSpec, /attention_organization=org_preview/);
  assert.match(browserSmokeSpec, /Prompt, invoke, inspect/);
  assert.match(browserSmokeSpec, /Plan-limit checkpoint/);
  assert.match(browserSmokeSpec, /Capture verification evidence/);
  assert.match(browserSmokeSpec, /surface=verification/);
  assert.match(browserSmokeSpec, /Week 8 launch checklist/);
  assert.match(browserSmokeSpec, /Admin follow-up context/);
  assert.match(browserSmokeSpec, /Focus Credentials/);
  assert.match(browserSmokeSpec, /Return to admin readiness view/);
  assert.match(browserSmokeSpec, /readiness_returned=1/);
  assert.match(browserSmokeSpec, /Returned from Week 8 readiness/);
  assert.match(browserSmokeSpec, /Focus restored/);
  assert.match(browserSmokeSpec, /Clear readiness focus/);
});
