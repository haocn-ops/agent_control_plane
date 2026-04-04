import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const artifactsPagePath = path.resolve(testDir, "../../app/(console)/artifacts/page.tsx");
const logsPagePath = path.resolve(testDir, "../../app/(console)/logs/page.tsx");
const membersPagePath = path.resolve(testDir, "../../app/(console)/members/page.tsx");
const serviceAccountsPagePath = path.resolve(testDir, "../../app/(console)/service-accounts/page.tsx");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("Artifacts and logs pages keep shared handoff helper usage and run_id continuity contract", async () => {
  const artifactsSource = await readSource(artifactsPagePath);
  const logsSource = await readSource(logsPagePath);

  assert.match(artifactsSource, /import \{ buildHandoffHref, type HandoffQueryArgs \} from "@\/lib\/handoff-query";/);
  assert.match(logsSource, /import \{ buildHandoffHref, type HandoffQueryArgs \} from "@\/lib\/handoff-query";/);

  assert.match(
    artifactsSource,
    /function buildArtifactsHandoffHref\(args: HandoffQueryArgs & \{ pathname: string; runId\?: string \| null \}\): string/,
  );
  assert.match(logsSource, /function buildLogsHandoffHref\(args: HandoffQueryArgs & \{ pathname: string; runId\?: string \| null \}\): string/);
  assert.match(artifactsSource, /const href = buildHandoffHref\(pathname, query, \{ preserveExistingQuery: true \}\);/);
  assert.match(logsSource, /const href = buildHandoffHref\(pathname, query, \{ preserveExistingQuery: true \}\);/);
  assert.match(artifactsSource, /searchParams\.set\("run_id", runId\);/);
  assert.match(logsSource, /searchParams\.set\("run_id", runId\);/);
});

test("Artifacts and logs pages keep verification/go-live/logs/settings link mapping on shared handoff args", async () => {
  const artifactsSource = await readSource(artifactsPagePath);
  const logsSource = await readSource(logsPagePath);

  assert.match(artifactsSource, /\{ label: "Continue to verification", path: "\/verification\?surface=verification" \}/);
  assert.match(artifactsSource, /\{ label: "Inspect go-live drill", path: "\/go-live\?surface=go_live" \}/);
  assert.match(artifactsSource, /\{ label: "Review logs", path: "\/logs" \}/);
  assert.match(artifactsSource, /\{ label: "Inspect settings handoff", path: "\/settings" \}/);
  assert.match(artifactsSource, /href=\{buildArtifactsHandoffHref\(\{ pathname: link\.path, \.\.\.handoffArgs \}\)\}/);
  assert.match(artifactsSource, /href=\{buildArtifactsHandoffHref\(\{ pathname: "\/playground", \.\.\.handoffArgs \}\)\}/);

  assert.match(logsSource, /\{ label: "Review artifacts", path: "\/artifacts" \}/);
  assert.match(logsSource, /\{ label: "Capture verification evidence", path: "\/verification\?surface=verification" \}/);
  assert.match(logsSource, /\{ label: "Continue the go-live drill", path: "\/go-live\?surface=go_live" \}/);
  assert.match(logsSource, /\{ label: "Review settings handoff", path: "\/settings" \}/);
  assert.match(logsSource, /href=\{buildLogsHandoffHref\(\{ pathname: link\.path, \.\.\.handoffArgs \}\)\}/);
});

test("Members and service-accounts pages keep shared handoff helper and onboarding continuation mapping", async () => {
  const membersSource = await readSource(membersPagePath);
  const serviceAccountsSource = await readSource(serviceAccountsPagePath);

  assert.match(membersSource, /import \{ buildHandoffHref \} from "@\/lib\/handoff-query";/);
  assert.match(serviceAccountsSource, /import \{ buildHandoffHref \} from "@\/lib\/handoff-query";/);

  assert.match(membersSource, /const handoffArgs = \{\s*source,\s*week8Focus,\s*attentionWorkspace: handoffWorkspace,/s);
  assert.match(
    membersSource,
    /const handoffArgs = \{\s*source,\s*week8Focus,\s*attentionWorkspace: handoffWorkspace,\s*attentionOrganization: handoffOrganization,\s*deliveryContext,\s*recentTrackKey,\s*recentUpdateKind,\s*evidenceCount,\s*recentOwnerLabel: ownerLabel,\s*\};/s,
  );
  assert.match(membersSource, /href=\{buildHandoffHref\("\/accept-invitation", handoffArgs\)\}/);
  assert.match(membersSource, /href=\{buildHandoffHref\("\/service-accounts", handoffArgs\)\}/);

  assert.match(
    serviceAccountsSource,
    /href=\{buildHandoffHref\("\/api-keys", \{\s*source,\s*week8Focus,\s*attentionWorkspace: handoffWorkspace,\s*attentionOrganization: handoffOrganization,\s*deliveryContext,\s*recentTrackKey,\s*recentUpdateKind,\s*evidenceCount,\s*recentOwnerLabel: ownerLabel,\s*\}\)\}/s,
  );
  assert.match(serviceAccountsSource, /function normalizeRecentTrackKey\(value\?: string \| null\): "verification" \| "go_live" \| null/);
  assert.match(serviceAccountsSource, /recentTrackKey=\{recentTrackKey\}/);
  assert.match(serviceAccountsSource, /recentUpdateKind=\{recentUpdateKind\}/);
  assert.match(serviceAccountsSource, /evidenceCount=\{evidenceCount\}/);
  assert.match(serviceAccountsSource, /recentOwnerLabel=\{ownerLabel\}/);
});

test("Console pages keep onboarding/admin-readiness/admin-attention source wiring aligned with follow-up metadata", async () => {
  const artifactsSource = await readSource(artifactsPagePath);
  const logsSource = await readSource(logsPagePath);
  const membersSource = await readSource(membersPagePath);
  const serviceAccountsSource = await readSource(serviceAccountsPagePath);

  assert.match(artifactsSource, /const showAdminAttention = source === "admin-attention";/);
  assert.match(artifactsSource, /const showAdminReadiness = source === "admin-readiness";/);
  assert.match(artifactsSource, /source=\{showAdminAttention \? "admin-attention" : "admin-readiness"\}/);
  assert.match(artifactsSource, /surface="artifacts"/);
  assert.match(artifactsSource, /deliveryContext=\{deliveryContext\}/);
  assert.match(artifactsSource, /recentTrackKey=\{recentTrackKey\}/);
  assert.match(artifactsSource, /recentUpdateKind=\{recentUpdateKind\}/);
  assert.match(artifactsSource, /evidenceCount=\{evidenceCount\}/);
  assert.match(artifactsSource, /ownerDisplayName=\{ownerLabel\}/);

  assert.match(logsSource, /const showAdminAttention = source === "admin-attention";/);
  assert.match(logsSource, /const showAdminReadiness = source === "admin-readiness";/);
  assert.match(logsSource, /source="admin-attention"[\s\S]*surface="logs"/);
  assert.match(logsSource, /source="admin-readiness"[\s\S]*surface="logs"/);

  assert.match(membersSource, /const showOnboardingFlow = source === "onboarding";/);
  assert.match(membersSource, /const showReadinessHandoff = source === "admin-readiness";/);
  assert.match(membersSource, /const showAttentionHandoff = source === "admin-attention";/);
  assert.match(membersSource, /source="admin-attention"[\s\S]*surface="members"/);
  assert.match(membersSource, /source="admin-readiness"[\s\S]*surface="members"/);

  assert.match(serviceAccountsSource, /const showReadinessHandoff = source === "admin-readiness";/);
  assert.match(serviceAccountsSource, /const showAttentionHandoff = source === "admin-attention";/);
  assert.match(serviceAccountsSource, /const showOnboardingContext = source === "onboarding";/);
  assert.match(serviceAccountsSource, /source="admin-attention"[\s\S]*surface="service-accounts"/);
  assert.match(serviceAccountsSource, /source="admin-readiness"[\s\S]*surface="service-accounts"/);
});

test("Console pages keep query parsing and handoff-arg continuity for source and recent metadata", async () => {
  const artifactsSource = await readSource(artifactsPagePath);
  const logsSource = await readSource(logsPagePath);
  const membersSource = await readSource(membersPagePath);
  const serviceAccountsSource = await readSource(serviceAccountsPagePath);

  for (const source of [artifactsSource, logsSource, membersSource, serviceAccountsSource]) {
    assert.match(source, /const source = getParam\(searchParams\?\.source\);/);
    assert.match(source, /const handoffWorkspace = getParam\(searchParams\?\.attention_workspace\);/);
    assert.match(source, /const handoffOrganization = getParam\(searchParams\?\.attention_organization\);/);
    assert.match(source, /const week8Focus = getParam\(searchParams\?\.week8_focus\);/);
    assert.match(source, /const deliveryContext = getParam\(searchParams\?\.delivery_context\);/);
    assert.match(source, /const recentTrackKey = .*getParam\(searchParams\?\.recent_track_key\)/);
    assert.match(source, /const recentUpdateKind = getParam\(searchParams\?\.recent_update_kind\);/);
    assert.match(source, /const evidenceCountParam = getParam\(searchParams\?\.evidence_count\);/);
    assert.match(
      source,
      /const evidenceCount =\s*evidenceCountParam && !Number\.isNaN\(Number\(evidenceCountParam\)\) \? Number\(evidenceCountParam\) : null;/s,
    );
    assert.match(
      source,
      /const ownerLabel =\s*getParam\(searchParams\?\.recent_owner_label\) \?\? getParam\(searchParams\?\.recent_owner_display_name\);/s,
    );
  }

  assert.match(
    artifactsSource,
    /const handoffArgs = \{\s*source,\s*week8Focus,\s*attentionWorkspace: handoffWorkspace,\s*attentionOrganization: handoffOrganization,\s*deliveryContext,\s*recentTrackKey,\s*recentUpdateKind,\s*evidenceCount,\s*recentOwnerLabel: ownerLabel,\s*runId: requestedRunId,\s*\};/s,
  );
  assert.match(
    logsSource,
    /const handoffArgs = \{\s*source,\s*week8Focus,\s*attentionWorkspace: handoffWorkspace,\s*attentionOrganization: handoffOrganization,\s*deliveryContext,\s*recentTrackKey,\s*recentUpdateKind,\s*evidenceCount,\s*recentOwnerLabel: ownerLabel,\s*runId: requestedRunId,\s*\};/s,
  );
  assert.match(
    membersSource,
    /const handoffArgs = \{\s*source,\s*week8Focus,\s*attentionWorkspace: handoffWorkspace,\s*attentionOrganization: handoffOrganization,\s*deliveryContext,\s*recentTrackKey,\s*recentUpdateKind,\s*evidenceCount,\s*recentOwnerLabel: ownerLabel,\s*\};/s,
  );
  assert.match(
    membersSource,
    /href=\{buildHandoffHref\("\/accept-invitation", handoffArgs\)\}/,
  );
});

test("Artifacts/logs verification and go-live links keep explicit-surface contract when enabled, otherwise remain canonical base paths", async () => {
  const [artifactsSource, logsSource] = await Promise.all([
    readSource(artifactsPagePath),
    readSource(logsPagePath),
  ]);

  const artifactsHasExplicitVerification = /path: "\/verification\?surface=verification"/.test(artifactsSource);
  const logsHasExplicitVerification = /path: "\/verification\?surface=verification"/.test(logsSource);

  if (artifactsHasExplicitVerification) {
    assert.match(artifactsSource, /\{ label: "Continue to verification", path: "\/verification\?surface=verification" \}/);
    assert.match(artifactsSource, /\{ label: "Inspect go-live drill", path: "\/go-live\?surface=go_live" \}/);
  } else {
    assert.match(artifactsSource, /\{ label: "Continue to verification", path: "\/verification" \}/);
    assert.match(artifactsSource, /\{ label: "Inspect go-live drill", path: "\/go-live" \}/);
  }

  if (logsHasExplicitVerification) {
    assert.match(logsSource, /\{ label: "Capture verification evidence", path: "\/verification\?surface=verification" \}/);
    assert.match(logsSource, /\{ label: "Continue the go-live drill", path: "\/go-live\?surface=go_live" \}/);
  } else {
    assert.match(logsSource, /\{ label: "Capture verification evidence", path: "\/verification" \}/);
    assert.match(logsSource, /\{ label: "Continue the go-live drill", path: "\/go-live" \}/);
  }

  assert.match(artifactsSource, /href=\{buildArtifactsHandoffHref\(\{ pathname: link\.path, \.\.\.handoffArgs \}\)\}/);
  assert.match(logsSource, /href=\{buildLogsHandoffHref\(\{ pathname: link\.path, \.\.\.handoffArgs \}\)\}/);
});

test("Members onboarding next-step keeps label, onboarding gating, and shared handoff continuity", async () => {
  const source = await readSource(membersPagePath);

  assert.match(
    source,
    /Next: create a service account, issue an API key, then run in the playground to capture the trace for verification\./,
  );
  assert.match(source, /const showOnboardingFlow = source === "onboarding";/);
  assert.match(source, /\{showOnboardingFlow \? \(/);
  assert.match(source, /href=\{buildHandoffHref\("\/service-accounts", handoffArgs\)\}/);
  assert.match(source, /Next: service accounts/);
  assert.match(
    source,
    /const handoffArgs = \{\s*source,\s*week8Focus,\s*attentionWorkspace: handoffWorkspace,\s*attentionOrganization: handoffOrganization,\s*deliveryContext,\s*recentTrackKey,\s*recentUpdateKind,\s*evidenceCount,\s*recentOwnerLabel: ownerLabel,\s*\};/s,
  );
  assert.match(source, /href=\{buildHandoffHref\("\/accept-invitation", handoffArgs\)\}/);
});
