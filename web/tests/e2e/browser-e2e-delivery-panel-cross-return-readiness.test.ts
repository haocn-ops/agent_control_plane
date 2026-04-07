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
  "tests/browser/go-live-delivery-admin-return.smoke.spec.ts",
  "tests/browser/verification-delivery-admin-return.smoke.spec.ts",
] as const;

test("delivery-panel cross return batch stays wired into scripts and docs", async () => {
  const webPackageJson = JSON.parse(await readFile(webPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const rootPackageJson = JSON.parse(await readFile(rootPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const docsReadme = await readFile(docsReadmePath, "utf8");
  const executionPlan = await readFile(executionPlanPath, "utf8");

  assert.equal(
    webPackageJson.scripts?.["test:browser:delivery-panel-cross-return"],
    `node scripts/run-playwright-prebuilt-smoke.mjs ${specs.join(" ")}`,
  );
  assert.equal(
    webPackageJson.scripts?.["test:browser:delivery-panel-cross-return:existing-server"],
    `node scripts/run-playwright-existing-server-smoke.mjs ${specs.join(" ")}`,
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:delivery-panel-cross-return"],
    "npm --prefix web run test:browser:delivery-panel-cross-return --",
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:delivery-panel-cross-return:existing-server"],
    "npm --prefix web run test:browser:delivery-panel-cross-return:existing-server --",
  );

  assert.match(docsReadme, /web:test:browser:delivery-panel-cross-return/);
  assert.match(docsReadme, /go-live -> delivery -> admin/);
  assert.match(docsReadme, /verification -> delivery -> admin/);
  assert.match(executionPlan, /delivery-panel cross return/);
  assert.match(executionPlan, /go-live -> delivery -> admin/);
});
