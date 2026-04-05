import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");
const browserSpecPath = path.resolve(
  webDir,
  "tests/browser/admin-readiness-credentials-onboarding-api-keys-verification-return.smoke.spec.ts",
);

test("browser readiness credentials onboarding->api-keys->verification smoke keeps admin-readiness continuity explicit without overstating coverage", async () => {
  const browserSmokeSpec = await readFile(browserSpecPath, "utf8");

  assert.match(
    browserSmokeSpec,
    /admin readiness credentials branch -> onboarding -> api-keys -> verification -> admin keeps readiness browser continuity/,
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
  assert.match(browserSmokeSpec, /Step 3: Issue API key/);
  assert.match(browserSmokeSpec, /source=admin-readiness/);
  assert.match(browserSmokeSpec, /week8_focus=credentials/);
  assert.match(browserSmokeSpec, /attention_workspace=preview/);
  assert.match(browserSmokeSpec, /attention_organization=org_preview/);
  assert.match(browserSmokeSpec, /Credential lifecycle/);
  assert.match(browserSmokeSpec, /Credential sequence/);
  assert.match(browserSmokeSpec, /Step 5: Record verification evidence/);
  assert.match(browserSmokeSpec, /Week 8 launch checklist/);
  assert.match(browserSmokeSpec, /Admin follow-up context/);
  assert.match(browserSmokeSpec, /Focus Credentials/);
  assert.match(browserSmokeSpec, /Return to admin readiness view/);
  assert.match(browserSmokeSpec, /readiness_returned=1/);
  assert.match(browserSmokeSpec, /Returned from Week 8 readiness/);
  assert.match(browserSmokeSpec, /Focus restored/);
  assert.match(browserSmokeSpec, /Clear readiness focus/);
});
