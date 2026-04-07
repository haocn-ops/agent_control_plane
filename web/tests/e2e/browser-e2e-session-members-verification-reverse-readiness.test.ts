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
  "tests/browser/session-members-verification-settings-verification-admin-return.smoke.spec.ts",
  "tests/browser/launchpad-session-members-verification-settings-verification-admin-return.smoke.spec.ts",
  "tests/browser/session-members-verification-settings-verification-go-live-admin-return.smoke.spec.ts",
  "tests/browser/launchpad-session-members-verification-settings-verification-go-live-admin-return.smoke.spec.ts",
] as const;

test("session/launchpad members reverse verification re-entry batch stays wired into scripts and docs", async () => {
  const webPackageJson = JSON.parse(await readFile(webPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const rootPackageJson = JSON.parse(await readFile(rootPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const docsReadme = await readFile(docsReadmePath, "utf8");
  const executionPlan = await readFile(executionPlanPath, "utf8");

  assert.equal(
    webPackageJson.scripts?.["test:browser:session-members-verification-reentry"],
    `node scripts/run-playwright-prebuilt-smoke.mjs ${specs.join(" ")}`,
  );
  assert.equal(
    webPackageJson.scripts?.["test:browser:session-members-verification-reentry:existing-server"],
    `node scripts/run-playwright-existing-server-smoke.mjs ${specs.join(" ")}`,
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:session-members-verification-reentry"],
    "npm --prefix web run test:browser:session-members-verification-reentry --",
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:session-members-verification-reentry:existing-server"],
    "npm --prefix web run test:browser:session-members-verification-reentry:existing-server --",
  );

  assert.match(docsReadme, /session -> members -> verification -> settings -> verification -> admin/);
  assert.match(docsReadme, /launchpad -> session -> members -> verification -> settings -> verification -> go-live -> admin/);
  assert.match(executionPlan, /launchpad -> session -> members -> verification -> settings -> verification -> admin/);
});
