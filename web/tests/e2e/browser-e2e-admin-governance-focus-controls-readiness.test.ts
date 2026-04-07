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
  "tests/browser/admin-focus-chip-clear.smoke.spec.ts",
  "tests/browser/admin-organization-focus-return.smoke.spec.ts",
  "tests/browser/admin-readiness-chip-toggle.smoke.spec.ts",
] as const;

test("admin governance focus controls batch stays wired into scripts and docs", async () => {
  const webPackageJson = JSON.parse(await readFile(webPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const rootPackageJson = JSON.parse(await readFile(rootPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const docsReadme = await readFile(docsReadmePath, "utf8");
  const executionPlan = await readFile(executionPlanPath, "utf8");

  const expectedMain = `node scripts/run-playwright-prebuilt-smoke.mjs ${specs.join(" ")}`;
  const expectedExisting = `node scripts/run-playwright-existing-server-smoke.mjs ${specs.join(" ")}`;

  assert.equal(
    webPackageJson.scripts?.["test:browser:admin-governance-focus-controls"],
    expectedMain,
  );
  assert.equal(
    webPackageJson.scripts?.["test:browser:admin-governance-focus-controls:existing-server"],
    expectedExisting,
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:admin-governance-focus-controls"],
    "npm --prefix web run test:browser:admin-governance-focus-controls --",
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:admin-governance-focus-controls:existing-server"],
    "npm --prefix web run test:browser:admin-governance-focus-controls:existing-server --",
  );

  assert.match(docsReadme, /web:test:browser:admin-governance-focus-controls/);
  assert.match(docsReadme, /focus chips clear one dimension at a time/);
  assert.match(docsReadme, /organization focus branch -> verification -> admin/);
  assert.match(docsReadme, /readiness chip clear\/toggle/);

  assert.match(executionPlan, /admin governance focus controls/);
  assert.match(executionPlan, /organization focus branch -> verification -> admin/);
  assert.match(executionPlan, /focus chips clear one dimension at a time/);
});
