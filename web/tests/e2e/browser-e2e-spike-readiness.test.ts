import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");
const packageJsonPath = path.resolve(webDir, "package.json");
const probeScriptPath = path.resolve(webDir, "scripts/browser-e2e-spike.mjs");
const playwrightConfigPath = path.resolve(webDir, "playwright.config.ts");
const executionPlanPath = path.resolve(webDir, "../docs/saas_v1_execution_plan_zh.md");
const browserSmokeSpecPath = path.resolve(webDir, "tests/browser/launchpad-session-onboarding.smoke.spec.ts");

test("browser-e2e spike probe keeps executable readiness report aligned with current repo boundary", async () => {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const playwrightConfig = await readFile(playwrightConfigPath, "utf8");
  const executionPlan = await readFile(executionPlanPath, "utf8");
  const browserSmokeSpec = await readFile(browserSmokeSpecPath, "utf8");

  assert.equal(packageJson.scripts?.["test:browser:spike"], "node scripts/browser-e2e-spike.mjs");
  assert.equal(packageJson.scripts?.["test:browser:smoke"], "playwright test --config playwright.config.ts");
  assert.match(playwrightConfig, /const baseURL = process\.env\.PLAYWRIGHT_BASE_URL \?\? "http:\/\/127\.0\.0\.1:3005"/);
  assert.match(playwrightConfig, /const webServerCommand =/);
  assert.match(playwrightConfig, /process\.env\.PLAYWRIGHT_WEB_SERVER_COMMAND \?\?/);
  assert.match(playwrightConfig, /npm run build && npm run start -- --hostname 127\.0\.0\.1 --port 3005/);
  assert.match(playwrightConfig, /const webServerTimeout = Number\(process\.env\.PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS \?\? "240000"\)/);
  assert.match(playwrightConfig, /const reuseExistingServer =/);
  assert.match(playwrightConfig, /process\.env\.PLAYWRIGHT_REUSE_EXISTING_SERVER == null/);
  assert.match(playwrightConfig, /\?\s*false/);
  assert.match(playwrightConfig, /process\.env\.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1"/);
  assert.match(playwrightConfig, /command:\s*webServerCommand/);
  assert.match(playwrightConfig, /url:\s*baseURL/);
  assert.match(playwrightConfig, /timeout:\s*webServerTimeout/);
  assert.match(playwrightConfig, /reuseExistingServer,/);
  assert.match(packageJson.devDependencies?.["@playwright/test"] ?? "", /^\^?1\./);
  assert.match(executionPlan, /browser-e2e spike（後置但可先做最小基座）/);
  assert.match(executionPlan, /完整(?:\s*browser|瀏覽器)?\s*e2e[\s\S]{0,24}(?:尚未落地|仍後置)/);
  assert.match(
    browserSmokeSpec,
    /launchpad -> session -> onboarding -> usage -> settings -> verification -> go-live -> admin keeps minimal browser continuity/,
  );
  assert.match(browserSmokeSpec, /source=admin-readiness/);
  assert.match(browserSmokeSpec, /Step 5: Confirm usage window/);
  assert.match(browserSmokeSpec, /Review plan limits in Settings/);
  assert.match(browserSmokeSpec, /Capture verification evidence/);
  assert.match(browserSmokeSpec, /Week 8 launch checklist/);
  assert.match(browserSmokeSpec, /Continue to go-live drill/);
  assert.match(browserSmokeSpec, /surface=go_live/);
  assert.match(browserSmokeSpec, /Mock go-live drill/);
  assert.match(browserSmokeSpec, /Session-aware drill lane/);
  assert.match(browserSmokeSpec, /Return to admin readiness view/);
  assert.match(browserSmokeSpec, /readiness_returned=1/);
  assert.match(browserSmokeSpec, /Returned from Week 8 readiness/);

  const { stdout } = await execFileAsync("node", [probeScriptPath, "--json"], {
    cwd: webDir,
  });
  const report = JSON.parse(stdout) as {
    status: string;
    boundary: string;
    candidateRouteChain: string[];
    playwright: {
      directDependency: boolean;
      resolvable: boolean;
      configPresent: boolean;
      systemBrowserPresent: boolean;
      productionServerBacked: boolean;
    };
    browserSmoke: {
      specPresent: boolean;
      scriptPresent: boolean;
    };
    docs: {
      browserSpikePlanned: boolean;
      browserE2eStillPostponed: boolean;
    };
  };

  assert.equal(report.status, "ready");
  assert.equal(report.playwright.directDependency, true);
  assert.equal(report.playwright.resolvable, true);
  assert.equal(report.playwright.configPresent, true);
  assert.equal(report.playwright.systemBrowserPresent, true);
  assert.equal(report.playwright.productionServerBacked, true);
  assert.equal(report.browserSmoke.specPresent, true);
  assert.equal(report.browserSmoke.scriptPresent, true);
  assert.equal(report.docs.browserSpikePlanned, true);
  assert.equal(report.docs.browserE2eStillPostponed, true);
  assert.deepEqual(report.candidateRouteChain, [
    "/",
    "/session",
    "/onboarding",
    "/usage",
    "/settings",
    "/verification?surface=verification",
    "/go-live?surface=go_live",
    "/admin?readiness_returned=1",
  ]);
  assert.match(report.boundary, /one minimal true browser smoke added/i);
  assert.match(
    report.boundary,
    /launchpad -> session -> onboarding -> usage -> settings -> verification -> go-live -> admin/i,
  );
  assert.match(report.boundary, /does not claim full browser e2e is complete/i);
});
