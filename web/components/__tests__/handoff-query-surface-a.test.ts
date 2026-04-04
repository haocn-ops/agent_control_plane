import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const onboardingWizardPath = path.resolve(testDir, "../onboarding/workspace-onboarding-wizard.tsx");
const playgroundPanelPath = path.resolve(testDir, "../playground/playground-panel.tsx");
const usageDashboardPath = path.resolve(testDir, "../usage/workspace-usage-dashboard.tsx");

test("source-contract(slot-a): onboarding handoff href uses shared helper with existing-query preservation", async () => {
  const source = await readFile(onboardingWizardPath, "utf8");

  assert.match(
    source,
    /import \{ buildVerificationChecklistHandoffHref \} from "@\/components\/verification\/week8-verification-checklist";/,
  );
  assert.match(
    source,
    /const handoffHrefArgs: Omit<Parameters<typeof buildVerificationChecklistHandoffHref>\[0\], "pathname"> = \{/,
  );
  assert.match(source, /source: normalizedSource,/);
  assert.match(source, /week8Focus,/);
  assert.match(source, /attentionWorkspace,/);
  assert.match(source, /attentionOrganization,/);
  assert.match(source, /deliveryContext,/);
  assert.match(source, /recentTrackKey,/);
  assert.match(source, /recentUpdateKind,/);
  assert.match(source, /evidenceCount,/);
  assert.match(source, /recentOwnerLabel,/);
  assert.match(
    source,
    /const onboardingGuideHref = buildVerificationChecklistHandoffHref\(\{\s*pathname: toSurfacePath\(onboardingGuide\.surface\),\s*\.\.\.handoffHrefArgs,\s*\}\);/s,
  );
  assert.match(
    source,
    /const recommendedNextHref = buildVerificationChecklistHandoffHref\(\{\s*pathname: toSurfacePath\(recommendedNext\.surface\),\s*\.\.\.handoffHrefArgs,\s*\}\);/s,
  );
  assert.match(
    source,
    /const verificationChecklistHref = buildVerificationChecklistHandoffHref\(\{\s*pathname: "\/verification\?surface=verification",\s*\.\.\.handoffHrefArgs,\s*\}\);/s,
  );
});

test("source-contract(slot-a): playground + usage handoff href builders delegate to shared helper", async () => {
  const [playgroundSource, usageSource] = await Promise.all([
    readFile(playgroundPanelPath, "utf8"),
    readFile(usageDashboardPath, "utf8"),
  ]);

  assert.match(
    playgroundSource,
    /import \{ buildVerificationChecklistHandoffHref \} from "@\/components\/verification\/week8-verification-checklist";/,
  );
  assert.match(
    playgroundSource,
    /const handoffHrefArgs: Omit<Parameters<typeof buildVerificationChecklistHandoffHref>\[0\], "pathname"> = \{/,
  );
  assert.match(playgroundSource, /buildVerificationChecklistHandoffHref\(\{ pathname: "\/usage", \.\.\.handoffHrefArgs }\)/);
  assert.match(playgroundSource, /buildVerificationChecklistHandoffHref\(\{ pathname: "\/settings", \.\.\.handoffHrefArgs }\)/);
  assert.match(
    playgroundSource,
    /buildVerificationChecklistHandoffHref\(\{ pathname: "\/verification\?surface=verification", \.\.\.handoffHrefArgs }\)/,
  );
  assert.match(
    playgroundSource,
    /buildVerificationChecklistHandoffHref\(\{ pathname: toSurfacePath\(onboardingGuide\.actionSurface\), \.\.\.handoffHrefArgs }\)/,
  );

  assert.match(
    usageSource,
    /import \{ buildVerificationChecklistHandoffHref \} from "@\/components\/verification\/week8-verification-checklist";/,
  );
  assert.match(
    usageSource,
    /const handoffHrefArgs: Omit<Parameters<typeof buildVerificationChecklistHandoffHref>\[0\], "pathname"> = \{/,
  );
  assert.match(usageSource, /buildVerificationChecklistHandoffHref\(\{ pathname: "\/playground", \.\.\.handoffHrefArgs }\)/);
  assert.match(
    usageSource,
    /buildVerificationChecklistHandoffHref\(\{ pathname: "\/verification\?surface=verification", \.\.\.handoffHrefArgs }\)/,
  );
  assert.match(usageSource, /buildVerificationChecklistHandoffHref\(\{ pathname: action\.path, \.\.\.handoffHrefArgs }\)/);
});
