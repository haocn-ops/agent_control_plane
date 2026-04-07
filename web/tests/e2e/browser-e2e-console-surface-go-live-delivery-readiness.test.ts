import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");

type GoLiveReadinessCase = {
  label: string;
  specPath: string;
  titlePattern: RegExp;
  entryPathPattern: RegExp;
  surfaceHeadingPattern: RegExp;
  continuityHeadingPattern: RegExp;
  goLiveCtaPattern?: RegExp;
  verificationCtaPattern?: RegExp;
  deliveryContextPattern?: RegExp;
  recentTrackKeyPattern: RegExp;
  ownerDisplayPattern?: RegExp | null;
  ownerEmailPattern?: RegExp | null;
  goLiveSurfacePattern?: RegExp | null;
  goLivePanelPattern?: RegExp;
  verificationPanelPattern?: RegExp;
  expectsFocusRestored?: boolean;
};

const goLiveCases: GoLiveReadinessCase[] = [
  {
    label: "agents",
    specPath: "tests/browser/agents-go-live-admin-return.smoke.spec.ts",
    titlePattern: /agents -> go-live -> admin keeps readiness return continuity/,
    entryPathPattern: /\/agents\?source=admin-readiness/,
    surfaceHeadingPattern: /Agent lifecycle management/,
    continuityHeadingPattern: /Governance continuity/,
    goLiveCtaPattern: /Align go-live drill/,
    recentTrackKeyPattern: /recent_track_key=go_live/,
    ownerDisplayPattern: /toHaveURL\(\/recent_owner_display_name=Avery\(\?:\\\+\|%20\)Ops\/\)/,
    ownerEmailPattern: /toHaveURL\(\/recent_owner_email=avery\\\.ops\(\?:%40\|@\)govrail\\\.test\/\)/,
    goLiveSurfacePattern: /toHaveURL\(\/surface=go_live\/\)/,
    expectsFocusRestored: true,
  },
  {
    label: "api-keys",
    specPath: "tests/browser/api-keys-go-live-admin-return.smoke.spec.ts",
    titlePattern: /api-keys -> go-live -> admin keeps readiness return continuity/,
    entryPathPattern: /\/api-keys\?source=admin-readiness/,
    surfaceHeadingPattern: /Credential lifecycle/,
    continuityHeadingPattern: /Audit export continuity/,
    goLiveCtaPattern: /Reopen go-live drill/,
    recentTrackKeyPattern: /recent_track_key=go_live/,
    ownerDisplayPattern: /toHaveURL\(\/recent_owner_display_name=Avery\(\?:\\\+\|%20\)Ops\/\)/,
    ownerEmailPattern: /toHaveURL\(\/recent_owner_email=avery\\\.ops\(\?:%40\|@\)govrail\\\.test\/\)/,
    goLiveSurfacePattern: /toHaveURL\(\/surface=go_live\/\)/,
    expectsFocusRestored: true,
  },
  {
    label: "service-accounts",
    specPath: "tests/browser/service-accounts-go-live-admin-return.smoke.spec.ts",
    titlePattern: /service-accounts -> go-live -> admin keeps readiness return continuity/,
    entryPathPattern: /\/service-accounts\?source=admin-readiness/,
    surfaceHeadingPattern: /Machine identities/,
    continuityHeadingPattern: /Audit export continuity/,
    goLiveCtaPattern: /Reopen go-live drill/,
    recentTrackKeyPattern: /recent_track_key=go_live/,
    ownerDisplayPattern: /toHaveURL\(\/recent_owner_display_name=Avery\(\?:\\\+\|%20\)Ops\/\)/,
    ownerEmailPattern: /toHaveURL\(\/recent_owner_email=avery\\\.ops\(\?:%40\|@\)govrail\\\.test\/\)/,
    goLiveSurfacePattern: /toHaveURL\(\/surface=go_live\/\)/,
    expectsFocusRestored: true,
  },
  {
    label: "settings",
    specPath: "tests/browser/settings-go-live-admin-return.smoke.spec.ts",
    titlePattern: /settings -> go-live -> admin keeps handoff continuity/,
    entryPathPattern: /\/settings\?source=admin-readiness/,
    surfaceHeadingPattern: /Workspace configuration/,
    continuityHeadingPattern: /Enterprise evidence lane/,
    goLiveCtaPattern: /Rehearse go-live readiness/,
    deliveryContextPattern: /delivery_context=recent_activity/,
    recentTrackKeyPattern: /recent_track_key=go_live/,
    ownerDisplayPattern: /toHaveURL\(\/recent_owner_display_name=Avery\(\?:\\\+\|%20\)Ops\/\)/,
    ownerEmailPattern: /toHaveURL\(\/recent_owner_email=avery\\\.ops\(\?:%40\|@\)govrail\\\.test\/\)/,
    goLiveSurfacePattern: /toHaveURL\(\/surface=go_live\/\)/,
  },
  {
    label: "verification-delivery",
    specPath: "tests/browser/verification-delivery-admin-return.smoke.spec.ts",
    titlePattern: /verification delivery panel -> go-live -> admin keeps readiness continuity/,
    entryPathPattern: /\/verification\?surface=verification&source=admin-readiness/,
    surfaceHeadingPattern: /Week 8 launch checklist/,
    continuityHeadingPattern: /Verification delivery notes/,
    goLiveCtaPattern: /Continue to go-live drill/,
    deliveryContextPattern: /delivery_context=recent_activity/,
    recentTrackKeyPattern: /recent_track_key=verification/,
    ownerDisplayPattern: null,
    ownerEmailPattern: null,
    goLiveSurfacePattern: null,
    goLivePanelPattern: /Go-live delivery notes/,
  },
  {
    label: "go-live-delivery",
    specPath: "tests/browser/go-live-delivery-admin-return.smoke.spec.ts",
    titlePattern: /go-live delivery panel -> verification -> admin keeps readiness continuity/,
    entryPathPattern: /\/go-live\?surface=go_live&source=admin-readiness/,
    surfaceHeadingPattern: /Mock go-live drill/,
    continuityHeadingPattern: /Go-live delivery notes/,
    verificationCtaPattern: /Return to verification/,
    deliveryContextPattern: /delivery_context=recent_activity/,
    recentTrackKeyPattern: /recent_track_key=go_live/,
    ownerDisplayPattern: null,
    ownerEmailPattern: null,
    verificationPanelPattern: /Verification delivery notes/,
  },
];

for (const readinessCase of goLiveCases) {
  test(`browser readiness ${readinessCase.label} go-live/delivery smoke keeps console continuity explicit`, async () => {
    const browserSmokeSpec = await readFile(path.resolve(webDir, readinessCase.specPath), "utf8");

    assert.match(browserSmokeSpec, readinessCase.titlePattern);
    assert.match(browserSmokeSpec, readinessCase.entryPathPattern);
    assert.match(browserSmokeSpec, readinessCase.surfaceHeadingPattern);
    assert.match(browserSmokeSpec, /Admin follow-up context/);
    assert.match(browserSmokeSpec, readinessCase.continuityHeadingPattern);
    assert.match(browserSmokeSpec, /toHaveURL\(\/source=admin-readiness\/\)/);
    assert.match(browserSmokeSpec, /toHaveURL\(\/week8_focus=credentials\/\)/);
    assert.match(browserSmokeSpec, /toHaveURL\(\/attention_workspace=preview\/\)/);
    assert.match(browserSmokeSpec, /toHaveURL\(\/attention_organization=org_preview\/\)/);
    assert.match(browserSmokeSpec, readinessCase.recentTrackKeyPattern);
    assert.match(browserSmokeSpec, /toHaveURL\(\/evidence_count=2\/\)/);
    if (readinessCase.ownerDisplayPattern) {
      assert.match(browserSmokeSpec, readinessCase.ownerDisplayPattern);
    }

    if (readinessCase.ownerEmailPattern) {
      assert.match(browserSmokeSpec, readinessCase.ownerEmailPattern);
    }

    if (readinessCase.goLiveCtaPattern) {
      assert.match(browserSmokeSpec, readinessCase.goLiveCtaPattern);
    }

    if (readinessCase.verificationCtaPattern) {
      assert.match(browserSmokeSpec, readinessCase.verificationCtaPattern);
    }

    if (readinessCase.deliveryContextPattern) {
      assert.match(browserSmokeSpec, readinessCase.deliveryContextPattern);
    }

    if (readinessCase.goLivePanelPattern) {
      assert.match(browserSmokeSpec, readinessCase.goLivePanelPattern);
    }

    if (readinessCase.verificationPanelPattern) {
      assert.match(browserSmokeSpec, readinessCase.verificationPanelPattern);
    }

    if (readinessCase.label === "go-live-delivery") {
      assert.match(browserSmokeSpec, /toHaveURL\(\/\\\/verification\\\?\/\)/);
      assert.match(browserSmokeSpec, /Return to admin readiness view/);
    } else {
      assert.match(browserSmokeSpec, /toHaveURL\(\/\\\/go-live\\\?\/\)/);
      if (readinessCase.goLiveSurfacePattern) {
        assert.match(browserSmokeSpec, readinessCase.goLiveSurfacePattern);
      }
      assert.match(browserSmokeSpec, /Mock go-live drill/);
      assert.match(browserSmokeSpec, /Return to admin readiness view/);
    }

    assert.match(browserSmokeSpec, /readiness_returned=1/);
    assert.match(browserSmokeSpec, /Returned from Week 8 readiness/);

    if (readinessCase.expectsFocusRestored) {
      assert.match(browserSmokeSpec, /Focus restored/);
      assert.match(browserSmokeSpec, /Clear readiness focus/);
    }
  });
}
