import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const onboardingWizardPath = path.resolve(testDir, "../onboarding/workspace-onboarding-wizard.tsx");
const playgroundPanelPath = path.resolve(testDir, "../playground/playground-panel.tsx");
const usageDashboardPath = path.resolve(testDir, "../usage/workspace-usage-dashboard.tsx");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("Onboarding wizard keeps shared handoff helper coupling with next-step and lane links", async () => {
  const source = await readSource(onboardingWizardPath);

  assert.match(
    source,
    /import \{ buildVerificationChecklistHandoffHref \} from "@\/components\/verification\/week8-verification-checklist";/,
  );
  assert.match(source, /function toSurfacePath\(surface: OnboardingSurface\): string/);
  assert.match(source, /if \(surface === "service_accounts" \|\| surface === "service-accounts"\) \{\s*return "\/service-accounts";\s*\}/s);
  assert.match(source, /if \(surface === "api_keys" \|\| surface === "api-keys"\) \{\s*return "\/api-keys";\s*\}/s);
  assert.match(source, /if \(surface === "verification"\) \{\s*return "\/verification\?surface=verification";\s*\}/s);
  assert.match(source, /if \(surface === "go_live" \|\| surface === "go-live"\) \{\s*return "\/go-live\?surface=go_live";\s*\}/s);

  assert.match(
    source,
    /const handoffHrefArgs: Omit<Parameters<typeof buildVerificationChecklistHandoffHref>\[0\], "pathname"> = \{\s*source: normalizedSource,\s*week8Focus,\s*attentionWorkspace,\s*attentionOrganization,\s*deliveryContext,\s*recentTrackKey,\s*recentUpdateKind,\s*evidenceCount,\s*recentOwnerLabel,\s*\};/s,
  );
  assert.match(
    source,
    /const onboardingGuideHref = buildVerificationChecklistHandoffHref\(\{\s*pathname: toSurfacePath\(onboardingGuide\.surface\),\s*\.\.\.handoffHrefArgs,\s*\}\);/s,
  );
  assert.match(
    source,
    /const recommendedNextHref = buildVerificationChecklistHandoffHref\(\{\s*pathname: toSurfacePath\(recommendedNext\.surface\),\s*\.\.\.handoffHrefArgs,\s*\}\);/s,
  );
  assert.match(source, /<Link href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/members", \.\.\.handoffHrefArgs \}\)\}>/);
  assert.match(source, /<Link href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/service-accounts", \.\.\.handoffHrefArgs \}\)\}>/);
  assert.match(source, /<Link href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/api-keys", \.\.\.handoffHrefArgs \}\)\}>/);
  assert.match(source, /<Link href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/playground", \.\.\.handoffHrefArgs \}\)\}>/);
  assert.match(
    source,
    /const verificationChecklistHref = buildVerificationChecklistHandoffHref\(\{\s*pathname: "\/verification\?surface=verification",\s*\.\.\.handoffHrefArgs,\s*\}\);/s,
  );
  assert.match(
    source,
    /const goLiveDrillHref = buildVerificationChecklistHandoffHref\(\{\s*pathname: "\/go-live\?surface=go_live",\s*\.\.\.handoffHrefArgs,\s*\}\);/s,
  );
  assert.match(source, /Members/);
  assert.match(source, /Service accounts/);
  assert.match(source, /API keys/);
  assert.match(source, /Playground/);
  assert.match(source, /Verification/);
});

test("Playground panel keeps label-to-target continuity for usage/settings/service-accounts/api-keys/verification via shared helper", async () => {
  const source = await readSource(playgroundPanelPath);

  assert.match(
    source,
    /import \{ buildVerificationChecklistHandoffHref \} from "@\/components\/verification\/week8-verification-checklist";/,
  );
  assert.match(
    source,
    /const handoffHrefArgs: Omit<Parameters<typeof buildVerificationChecklistHandoffHref>\[0\], "pathname"> = \{\s*source: normalizedSource,\s*week8Focus,\s*attentionWorkspace,\s*attentionOrganization,\s*deliveryContext: normalizedDeliveryContext,\s*recentTrackKey: normalizedRecentTrackKey,\s*recentUpdateKind,\s*evidenceCount,\s*recentOwnerLabel,\s*\};/s,
  );
  assert.match(source, /if \(surface === "verification"\) \{\s*return "\/verification\?surface=verification";\s*\}/s);
  assert.match(source, /if \(surface === "go_live" \|\| surface === "go-live"\) \{\s*return "\/go-live\?surface=go_live";\s*\}/s);
  assert.match(source, /latestDemoRunHint\?: \{/);
  assert.match(source, /deliveryGuidance\?: \{/);
  assert.match(
    source,
    /if \(args\.latestDemoRunHint\?\.needs_attention\) \{[\s\S]*actionLabel: args\.latestDemoRunHint\.is_terminal \? "Retry Playground run" : "Inspect Playground status"[\s\S]*actionSurface: "playground",/s,
  );
  assert.match(
    source,
    /if \(args\.deliveryGuidance\?\.verification_status !== "complete"\) \{[\s\S]*actionLabel: "Open Verification"[\s\S]*actionSurface: "verification",/s,
  );
  assert.match(
    source,
    /if \(args\.deliveryGuidance\?\.go_live_status !== "complete"\) \{[\s\S]*actionLabel: "Open go-live drill"[\s\S]*actionSurface: "go-live",/s,
  );

  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/usage", \.\.\.handoffHrefArgs \}\)\}[\s\S]*Review usage/s,
  );
  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/settings", \.\.\.handoffHrefArgs \}\)\}[\s\S]*Check plan and limits/s,
  );
  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/service-accounts", \.\.\.handoffHrefArgs \}\)\}[\s\S]*Review service accounts/s,
  );
  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/api-keys", \.\.\.handoffHrefArgs \}\)\}[\s\S]*Check API key scope/s,
  );
  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/verification\?surface=verification", \.\.\.handoffHrefArgs \}\)\}[\s\S]*Open verification/s,
  );
  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: toSurfacePath\(onboardingGuide\.actionSurface\), \.\.\.handoffHrefArgs \}\)\}[\s\S]*\{onboardingGuide\.actionLabel\}/s,
  );
});

test("Usage dashboard keeps label-to-target continuity for playground/verification/api-keys and source-card actions via shared helper", async () => {
  const source = await readSource(usageDashboardPath);

  assert.match(
    source,
    /import \{ buildVerificationChecklistHandoffHref \} from "@\/components\/verification\/week8-verification-checklist";/,
  );
  assert.match(
    source,
    /const handoffHrefArgs: Omit<Parameters<typeof buildVerificationChecklistHandoffHref>\[0\], "pathname"> = \{\s*source: normalizedSource,\s*week8Focus,\s*attentionWorkspace,\s*attentionOrganization,\s*deliveryContext: normalizeDeliveryContext\(deliveryContext\),\s*recentTrackKey: normalizeRecentTrackKey\(recentTrackKey\),\s*recentUpdateKind: normalizeRecentUpdateKind\(recentUpdateKind\),\s*evidenceCount,\s*recentOwnerLabel,\s*\};/s,
  );

  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/playground", \.\.\.handoffHrefArgs \}\)\}[\s\S]*Run a playground demo/s,
  );
  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/verification\?surface=verification", \.\.\.handoffHrefArgs \}\)\}[\s\S]*Capture evidence in verification/s,
  );
  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/api-keys", \.\.\.handoffHrefArgs \}\)\}[\s\S]*Review API key scopes/s,
  );
  assert.match(source, /\{ label: "Return to verification", path: "\/verification\?surface=verification" \}/);
  assert.match(source, /\{ label: "Review billing \+ settings", path: "\/settings" \}/);
  assert.match(source, /\{ label: "Capture verification evidence", path: "\/verification\?surface=verification" \}/);
  assert.match(source, /\{ label: "Review billing \+ features", path: "\/settings" \}/);
  assert.match(source, /const latestDemoRunHint = args\.onboardingState\?\.latest_demo_run_hint \?\? null;/);
  assert.match(source, /const deliveryGuidance = args\.onboardingState\?\.delivery_guidance \?\? null;/);
  assert.match(
    source,
    /if \(latestDemoRunHint\?\.needs_attention\) \{[\s\S]*title: latestDemoRunHint\.is_terminal \? "Recover the latest demo signal" : "Monitor the latest demo signal"/s,
  );
  assert.match(
    source,
    /if \(args\.onboardingState\?\.checklist\.demo_run_succeeded\) \{[\s\S]*deliveryGuidance\?\.summary/s,
  );
  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: action\.path, \.\.\.handoffHrefArgs \}\)\}/s,
  );
});
