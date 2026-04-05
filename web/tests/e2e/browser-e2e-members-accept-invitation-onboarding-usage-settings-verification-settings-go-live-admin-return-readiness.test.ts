import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");
const browserSpecPath = path.resolve(
  webDir,
  "tests/browser/members-accept-invitation-onboarding-usage-settings-verification-settings-go-live-admin-return.smoke.spec.ts",
);

test(
  "browser readiness members->accept-invitation->onboarding->usage->settings->verification->settings->go-live->admin smoke keeps return continuity explicit",
  async () => {
    const browserSmokeSpec = await readFile(browserSpecPath, "utf8");

    assert.match(
      browserSmokeSpec,
      /members -> accept-invitation -> onboarding -> usage -> settings -> verification -> settings -> go-live -> admin keeps readiness return continuity/,
    );
    assert.match(browserSmokeSpec, /Continue onboarding lane/);
    assert.match(browserSmokeSpec, /Step 5: Confirm usage window/);
    assert.match(browserSmokeSpec, /Review plan limits in Settings/);
    assert.match(browserSmokeSpec, /Capture verification evidence/);
    assert.match(browserSmokeSpec, /surface=verification/);
    assert.match(browserSmokeSpec, /Review settings \+ billing/);
    assert.match(browserSmokeSpec, /Rehearse go-live readiness/);
    assert.match(browserSmokeSpec, /surface=go_live/);
    assert.match(browserSmokeSpec, /Return to admin readiness view/);
    assert.match(browserSmokeSpec, /readiness_returned=1/);
    assert.match(browserSmokeSpec, /Clear readiness focus/);
    assert.match(browserSmokeSpec, /recent_owner_(label|display_name)=Ops/);
  },
);
