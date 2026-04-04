import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const apiKeysPanelPath = path.resolve(testDir, "../api-keys/api-keys-panel.tsx");
const serviceAccountsPanelPath = path.resolve(testDir, "../service-accounts/service-accounts-panel.tsx");
const usageDashboardPath = path.resolve(testDir, "../usage/workspace-usage-dashboard.tsx");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("API keys panel keeps link labels coupled to service-accounts/playground/verification handoff targets with shared query args", async () => {
  const source = await readSource(apiKeysPanelPath);

  assert.match(source, /import \{ buildVerificationChecklistHandoffHref \} from "@\/components\/verification\/week8-verification-checklist";/);
  assert.match(
    source,
    /const handoffHrefArgs = \{\s*source: normalizedSource,\s*week8Focus,\s*attentionWorkspace,\s*attentionOrganization,\s*deliveryContext: normalizedDeliveryContext,\s*recentTrackKey: normalizedRecentTrackKey,\s*recentUpdateKind: normalizedRecentUpdateKind,\s*evidenceCount: normalizedEvidenceCount,\s*recentOwnerLabel,\s*\};/s,
  );
  assert.match(source, /const serviceAccountsHref = buildVerificationChecklistHandoffHref\(\{ pathname: "\/service-accounts", \.\.\.handoffHrefArgs \}\);/);
  assert.match(source, /const playgroundHref = buildVerificationChecklistHandoffHref\(\{ pathname: "\/playground", \.\.\.handoffHrefArgs \}\);/);
  assert.match(
    source,
    /const verificationHref = buildVerificationChecklistHandoffHref\(\{\s*pathname: "\/verification\?surface=verification",\s*\.\.\.handoffHrefArgs,\s*\}\);/s,
  );
  assert.match(
    source,
    /const onboardingGuideHref = buildVerificationChecklistHandoffHref\(\{\s*pathname: toSurfacePath\(onboardingGuide\.actionSurface\),\s*\.\.\.handoffHrefArgs,\s*\}\);/s,
  );
  assert.match(source, /if \(surface === "verification"\) \{\s*return "\/verification\?surface=verification";\s*\}/s);
  assert.match(source, /if \(surface === "go_live" \|\| surface === "go-live"\) \{\s*return "\/go-live\?surface=go_live";\s*\}/s);

  assert.match(source, /href=\{serviceAccountsHref\}[\s\S]*Review service accounts/);
  assert.match(source, /href=\{playgroundHref\}[\s\S]*Run a verification demo/);
  assert.match(source, /href=\{verificationHref\}[\s\S]*Capture Week 8 evidence/);
  assert.match(source, /href=\{verificationHref\}[\s\S]*Continue to verification/);
  assert.match(source, /href=\{serviceAccountsHref\}[\s\S]*Review service accounts/);
  assert.match(source, /href=\{playgroundHref\}[\s\S]*Run a governance demo/);
});

test("Service-accounts panel keeps source-specific context-card labels mapped to target paths and shared handoff query continuity", async () => {
  const source = await readSource(serviceAccountsPanelPath);

  assert.match(source, /import \{ buildVerificationChecklistHandoffHref \} from "@\/components\/verification\/week8-verification-checklist";/);
  assert.match(
    source,
    /const handoffHrefArgs: HandoffQuery = \{\s*source: normalizedSource,\s*week8Focus,\s*attentionWorkspace,\s*attentionOrganization,\s*deliveryContext,\s*recentTrackKey,\s*recentUpdateKind,\s*evidenceCount,\s*recentOwnerLabel,\s*\};/s,
  );
  assert.match(source, /href={buildVerificationChecklistHandoffHref\({ pathname: action\.path, \.\.\.handoffHrefArgs }\)}/);
  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: toSurfacePath\(onboardingGuide\.actionSurface\), \.\.\.handoffHrefArgs \}\)\}/,
  );

  assert.match(source, /title: "Admin readiness follow-up"/);
  assert.match(source, /\{ label: "Return to verification", path: "\/verification\?surface=verification" \}/);
  assert.match(source, /\{ label: "Continue to playground", path: "\/playground" \}/);

  assert.match(source, /title: "Admin queue follow-up"/);
  assert.match(source, /\{ label: "Open verification", path: "\/verification\?surface=verification" \}/);
  assert.match(source, /\{ label: "Inspect API keys", path: "\/api-keys" \}/);

  assert.match(source, /title: "Onboarding guidance"/);
  assert.match(source, /\{ label: "Run a playground demo", path: "\/playground" \}/);
  assert.match(source, /\{ label: "Capture verification evidence", path: "\/verification\?surface=verification" \}/);
  assert.match(source, /if \(surface === "verification"\) \{\s*return "\/verification\?surface=verification";\s*\}/s);
  assert.match(source, /if \(surface === "go_live" \|\| surface === "go-live"\) \{\s*return "\/go-live\?surface=go_live";\s*\}/s);

  assert.match(source, /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/service-accounts", \.\.\.handoffHrefArgs \}\)\}/);
  assert.match(source, /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/playground", \.\.\.handoffHrefArgs \}\)\}/);
  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{\s*pathname: "\/verification\?surface=verification",\s*\.\.\.handoffHrefArgs,\s*\}\)\}/s,
  );
  assert.match(source, /Review service accounts/);
  assert.match(source, /Run a verification demo/);
  assert.match(source, /Capture Week 8 evidence/);
});

test("Usage dashboard keeps explicit verification surface links coupled to shared handoff continuity", async () => {
  const source = await readSource(usageDashboardPath);

  assert.match(source, /import \{ buildVerificationChecklistHandoffHref \} from "@\/components\/verification\/week8-verification-checklist";/);
  assert.match(source, /\{ label: "Return to verification", path: "\/verification\?surface=verification" \}/);
  assert.match(source, /\{ label: "Capture verification evidence", path: "\/verification\?surface=verification" \}/);
  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/verification\?surface=verification", \.\.\.handoffHrefArgs \}\)\}/,
  );
  assert.match(source, /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: action\.path, \.\.\.handoffHrefArgs \}\)\}/);
});
