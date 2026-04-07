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

const verificationSpecs = [
  {
    path: "tests/browser/agents-verification-admin-return.smoke.spec.ts",
    title: "Agent lifecycle management",
    action: "Carry proof to verification",
  },
  {
    path: "tests/browser/api-keys-verification-admin-return.smoke.spec.ts",
    title: "Credential lifecycle",
    action: "Step 5: Record verification evidence",
  },
  {
    path: "tests/browser/artifacts-verification-admin-return.smoke.spec.ts",
    title: "Generated output and evidence",
    action: "Confirm verification evidence",
  },
  {
    path: "tests/browser/egress-verification-admin-return.smoke.spec.ts",
    title: "Outbound permission control",
    action: "Continue verification evidence",
    requiresAdminFollowUpText: false,
  },
  {
    path: "tests/browser/logs-verification-admin-return.smoke.spec.ts",
    title: "Realtime and historical logs",
    action: "Carry proof to verification",
  },
  {
    path: "tests/browser/playground-verification-admin-return.smoke.spec.ts",
    title: "Prompt, invoke, inspect",
    action: "Capture verification evidence",
  },
  {
    path: "tests/browser/service-accounts-verification-admin-return.smoke.spec.ts",
    title: "Machine identities",
    action: "Step 5: Capture verification evidence",
  },
  {
    path: "tests/browser/tasks-verification-admin-return.smoke.spec.ts",
    title: "Execution tracking",
    action: "Continue verification evidence",
    extraPattern: /run_id=run_demo_123/,
  },
];

const goLiveSpecs = [
  "tests/browser/agents-verification-go-live-admin-return.smoke.spec.ts",
  "tests/browser/api-keys-verification-go-live-admin-return.smoke.spec.ts",
  "tests/browser/artifacts-verification-go-live-admin-return.smoke.spec.ts",
  "tests/browser/egress-verification-go-live-admin-return.smoke.spec.ts",
  "tests/browser/logs-verification-go-live-admin-return.smoke.spec.ts",
  "tests/browser/playground-verification-go-live-admin-return.smoke.spec.ts",
  "tests/browser/service-accounts-verification-go-live-admin-return.smoke.spec.ts",
  "tests/browser/tasks-verification-go-live-admin-return.smoke.spec.ts",
];

test("secondary console focused browser batches stay wired into scripts and docs", async () => {
  const webPackageJson = JSON.parse(await readFile(webPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const rootPackageJson = JSON.parse(await readFile(rootPackageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const docsReadme = await readFile(docsReadmePath, "utf8");
  const executionPlan = await readFile(executionPlanPath, "utf8");

  assert.equal(
    webPackageJson.scripts?.["test:browser:secondary-console-verification"],
    "node scripts/run-playwright-prebuilt-smoke.mjs tests/browser/agents-verification-admin-return.smoke.spec.ts tests/browser/api-keys-verification-admin-return.smoke.spec.ts tests/browser/artifacts-verification-admin-return.smoke.spec.ts tests/browser/egress-verification-admin-return.smoke.spec.ts tests/browser/logs-verification-admin-return.smoke.spec.ts tests/browser/playground-verification-admin-return.smoke.spec.ts tests/browser/service-accounts-verification-admin-return.smoke.spec.ts tests/browser/tasks-verification-admin-return.smoke.spec.ts",
  );
  assert.equal(
    webPackageJson.scripts?.["test:browser:secondary-console-verification:existing-server"],
    "node scripts/run-playwright-existing-server-smoke.mjs tests/browser/agents-verification-admin-return.smoke.spec.ts tests/browser/api-keys-verification-admin-return.smoke.spec.ts tests/browser/artifacts-verification-admin-return.smoke.spec.ts tests/browser/egress-verification-admin-return.smoke.spec.ts tests/browser/logs-verification-admin-return.smoke.spec.ts tests/browser/playground-verification-admin-return.smoke.spec.ts tests/browser/service-accounts-verification-admin-return.smoke.spec.ts tests/browser/tasks-verification-admin-return.smoke.spec.ts",
  );
  assert.equal(
    webPackageJson.scripts?.["test:browser:secondary-console-go-live"],
    "node scripts/run-playwright-prebuilt-smoke.mjs tests/browser/agents-verification-go-live-admin-return.smoke.spec.ts tests/browser/api-keys-verification-go-live-admin-return.smoke.spec.ts tests/browser/artifacts-verification-go-live-admin-return.smoke.spec.ts tests/browser/egress-verification-go-live-admin-return.smoke.spec.ts tests/browser/logs-verification-go-live-admin-return.smoke.spec.ts tests/browser/playground-verification-go-live-admin-return.smoke.spec.ts tests/browser/service-accounts-verification-go-live-admin-return.smoke.spec.ts tests/browser/tasks-verification-go-live-admin-return.smoke.spec.ts",
  );
  assert.equal(
    webPackageJson.scripts?.["test:browser:secondary-console-go-live:existing-server"],
    "node scripts/run-playwright-existing-server-smoke.mjs tests/browser/agents-verification-go-live-admin-return.smoke.spec.ts tests/browser/api-keys-verification-go-live-admin-return.smoke.spec.ts tests/browser/artifacts-verification-go-live-admin-return.smoke.spec.ts tests/browser/egress-verification-go-live-admin-return.smoke.spec.ts tests/browser/logs-verification-go-live-admin-return.smoke.spec.ts tests/browser/playground-verification-go-live-admin-return.smoke.spec.ts tests/browser/service-accounts-verification-go-live-admin-return.smoke.spec.ts tests/browser/tasks-verification-go-live-admin-return.smoke.spec.ts",
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:secondary-console-verification"],
    "npm --prefix web run test:browser:secondary-console-verification --",
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:secondary-console-verification:existing-server"],
    "npm --prefix web run test:browser:secondary-console-verification:existing-server --",
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:secondary-console-go-live"],
    "npm --prefix web run test:browser:secondary-console-go-live --",
  );
  assert.equal(
    rootPackageJson.scripts?.["web:test:browser:secondary-console-go-live:existing-server"],
    "npm --prefix web run test:browser:secondary-console-go-live:existing-server --",
  );

  assert.match(docsReadme, /web:test:browser:secondary-console-verification/);
  assert.match(docsReadme, /web:test:browser:secondary-console-go-live/);
  assert.match(docsReadme, /agents \/ api-keys \/ artifacts \/ egress \/ logs \/ playground \/ service-accounts \/ tasks/);
  assert.match(executionPlan, /secondary-console-verification/);
  assert.match(executionPlan, /secondary-console-go-live/);
  assert.match(executionPlan, /agents \/ api-keys \/ artifacts \/ egress \/ logs \/ playground \/ service-accounts \/ tasks/);
});

for (const spec of verificationSpecs) {
  test(`secondary console verification smoke keeps ${spec.path} explicit without overstating coverage`, async () => {
    const source = await readFile(path.resolve(webDir, spec.path), "utf8");

    assert.match(source, /source=admin-readiness/);
    assert.match(source, /week8_focus=credentials/);
    assert.match(source, /attention_workspace=/);
    assert.match(source, /attention_organization=/);
    assert.match(source, /recent_track_key=verification/);
    assert.match(source, /recent_update_kind=verification/);
    assert.match(source, /evidence_count=\d+/);
    assert.match(source, /recent_owner_display_name=/);
    assert.match(source, /recent_owner_email=/);
    assert.match(source, new RegExp(spec.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(source, new RegExp(spec.action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(source, /Week 8 launch checklist/);
    if (spec.requiresAdminFollowUpText !== false) {
      assert.match(source, /Admin follow-up context/);
    }
    assert.match(source, /Return to admin readiness view/);
    assert.match(source, /readiness_returned=1/);
    assert.match(source, /Returned from Week 8 readiness/);
    if (spec.extraPattern) {
      assert.match(source, spec.extraPattern);
    }
  });
}

for (const specPath of goLiveSpecs) {
  test(`secondary console go-live smoke keeps ${specPath} explicit without overstating coverage`, async () => {
    const source = await readFile(path.resolve(webDir, specPath), "utf8");

    assert.match(source, /source=admin-readiness/);
    assert.match(source, /week8_focus=credentials/);
    assert.match(source, /attention_workspace=/);
    assert.match(source, /attention_organization=/);
    assert.match(source, /recent_track_key=verification/);
    assert.match(source, /recent_update_kind=verification/);
    assert.match(source, /evidence_count=\d+/);
    assert.match(source, /recent_owner_display_name=/);
    assert.match(source, /recent_owner_email=/);
    assert.match(source, /Week 8 launch checklist/);
    assert.match(source, /Continue to go-live drill/);
    assert.match(source, /surface=go_live/);
    assert.match(source, /Mock go-live drill/);
    assert.match(source, /Return to admin readiness view/);
    assert.match(source, /readiness_returned=1/);
    assert.match(source, /Returned from Week 8 readiness/);
  });
}
