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
  "tests/browser/admin-attention-queue-return.smoke.spec.ts",
  "tests/browser/admin-attention-verification-go-live-return.smoke.spec.ts",
  "tests/browser/admin-recent-activity-verification-return.smoke.spec.ts",
  "tests/browser/admin-recent-activity-verification-go-live-return.smoke.spec.ts",
] as const;

test("admin attention / recent activity follow-up batch stays wired into scripts and docs", async () => {
  const webPackageJson = JSON.parse(await readFile(webPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const rootPackageJson = JSON.parse(await readFile(rootPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const docsReadme = await readFile(docsReadmePath, "utf8");
  const executionPlan = await readFile(executionPlanPath, "utf8");

  const expectedPrebuilt = `node scripts/run-playwright-prebuilt-smoke.mjs ${specs.join(" ")}`;
  const expectedExisting = `node scripts/run-playwright-existing-server-smoke.mjs ${specs.join(" ")}`;

  assert.equal(
    webPackageJson.scripts?.["test:browser:admin-attention-recent-activity-followup"],
    expectedPrebuilt,
  );
  assert.equal(
    webPackageJson.scripts?.["test:browser:admin-attention-recent-activity-followup:existing-server"],
    expectedExisting,
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:admin-attention-recent-activity-followup"],
    "npm --prefix web run test:browser:admin-attention-recent-activity-followup --",
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:admin-attention-recent-activity-followup:existing-server"],
    "npm --prefix web run test:browser:admin-attention-recent-activity-followup:existing-server --",
  );

  assert.match(docsReadme, /web:test:browser:admin-attention-recent-activity-followup/);
  assert.match(docsReadme, /admin attention -> verification -> admin/);
  assert.match(docsReadme, /admin recent delivery activity -> verification -> go-live -> admin/);
  assert.match(executionPlan, /admin-attention-recent-activity-followup/);
  assert.match(executionPlan, /admin attention -> verification -> admin/);
  assert.match(executionPlan, /admin recent delivery activity -> verification -> go-live -> admin/);
});
