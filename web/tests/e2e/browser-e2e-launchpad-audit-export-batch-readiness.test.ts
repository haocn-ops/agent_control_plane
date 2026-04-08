import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");
const webPackageJsonPath = path.resolve(webDir, "package.json");
const rootPackageJsonPath = path.resolve(webDir, "..", "package.json");
const docsReadmePath = path.resolve(webDir, "../docs/README.md");
const executionPlanPath = path.resolve(webDir, "../docs/saas_v1_execution_plan_zh.md");
const browserSpecPath = "tests/browser/launchpad-audit-export-verification-admin-return.smoke.spec.ts";

test("launchpad audit-export focused browser batch stays wired into scripts and docs", async () => {
  const webPackageJson = JSON.parse(await readFile(webPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const rootPackageJson = JSON.parse(await readFile(rootPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const docsReadme = await readFile(docsReadmePath, "utf8");
  const executionPlan = await readFile(executionPlanPath, "utf8");

  assert.equal(
    webPackageJson.scripts?.["test:browser:launchpad-audit-export"],
    `node scripts/run-playwright-prebuilt-smoke.mjs ${browserSpecPath}`,
  );
  assert.equal(
    webPackageJson.scripts?.["test:browser:launchpad-audit-export:existing-server"],
    `node scripts/run-playwright-existing-server-smoke.mjs ${browserSpecPath}`,
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:launchpad-audit-export"],
    "npm --prefix web run test:browser:launchpad-audit-export --",
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:launchpad-audit-export:existing-server"],
    "npm --prefix web run test:browser:launchpad-audit-export:existing-server --",
  );

  assert.match(docsReadme, /web:test:browser:launchpad-audit-export/);
  assert.match(docsReadme, /launchpad audit-export focused batch/);
  assert.match(executionPlan, /launchpad-audit-export/);
  assert.match(executionPlan, /launchpad root.*verification.*admin/);
});

test("launchpad audit-export focused browser batch keeps smoke continuity explicit", async () => {
  const source = await readFile(path.resolve(webDir, browserSpecPath), "utf8");

  assert.match(source, /launchpad audit export -> verification -> admin keeps readiness continuity/);
  assert.match(source, /SaaS Workspace Launch Hub/);
  assert.match(source, /Audit export continuity/);
  assert.match(source, /Carry proof to verification/);
  assert.match(source, /Return to admin readiness view/);
  assert.match(source, /recent_owner_display_name=Avery(?:%20|\\\+)Ops/);
  assert.match(source, /recent_owner_email=avery\.ops(?:%40|@)govrail\.test/);
  assert.match(source, /Week 8 launch checklist/);
  assert.match(source, /Verification evidence lane/);
  assert.match(source, /readiness_returned=1/);
  assert.match(source, /Returned from Week 8 readiness/);
  assert.match(source, /Focus restored/);
});
