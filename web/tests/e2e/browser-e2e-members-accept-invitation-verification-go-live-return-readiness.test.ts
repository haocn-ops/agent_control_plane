import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");
const browserSpecPath = path.resolve(
  webDir,
  "tests/browser/members-accept-invitation-verification-go-live-return.smoke.spec.ts",
);

test("browser readiness members->accept-invitation->verification->go-live smoke keeps continuity explicit", async () => {
  const browserSmokeSpec = await readFile(browserSpecPath, "utf8");

  assert.match(
    browserSmokeSpec,
    /members -> accept-invitation -> verification -> go-live keeps manual return continuity/,
  );
  assert.match(
    browserSmokeSpec,
    /\/members\?source=onboarding&attention_workspace=preview&attention_organization=org_preview&delivery_context=recent_activity&recent_track_key=verification&recent_update_kind=verification&evidence_count=2&recent_owner_label=Owner&recent_owner_display_name=Preview%20Owner&recent_owner_email=preview\.owner%40govrail\.test/,
  );
  assert.match(browserSmokeSpec, /Workspace access/);
  assert.match(browserSmokeSpec, /Manual onboarding handoff/);
  assert.match(browserSmokeSpec, /Open accept-invitation/);
  assert.match(browserSmokeSpec, /Accept workspace invitation/);
  assert.match(browserSmokeSpec, /Token guidance/);
  assert.match(browserSmokeSpec, /Accept invitation/);
  assert.match(browserSmokeSpec, /\/session/);
  assert.match(browserSmokeSpec, /page\.goBack\(\)/);
  assert.match(browserSmokeSpec, /Capture verification evidence/);
  assert.match(browserSmokeSpec, /surface=verification/);
  assert.match(browserSmokeSpec, /Week 8 launch checklist/);
  assert.match(browserSmokeSpec, /Verification evidence lane/);
  assert.match(browserSmokeSpec, /Continue to go-live drill/);
  assert.match(browserSmokeSpec, /surface=go_live/);
  assert.match(browserSmokeSpec, /Mock go-live drill/);
  assert.match(browserSmokeSpec, /Session-aware drill lane/);
  assert.match(browserSmokeSpec, /source=onboarding/);
  assert.match(browserSmokeSpec, /attention_workspace=preview/);
  assert.match(browserSmokeSpec, /attention_organization=org_preview/);
  assert.match(browserSmokeSpec, /delivery_context=recent_activity/);
  assert.match(browserSmokeSpec, /recent_track_key=verification/);
  assert.match(browserSmokeSpec, /recent_update_kind=verification/);
  assert.match(browserSmokeSpec, /evidence_count=2/);
  assert.match(browserSmokeSpec, /recent_owner_display_name=Preview%20Owner/);
  assert.match(browserSmokeSpec, /recent_owner_email=preview\.owner%40govrail\.test/);
});
