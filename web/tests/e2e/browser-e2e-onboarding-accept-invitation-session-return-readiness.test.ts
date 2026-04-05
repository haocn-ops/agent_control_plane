import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");
const browserSpecPath = path.resolve(
  webDir,
  "tests/browser/onboarding-accept-invitation-session-return.smoke.spec.ts",
);

test("browser readiness onboarding->accept-invitation->session-return smoke keeps invite continuity explicit", async () => {
  const browserSmokeSpec = await readFile(browserSpecPath, "utf8");

  assert.match(
    browserSmokeSpec,
    /onboarding -> accept-invitation, then return -> session keeps invite continuity/,
  );
  assert.match(
    browserSmokeSpec,
    /\/onboarding\?source=admin-readiness&week8_focus=credentials&attention_workspace=preview&attention_organization=org_demo&delivery_context=week8&recent_track_key=verification&recent_update_kind=verification&evidence_count=2&recent_owner_label=Ops/,
  );
  assert.match(browserSmokeSpec, /Launch lane context/);
  assert.match(browserSmokeSpec, /Invite-to-accept path/);
  assert.match(browserSmokeSpec, /Open accept-invitation/);
  assert.match(browserSmokeSpec, /Accept workspace invitation/);
  assert.match(browserSmokeSpec, /Token guidance/);
  assert.match(browserSmokeSpec, /Accept invitation/);
  assert.match(browserSmokeSpec, /\/session/);
  assert.match(browserSmokeSpec, /one-time token/);
  assert.match(browserSmokeSpec, /page\.goBack\(\)/);
  assert.match(browserSmokeSpec, /Confirm session context/);
  assert.match(browserSmokeSpec, /Session and workspace access/);
  assert.match(browserSmokeSpec, /Before entering a managed lane/);
  assert.match(browserSmokeSpec, /source=admin-readiness/);
  assert.match(browserSmokeSpec, /week8_focus=credentials/);
  assert.match(browserSmokeSpec, /attention_workspace=preview/);
  assert.match(browserSmokeSpec, /attention_organization=org_demo/);
  assert.match(browserSmokeSpec, /delivery_context=week8/);
  assert.match(browserSmokeSpec, /recent_track_key=verification/);
  assert.match(browserSmokeSpec, /recent_update_kind=verification/);
  assert.match(browserSmokeSpec, /evidence_count=2/);
  assert.match(browserSmokeSpec, /recent_owner_label=Ops/);
});
