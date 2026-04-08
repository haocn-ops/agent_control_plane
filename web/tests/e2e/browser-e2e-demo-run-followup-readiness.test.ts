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
  "tests/browser/admin-readiness-demo-run-verification-return.smoke.spec.ts",
  "tests/browser/admin-readiness-demo-run-verification-go-live-return.smoke.spec.ts",
  "tests/browser/admin-readiness-demo-run-verification-go-live-usage-return.smoke.spec.ts",
  "tests/browser/admin-readiness-demo-run-verification-go-live-artifacts-return.smoke.spec.ts",
  "tests/browser/admin-readiness-demo-run-verification-go-live-playground-return.smoke.spec.ts",
  "tests/browser/admin-readiness-demo-run-verification-go-live-verification-return.smoke.spec.ts",
  "tests/browser/admin-readiness-demo-run-verification-go-live-verification-settings-return.smoke.spec.ts",
] as const;

const smokeExpectations = [
  {
    path: "tests/browser/admin-readiness-demo-run-verification-return.smoke.spec.ts",
    requiredPatterns: [
      /admin readiness demo-run branch -> verification -> admin keeps readiness browser continuity/,
      /admin\?week8_focus=demo_run&attention_organization=org_preview&attention_workspace=preview/,
      /SaaS admin overview/,
      /Governance focus/,
      /Demo run/,
      /Preview Organization/,
      /Preview Workspace/,
      /Week 8 readiness summary/,
      /Drill-down active: Demo run/,
      /Open Week 8 checklist/,
      /verification\?/,
      /surface=verification/,
      /source=admin-readiness/,
      /week8_focus=demo_run/,
      /attention_workspace=preview/,
      /attention_organization=org_preview/,
      /Week 8 launch checklist/,
      /Admin follow-up context/,
      /Focus Demo run/,
      /Verification evidence lane/,
      /Return to admin readiness view/,
      /\/admin\?/,
      /readiness_returned=1/,
      /Returned from Week 8 readiness/,
      /Focus restored/,
      /Clear readiness focus/,
    ],
  },
  {
    path: "tests/browser/admin-readiness-demo-run-verification-go-live-return.smoke.spec.ts",
    requiredPatterns: [
      /admin readiness demo-run branch -> verification -> go-live -> admin keeps readiness browser continuity/,
      /admin\?week8_focus=demo_run&attention_organization=org_preview&attention_workspace=preview/,
      /SaaS admin overview/,
      /Governance focus/,
      /Demo run/,
      /Preview Organization/,
      /Preview Workspace/,
      /Week 8 readiness summary/,
      /Drill-down active: Demo run/,
      /Open Week 8 checklist/,
      /verification\?/,
      /surface=verification/,
      /source=admin-readiness/,
      /week8_focus=demo_run/,
      /attention_workspace=preview/,
      /attention_organization=org_preview/,
      /Week 8 launch checklist/,
      /Admin follow-up context/,
      /Focus Demo run/,
      /Continue to go-live drill/,
      /go-live\?/,
      /surface=go_live/,
      /Mock go-live drill/,
      /Return to admin readiness view/,
      /admin\?/,
      /readiness_returned=1/,
      /Returned from Week 8 readiness/,
      /Focus restored/,
      /Clear readiness focus/,
    ],
  },
  {
    path: "tests/browser/admin-readiness-demo-run-verification-go-live-usage-return.smoke.spec.ts",
    requiredPatterns: [
      /admin readiness demo-run branch -> verification -> go-live -> usage -> admin keeps readiness browser continuity/,
      /\/admin\?week8_focus=demo_run&attention_organization=org_preview&attention_workspace=preview/,
      /SaaS admin overview/,
      /Governance focus/,
      /Demo run/,
      /Preview Organization/,
      /Preview Workspace/,
      /Week 8 readiness summary/,
      /Drill-down active: Demo run/,
      /Open Week 8 checklist/,
      /\/verification\\\?/,
      /surface=verification/,
      /source=admin-readiness/,
      /week8_focus=demo_run/,
      /attention_workspace=preview/,
      /attention_organization=org_preview/,
      /Week 8 launch checklist/,
      /Admin follow-up context/,
      /Focus Demo run/,
      /Continue to go-live drill/,
      /\/go-live\\\?/,
      /surface=go_live/,
      /Mock go-live drill/,
      /Confirm usage posture/,
      /\/usage\\\?/,
      /Workspace usage and plan posture/,
      /Return to admin readiness view/,
      /admin\?/,
      /readiness_returned=1/,
      /Returned from Week 8 readiness/,
      /Focus restored/,
      /Clear readiness focus/,
    ],
  },
  {
    path: "tests/browser/admin-readiness-demo-run-verification-go-live-artifacts-return.smoke.spec.ts",
    requiredPatterns: [
      /admin readiness demo-run branch -> verification -> go-live -> artifacts -> admin keeps readiness browser continuity/,
      /\/admin\?week8_focus=demo_run&attention_organization=org_preview&attention_workspace=preview/,
      /SaaS admin overview/,
      /Governance focus/,
      /Demo run/,
      /Preview Organization/,
      /Preview Workspace/,
      /Week 8 readiness summary/,
      /Drill-down active: Demo run/,
      /Open Week 8 checklist/,
      /\/verification\\\?/,
      /surface=verification/,
      /source=admin-readiness/,
      /week8_focus=demo_run/,
      /attention_workspace=preview/,
      /attention_organization=org_preview/,
      /Week 8 launch checklist/,
      /Admin follow-up context/,
      /Focus Demo run/,
      /Continue to go-live drill/,
      /\/go-live\\\?/,
      /surface=go_live/,
      /Mock go-live drill/,
      /Inspect artifacts evidence/,
      /\/artifacts\\\?/,
      /Generated output and evidence/,
      /Return to admin readiness view/,
      /\/admin\?/,
      /readiness_returned=1/,
      /Returned from Week 8 readiness/,
      /Focus restored/,
      /Clear readiness focus/,
    ],
  },
  {
    path: "tests/browser/admin-readiness-demo-run-verification-go-live-playground-return.smoke.spec.ts",
    requiredPatterns: [
      /admin readiness demo-run branch -> verification -> go-live -> playground -> admin keeps readiness browser continuity/,
      /\/admin\?week8_focus=demo_run&attention_organization=org_preview&attention_workspace=preview/,
      /SaaS admin overview/,
      /Governance focus/,
      /Demo run/,
      /Preview Organization/,
      /Preview Workspace/,
      /Week 8 readiness summary/,
      /Drill-down active: Demo run/,
      /Open Week 8 checklist/,
      /\/verification\\\?/,
      /surface=verification/,
      /source=admin-readiness/,
      /week8_focus=demo_run/,
      /attention_workspace=preview/,
      /attention_organization=org_preview/,
      /Week 8 launch checklist/,
      /Admin follow-up context/,
      /Focus Demo run/,
      /Continue to go-live drill/,
      /\/go-live\\\?/,
      /surface=go_live/,
      /Mock go-live drill/,
      /Revisit playground run/,
      /\/playground\\\?/,
      /Prompt, invoke, inspect/,
      /Return to admin readiness view/,
      /\/admin\?/,
      /readiness_returned=1/,
      /Returned from Week 8 readiness/,
      /Focus restored/,
      /Clear readiness focus/,
    ],
  },
  {
    path: "tests/browser/admin-readiness-demo-run-verification-go-live-verification-return.smoke.spec.ts",
    requiredPatterns: [
      /admin readiness demo-run branch -> verification -> go-live -> verification -> admin keeps readiness browser continuity/,
      /\/admin\?week8_focus=demo_run&attention_organization=org_preview&attention_workspace=preview/,
      /SaaS admin overview/,
      /Governance focus/,
      /Demo run/,
      /Preview Organization/,
      /Preview Workspace/,
      /Week 8 readiness summary/,
      /Drill-down active: Demo run/,
      /Open Week 8 checklist/,
      /\/verification\\\?/,
      /surface=verification/,
      /source=admin-readiness/,
      /week8_focus=demo_run/,
      /attention_workspace=preview/,
      /attention_organization=org_preview/,
      /Week 8 launch checklist/,
      /Admin follow-up context/,
      /Focus Demo run/,
      /Continue to go-live drill/,
      /\/go-live\\\?/,
      /surface=go_live/,
      /Mock go-live drill/,
      /Reopen verification evidence/,
      /\/verification\\\?/,
      /Return to admin readiness view/,
      /\/admin\?/,
      /readiness_returned=1/,
      /Returned from Week 8 readiness/,
      /Focus restored/,
      /Clear readiness focus/,
    ],
  },
  {
    path: "tests/browser/admin-readiness-demo-run-verification-go-live-verification-settings-return.smoke.spec.ts",
    requiredPatterns: [
      /admin readiness demo-run branch -> verification -> go-live -> verification -> settings -> admin keeps readiness browser continuity/,
      /\/admin\?week8_focus=demo_run&attention_organization=org_preview&attention_workspace=preview/,
      /SaaS admin overview/,
      /Governance focus/,
      /Demo run/,
      /Preview Organization/,
      /Preview Workspace/,
      /Week 8 readiness summary/,
      /Drill-down active: Demo run/,
      /Open Week 8 checklist/,
      /\/verification\\\?/,
      /surface=verification/,
      /source=admin-readiness/,
      /week8_focus=demo_run/,
      /attention_workspace=preview/,
      /attention_organization=org_preview/,
      /Week 8 launch checklist/,
      /Admin follow-up context/,
      /Focus Demo run/,
      /Continue to go-live drill/,
      /\/go-live\\\?/,
      /surface=go_live/,
      /Mock go-live drill/,
      /Reopen verification evidence/,
      /\/verification\\\?/,
      /Review settings \+ billing/,
      /\/settings\\\?/,
      /intent=manage-plan/,
      /Workspace configuration/,
      /Admin follow-up context/,
      /Focus Demo run/,
      /Return to admin readiness view/,
      /\/admin\?/,
      /readiness_returned=1/,
      /Returned from Week 8 readiness/,
      /Focus restored/,
      /Clear readiness focus/,
    ],
  },
] as const;

test("demo-run follow-up browser batch stays wired into scripts and docs", async () => {
  const webPackageJson = JSON.parse(await readFile(webPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const rootPackageJson = JSON.parse(await readFile(rootPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const docsReadme = await readFile(docsReadmePath, "utf8");
  const executionPlan = await readFile(executionPlanPath, "utf8");

  assert.equal(
    webPackageJson.scripts?.["test:browser:demo-run-followup"],
    `node scripts/run-playwright-prebuilt-smoke.mjs ${specs.join(" ")}`,
  );
  assert.equal(
    webPackageJson.scripts?.["test:browser:demo-run-followup:existing-server"],
    `node scripts/run-playwright-existing-server-smoke.mjs ${specs.join(" ")}`,
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:demo-run-followup"],
    "npm --prefix web run test:browser:demo-run-followup --",
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:demo-run-followup:existing-server"],
    "npm --prefix web run test:browser:demo-run-followup:existing-server --",
  );

  assert.match(docsReadme, /web:test:browser:demo-run-followup/);
  assert.match(docsReadme, /demo_run -> verification -> go-live -> admin/);
  assert.match(docsReadme, /demo_run -> verification -> go-live -> verification -> admin/);
  assert.match(docsReadme, /demo_run -> verification -> go-live -> verification -> settings -> admin/);
  assert.match(executionPlan, /demo-run-followup/);
  assert.match(executionPlan, /admin readiness demo-run branch/);
});

for (const spec of smokeExpectations) {
  test(`demo-run follow-up smoke keeps ${spec.path} explicit without overstating coverage`, async () => {
    const source = await readFile(path.resolve(webDir, spec.path), "utf8");

    for (const pattern of spec.requiredPatterns) {
      assert.match(source, pattern);
    }
  });
}
