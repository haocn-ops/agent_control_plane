import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");

type VerificationReadinessCase = {
  label: string;
  specPath: string;
  titlePattern: RegExp;
  entryPathPattern: RegExp;
  surfaceHeadingPattern: RegExp;
  continuityHeadingPattern: RegExp;
  verificationCtaPattern: RegExp;
  attentionWorkspacePattern?: RegExp;
  attentionOrganizationPattern?: RegExp;
  evidenceCountPattern?: RegExp;
  ownerDisplayPattern?: RegExp;
  ownerEmailPattern?: RegExp;
  adminFollowUpPattern?: RegExp;
  deliveryContextPattern?: RegExp;
  runIdPattern?: RegExp;
  expectsFocusRestored?: boolean;
};

const verificationCases: VerificationReadinessCase[] = [
  {
    label: "agents",
    specPath: "tests/browser/agents-verification-admin-return.smoke.spec.ts",
    titlePattern: /agents -> verification -> admin keeps readiness return continuity/,
    entryPathPattern: /\/agents\?source=admin-readiness/,
    surfaceHeadingPattern: /Agent lifecycle management/,
    continuityHeadingPattern: /Governance continuity/,
    verificationCtaPattern: /Carry proof to verification/,
    adminFollowUpPattern: /Admin follow-up context/,
    expectsFocusRestored: true,
  },
  {
    label: "api-keys",
    specPath: "tests/browser/api-keys-verification-admin-return.smoke.spec.ts",
    titlePattern: /api-keys -> verification -> admin keeps readiness return continuity/,
    entryPathPattern: /\/api-keys\?source=admin-readiness/,
    surfaceHeadingPattern: /Credential lifecycle/,
    continuityHeadingPattern: /Audit export continuity/,
    verificationCtaPattern: /Step 5: Record verification evidence/,
    adminFollowUpPattern: /Admin follow-up context/,
    expectsFocusRestored: true,
  },
  {
    label: "artifacts",
    specPath: "tests/browser/artifacts-verification-admin-return.smoke.spec.ts",
    titlePattern: /artifacts -> verification -> admin keeps readiness return continuity/,
    entryPathPattern: /\/artifacts\?source=admin-readiness/,
    surfaceHeadingPattern: /Generated output and evidence/,
    continuityHeadingPattern: /Audit export continuity/,
    verificationCtaPattern: /Confirm verification evidence/,
    adminFollowUpPattern: /Admin follow-up context/,
    expectsFocusRestored: true,
  },
  {
    label: "egress",
    specPath: "tests/browser/egress-verification-admin-return.smoke.spec.ts",
    titlePattern: /egress -> verification -> admin keeps readiness return continuity/,
    entryPathPattern: /\/egress\?source=admin-readiness/,
    surfaceHeadingPattern: /Outbound permission control/,
    continuityHeadingPattern: /Audit export continuity/,
    verificationCtaPattern: /Continue verification evidence/,
    attentionWorkspacePattern: /toHaveURL\(\/attention_workspace=egress-demo\/\)/,
    attentionOrganizationPattern: /toHaveURL\(\/attention_organization=org_egress\/\)/,
    evidenceCountPattern: /toHaveURL\(\/evidence_count=1\/\)/,
    ownerDisplayPattern: /toHaveURL\(\/recent_owner_display_name=Egress\(\?:\\\+\|%20\)Operator\/\)/,
    ownerEmailPattern: /toHaveURL\(\/recent_owner_email=egress\\\.operator\(\?:%40\|@\)govrail\\\.test\/\)/,
    adminFollowUpPattern: /Navigation-only manual relay/,
    expectsFocusRestored: true,
  },
  {
    label: "logs",
    specPath: "tests/browser/logs-verification-admin-return.smoke.spec.ts",
    titlePattern: /logs -> verification -> admin keeps readiness return continuity/,
    entryPathPattern: /\/logs\?source=admin-readiness/,
    surfaceHeadingPattern: /Realtime and historical logs/,
    continuityHeadingPattern: /Audit export continuity/,
    verificationCtaPattern: /Carry proof to verification/,
    adminFollowUpPattern: /Admin follow-up context/,
    expectsFocusRestored: true,
  },
  {
    label: "playground",
    specPath: "tests/browser/playground-verification-admin-return.smoke.spec.ts",
    titlePattern: /playground -> verification -> admin keeps readiness return continuity/,
    entryPathPattern: /\/playground\?source=admin-readiness/,
    surfaceHeadingPattern: /Prompt, invoke, inspect/,
    continuityHeadingPattern: /Plan-limit checkpoint/,
    verificationCtaPattern: /Capture verification evidence/,
    adminFollowUpPattern: /Admin follow-up context/,
    expectsFocusRestored: true,
  },
  {
    label: "service-accounts",
    specPath: "tests/browser/service-accounts-verification-admin-return.smoke.spec.ts",
    titlePattern: /service-accounts -> verification -> admin keeps readiness return continuity/,
    entryPathPattern: /\/service-accounts\?source=admin-readiness/,
    surfaceHeadingPattern: /Machine identities/,
    continuityHeadingPattern: /Audit export continuity/,
    verificationCtaPattern: /Step 5: Capture verification evidence/,
    adminFollowUpPattern: /Admin follow-up context/,
    expectsFocusRestored: true,
  },
  {
    label: "settings",
    specPath: "tests/browser/settings-verification-admin-return.smoke.spec.ts",
    titlePattern: /settings -> verification -> admin keeps handoff continuity/,
    entryPathPattern: /\/settings\?source=admin-readiness/,
    surfaceHeadingPattern: /Workspace configuration/,
    continuityHeadingPattern: /Enterprise evidence lane/,
    verificationCtaPattern: /Capture verification evidence/,
    adminFollowUpPattern: /Admin follow-up context/,
    deliveryContextPattern: /delivery_context=recent_activity/,
  },
  {
    label: "tasks",
    specPath: "tests/browser/tasks-verification-admin-return.smoke.spec.ts",
    titlePattern: /tasks -> verification -> admin keeps readiness return continuity/,
    entryPathPattern: /\/tasks\?source=admin-readiness/,
    surfaceHeadingPattern: /Execution tracking/,
    continuityHeadingPattern: /Audit export continuity/,
    verificationCtaPattern: /Continue verification evidence/,
    adminFollowUpPattern: /Admin follow-up context/,
    runIdPattern: /run_id=run_demo_123/,
    expectsFocusRestored: true,
  },
  {
    label: "usage",
    specPath: "tests/browser/usage-verification-admin-return.smoke.spec.ts",
    titlePattern: /usage -> verification -> admin keeps readiness return continuity/,
    entryPathPattern: /\/usage\?source=admin-readiness/,
    surfaceHeadingPattern: /Workspace usage and plan posture/,
    continuityHeadingPattern: /Evidence loop follow-through/,
    verificationCtaPattern: /Refresh verification notes/,
    adminFollowUpPattern: /Admin follow-up context/,
    expectsFocusRestored: true,
  },
];

for (const readinessCase of verificationCases) {
  test(`browser readiness ${readinessCase.label} verification->admin smoke keeps console continuity explicit`, async () => {
    const browserSmokeSpec = await readFile(path.resolve(webDir, readinessCase.specPath), "utf8");

    assert.match(browserSmokeSpec, readinessCase.titlePattern);
    assert.match(browserSmokeSpec, readinessCase.entryPathPattern);
    assert.match(browserSmokeSpec, readinessCase.surfaceHeadingPattern);
    assert.match(browserSmokeSpec, readinessCase.adminFollowUpPattern ?? /Admin follow-up context/);
    assert.match(browserSmokeSpec, readinessCase.continuityHeadingPattern);
    assert.match(browserSmokeSpec, readinessCase.verificationCtaPattern);
    assert.match(browserSmokeSpec, /toHaveURL\(\/\\\/verification\\\?\/\)/);
    assert.match(browserSmokeSpec, /toHaveURL\(\/surface=verification\/\)/);
    assert.match(browserSmokeSpec, /toHaveURL\(\/source=admin-readiness\/\)/);
    assert.match(browserSmokeSpec, /toHaveURL\(\/week8_focus=credentials\/\)/);
    assert.match(
      browserSmokeSpec,
      readinessCase.attentionWorkspacePattern ?? /toHaveURL\(\/attention_workspace=preview\/\)/,
    );
    assert.match(
      browserSmokeSpec,
      readinessCase.attentionOrganizationPattern ?? /toHaveURL\(\/attention_organization=org_preview\/\)/,
    );
    assert.match(browserSmokeSpec, /toHaveURL\(\/recent_update_kind=verification\/\)/);
    assert.match(
      browserSmokeSpec,
      readinessCase.evidenceCountPattern ?? /toHaveURL\(\/evidence_count=2\/\)/,
    );
    assert.match(
      browserSmokeSpec,
      readinessCase.ownerDisplayPattern ??
        /toHaveURL\(\/recent_owner_display_name=Avery\(\?:\\\+\|%20\)Ops\/\)/,
    );
    assert.match(
      browserSmokeSpec,
      readinessCase.ownerEmailPattern ??
        /toHaveURL\(\/recent_owner_email=avery\\\.ops\(\?:%40\|@\)govrail\\\.test\/\)/,
    );
    assert.match(browserSmokeSpec, /Week 8 launch checklist/);
    assert.match(browserSmokeSpec, /Verification evidence lane/);
    assert.match(browserSmokeSpec, /Return to admin readiness view/);
    assert.match(browserSmokeSpec, /readiness_returned=1/);
    assert.match(browserSmokeSpec, /Returned from Week 8 readiness/);

    if (readinessCase.deliveryContextPattern) {
      assert.match(browserSmokeSpec, readinessCase.deliveryContextPattern);
    }

    if (readinessCase.runIdPattern) {
      assert.match(browserSmokeSpec, readinessCase.runIdPattern);
    }

    if (readinessCase.expectsFocusRestored) {
      assert.match(browserSmokeSpec, /Focus restored/);
      assert.match(browserSmokeSpec, /Clear readiness focus/);
    }
  });
}
