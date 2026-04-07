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

const specs = [
  "tests/browser/admin-readiness-billing-warning-settings-return.smoke.spec.ts",
  "tests/browser/admin-readiness-billing-warning-settings-verification-return.smoke.spec.ts",
  "tests/browser/admin-readiness-billing-warning-settings-go-live-return.smoke.spec.ts",
] as const;

test("billing warning settings followup batch stays wired into scripts and docs", async () => {
  const webPackageJson = JSON.parse(await readFile(webPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const rootPackageJson = JSON.parse(await readFile(rootPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const docsReadme = await readFile(docsReadmePath, "utf8");
  const executionPlan = await readFile(executionPlanPath, "utf8");

  const prebuiltCommand = `node scripts/run-playwright-prebuilt-smoke.mjs ${specs.join(" ")}`;
  const existingCommand = `node scripts/run-playwright-existing-server-smoke.mjs ${specs.join(" ")}`;

  assert.equal(webPackageJson.scripts?.["test:browser:billing-warning-settings-followup"], prebuiltCommand);
  assert.equal(
    webPackageJson.scripts?.["test:browser:billing-warning-settings-followup:existing-server"],
    existingCommand,
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:billing-warning-settings-followup"],
    "npm --prefix web run test:browser:billing-warning-settings-followup --",
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:billing-warning-settings-followup:existing-server"],
    "npm --prefix web run test:browser:billing-warning-settings-followup:existing-server --",
  );

  assert.match(docsReadme, /web:test:browser:billing-warning-settings-followup/);
  assert.match(docsReadme, /billing_warning -> settings -> admin/);
  assert.match(docsReadme, /billing_warning -> settings -> verification -> admin/);
  assert.match(docsReadme, /billing_warning -> settings -> go-live -> admin/);
  assert.match(executionPlan, /billing-warning-settings-followup/);
  assert.match(executionPlan, /billing_warning -> settings -> go-live -> admin/);
});
