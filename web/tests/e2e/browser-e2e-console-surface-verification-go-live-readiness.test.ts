import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");

type VerificationGoLiveReadinessCase = {
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
};

const verificationGoLiveCases: VerificationGoLiveReadinessCase[] = [
  {
    label: "agents",
    specPath: "tests/browser/agents-verification-go-live-admin-return.smoke.spec.ts",
    titlePattern: /agents -> verification -> go-live -> admin keeps readiness browser continuity/,
    entryPathPattern: /\/agents\?source=admin-readiness/,
    surfaceHeadingPattern: /Agent lifecycle management/,
    continuityHeadingPattern: /Governance continuity/,
    verificationCtaPattern: /Carry proof to verification/,
    adminFollowUpPattern: /Admin follow-up context/,
  },
  {
    label: "api-keys",
    specPath: "tests/browser/api-keys-verification-go-live-admin-return.smoke.spec.ts",
    titlePattern: /api-keys -> verification -> go-live -> admin keeps readiness browser continuity/,
    entryPathPattern: /\/api-keys\?source=admin-readiness/,
    surfaceHeadingPattern: /Credential lifecycle/,
    continuityHeadingPattern: /Audit export continuity/,
    verificationCtaPattern: /Step 5: Record verification evidence/,
    adminFollowUpPattern: /Admin follow-up context/,
  },
  {
    label: "artifacts",
    specPath: "tests/browser/artifacts-verification-go-live-admin-return.smoke.spec.ts",
    titlePattern: /artifacts -> verification -> go-live -> admin keeps readiness browser continuity/,
    entryPathPattern: /\/artifacts\?source=admin-readiness/,
    surfaceHeadingPattern: /Generated output and evidence/,
    continuityHeadingPattern: /Audit export continuity/,
    verificationCtaPattern: /Confirm verification evidence/,
    adminFollowUpPattern: /Admin follow-up context/,
  },
  {
    label: "egress",
    specPath: "tests/browser/egress-verification-go-live-admin-return.smoke.spec.ts",
    titlePattern: /egress -> verification -> go-live -> admin keeps readiness browser continuity/,
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
  },
  {
    label: "logs",
    specPath: "tests/browser/logs-verification-go-live-admin-return.smoke.spec.ts",
    titlePattern: /logs -> verification -> go-live -> admin keeps readiness browser continuity/,
    entryPathPattern: /\/logs\?source=admin-readiness/,
    surfaceHeadingPattern: /Realtime and historical logs/,
    continuityHeadingPattern: /Audit export continuity/,
    verificationCtaPattern: /Carry proof to verification/,
    adminFollowUpPattern: /Admin follow-up context/,
  },
  {
    label: "playground",
    specPath: "tests/browser/playground-verification-go-live-admin-return.smoke.spec.ts",
    titlePattern: /playground -> verification -> go-live -> admin keeps readiness browser continuity/,
    entryPathPattern: /\/playground\?source=admin-readiness/,
    surfaceHeadingPattern: /Prompt, invoke, inspect/,
    continuityHeadingPattern: /Plan-limit checkpoint/,
    verificationCtaPattern: /Capture verification evidence/,
    adminFollowUpPattern: /Admin follow-up context/,
  },
  {
    label: "service-accounts",
    specPath: "tests/browser/service-accounts-verification-go-live-admin-return.smoke.spec.ts",
    titlePattern: /service-accounts -> verification -> go-live -> admin keeps readiness browser continuity/,
    entryPathPattern: /\/service-accounts\?source=admin-readiness/,
    surfaceHeadingPattern: /Machine identities/,
    continuityHeadingPattern: /Audit export continuity/,
    verificationCtaPattern: /Step 5: Capture verification evidence/,
    adminFollowUpPattern: /Admin follow-up context/,
  },
  {
    label: "tasks",
    specPath: "tests/browser/tasks-verification-go-live-admin-return.smoke.spec.ts",
    titlePattern: /tasks -> verification -> go-live -> admin keeps readiness browser continuity/,
    entryPathPattern: /\/tasks\?source=admin-readiness/,
    surfaceHeadingPattern: /Execution tracking/,
    continuityHeadingPattern: /Audit export continuity/,
    verificationCtaPattern: /Continue verification evidence/,
    adminFollowUpPattern: /Admin follow-up context/,
    runIdPattern: /run_id=run_demo_123/,
  },
  {
    label: "usage",
    specPath: "tests/browser/usage-verification-go-live-admin-return.smoke.spec.ts",
    titlePattern: /usage -> verification -> go-live -> admin keeps readiness browser continuity/,
    entryPathPattern: /\/usage\?source=admin-readiness/,
    surfaceHeadingPattern: /Workspace usage and plan posture/,
    continuityHeadingPattern: /Evidence loop follow-through/,
    verificationCtaPattern: /Refresh verification notes/,
    adminFollowUpPattern: /Admin follow-up context/,
  },
];

for (const readinessCase of verificationGoLiveCases) {
  test(`browser readiness ${readinessCase.label} verification->go-live->admin smoke keeps console continuity explicit`, async () => {
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
    assert.match(browserSmokeSpec, /Continue to go-live drill/);
    assert.match(browserSmokeSpec, /toHaveURL\(\/\\\/go-live\\\?\/\)/);
    assert.match(browserSmokeSpec, /toHaveURL\(\/surface=go_live\/\)/);
    assert.match(browserSmokeSpec, /Mock go-live drill/);
    assert.match(browserSmokeSpec, /Session-aware drill lane/);
    assert.match(browserSmokeSpec, /Return to admin readiness view/);
    assert.match(browserSmokeSpec, /readiness_returned=1/);
    assert.match(browserSmokeSpec, /Returned from Week 8 readiness/);
    assert.match(browserSmokeSpec, /Focus restored/);
    assert.match(browserSmokeSpec, /Clear readiness focus/);

    if (readinessCase.deliveryContextPattern) {
      assert.match(browserSmokeSpec, readinessCase.deliveryContextPattern);
    }

    if (readinessCase.runIdPattern) {
      assert.match(browserSmokeSpec, readinessCase.runIdPattern);
    }
  });
}
