import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");
const browserSpecPath = path.resolve(
  webDir,
  "tests/browser/admin-readiness-billing-warning-settings-go-live-playground-return.smoke.spec.ts",
);

test(
  "browser readiness billing-warning settings->go-live->playground smoke keeps continuity explicit without overstating coverage",
  async () => {
    const browserSmokeSpec = await readFile(browserSpecPath, "utf8");

    assert.match(
      browserSmokeSpec,
      /admin readiness billing warning branch -> settings -> go-live -> playground -> admin keeps readiness browser continuity/,
    );
    assert.match(browserSmokeSpec, /intent=resolve-billing/);
    assert.match(browserSmokeSpec, /Rehearse go-live readiness/);
    assert.match(browserSmokeSpec, /surface=go_live/);
    assert.match(browserSmokeSpec, /Revisit playground run/);
    assert.match(browserSmokeSpec, /source=admin-readiness/);
    assert.match(browserSmokeSpec, /week8_focus=billing_warning/);
    assert.match(browserSmokeSpec, /attention_workspace=preview/);
    assert.match(browserSmokeSpec, /attention_organization=org_preview/);
    assert.match(browserSmokeSpec, /Prompt, invoke, inspect/);
    assert.match(browserSmokeSpec, /Admin follow-up context/);
    assert.match(browserSmokeSpec, /Focus Billing warning/);
    assert.match(browserSmokeSpec, /Return to admin readiness view/);
    assert.match(browserSmokeSpec, /readiness_returned=1/);
    assert.match(browserSmokeSpec, /Returned from Week 8 readiness/);
  },
);
