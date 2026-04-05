import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");
const browserSpecPath = path.resolve(
  webDir,
  "tests/browser/members-accept-invitation-onboarding-usage-return.smoke.spec.ts",
);

test("browser readiness members->accept-invitation->onboarding->usage smoke keeps recovery continuity explicit", async () => {
  const browserSmokeSpec = await readFile(browserSpecPath, "utf8");

  assert.match(
    browserSmokeSpec,
    /members -> accept-invitation -> onboarding -> usage keeps invite recovery continuity/,
  );
  assert.match(
    browserSmokeSpec,
    /\/members\?source=onboarding&attention_workspace=preview&attention_organization=org_preview&delivery_context=recent_activity&recent_track_key=verification&recent_update_kind=verification&evidence_count=2&recent_owner_label=Owner/,
  );
  assert.match(browserSmokeSpec, /Workspace access/);
  assert.match(browserSmokeSpec, /Manual onboarding handoff/);
  assert.match(browserSmokeSpec, /Open accept-invitation/);
  assert.match(browserSmokeSpec, /Accept workspace invitation/);
  assert.match(browserSmokeSpec, /Token guidance/);
  assert.match(browserSmokeSpec, /Accept invitation/);
  assert.match(browserSmokeSpec, /\/session/);
  assert.match(browserSmokeSpec, /page\.goBack\(\)/);
  assert.match(browserSmokeSpec, /Continue onboarding lane/);
  assert.match(browserSmokeSpec, /Launch lane context/);
  assert.match(browserSmokeSpec, /Step 5: Confirm usage window/);
  assert.match(browserSmokeSpec, /Workspace usage and plan posture/);
  assert.match(browserSmokeSpec, /source=onboarding/);
  assert.match(browserSmokeSpec, /attention_workspace=preview/);
  assert.match(browserSmokeSpec, /attention_organization=org_preview/);
  assert.match(browserSmokeSpec, /delivery_context=recent_activity/);
  assert.match(browserSmokeSpec, /recent_track_key=verification/);
  assert.match(browserSmokeSpec, /recent_update_kind=verification/);
  assert.match(browserSmokeSpec, /evidence_count=2/);
  assert.match(browserSmokeSpec, /recent_owner_label=Owner/);
});
