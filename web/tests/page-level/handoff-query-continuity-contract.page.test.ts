import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const verificationChecklistPath = path.resolve(testDir, "../../components/verification/week8-verification-checklist.tsx");
const goLivePanelPath = path.resolve(testDir, "../../components/go-live/mock-go-live-drill-panel.tsx");
const apiKeysPanelPath = path.resolve(testDir, "../../components/api-keys/api-keys-panel.tsx");
const serviceAccountsPanelPath = path.resolve(testDir, "../../components/service-accounts/service-accounts-panel.tsx");
const usageDashboardPath = path.resolve(testDir, "../../components/usage/workspace-usage-dashboard.tsx");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

function assertMatchesAny(source: string, patterns: RegExp[], message: string): void {
  assert.ok(
    patterns.some((pattern) => pattern.test(source)),
    `${message}: expected one of ${patterns.map((pattern) => pattern.toString()).join(" | ")}`,
  );
}

test("verification checklist exposes shared handoff builder and forwards continuity query keys to lib helper", async () => {
  const source = await readSource(verificationChecklistPath);

  assert.match(source, /buildVerificationChecklistHandoffHref/);
  assertMatchesAny(
    source,
    [/export function buildVerificationChecklistHandoffHref\(args:/, /import \{ buildVerificationChecklistHandoffHref \} from "@\/lib\/handoff-query";/],
    "shared verification handoff builder presence",
  );
  assertMatchesAny(
    source,
    [/return buildHandoffHref\(/, /buildVerificationChecklistHandoffHref\(\{/],
    "handoff builder composition",
  );
  assert.match(source, /week8Focus/);
  assert.match(source, /attentionWorkspace/);
  assert.match(source, /attentionOrganization/);
  assert.match(source, /deliveryContext/);
  assert.match(source, /recentTrackKey/);
  assert.match(source, /recentUpdateKind/);
  assert.match(source, /evidenceCount/);
  assert.match(source, /recentOwnerLabel/);
  assert.match(source, /preserveExistingQuery: true/);
  assert.match(source, /return buildAdminReturnHref\("\/admin", \{/);
  assert.match(source, /queueSurface: args\.recentTrackKey,/);
  assert.match(source, /"\/*verification\?surface=verification"/);
  assert.match(source, /"\/go-live\?surface=go_live"/);
});

test("go-live, api-keys, service-accounts, and usage panels reuse checklist shared handoff helper for continuity", async () => {
  const [goLiveSource, apiKeysSource, serviceAccountsSource, usageSource] = await Promise.all([
    readSource(goLivePanelPath),
    readSource(apiKeysPanelPath),
    readSource(serviceAccountsPanelPath),
    readSource(usageDashboardPath),
  ]);

  assert.match(goLiveSource, /buildVerificationChecklistHandoffHref/);
  assert.match(goLiveSource, /buildVerificationChecklistHandoffHref\(\{/);
  assert.match(goLiveSource, /href: buildHref\("\/verification\?surface=verification"\),/);
  assert.match(goLiveSource, /buildAdminReturnHref\("\/admin", \{/);

  assert.match(apiKeysSource, /buildVerificationChecklistHandoffHref/);
  assert.match(apiKeysSource, /return "\/verification\?surface=verification";/);
  assert.match(apiKeysSource, /buildVerificationChecklistHandoffHref\(\{ pathname: "\/service-accounts"/);
  assert.match(apiKeysSource, /buildVerificationChecklistHandoffHref\(\{ pathname: "\/playground"/);
  assert.match(
    apiKeysSource,
    /buildVerificationChecklistHandoffHref\(\{\s*pathname: "\/verification\?surface=verification",/s,
  );
  assert.match(apiKeysSource, /return "\/go-live\?surface=go_live";/);

  assert.match(serviceAccountsSource, /buildVerificationChecklistHandoffHref/);
  assert.match(serviceAccountsSource, /return "\/verification\?surface=verification";/);
  assert.match(serviceAccountsSource, /buildVerificationChecklistHandoffHref\(\{ pathname: action\.path/);
  assert.match(serviceAccountsSource, /buildVerificationChecklistHandoffHref\(\{ pathname: "\/service-accounts"/);
  assert.match(serviceAccountsSource, /buildVerificationChecklistHandoffHref\(\{ pathname: "\/playground"/);
  assert.match(
    serviceAccountsSource,
    /buildVerificationChecklistHandoffHref\(\{\s*pathname: "\/verification\?surface=verification",/s,
  );
  assert.match(serviceAccountsSource, /return "\/go-live\?surface=go_live";/);

  assert.match(usageSource, /buildVerificationChecklistHandoffHref/);
  assert.match(usageSource, /\{ label: "Capture verification evidence", path: "\/verification\?surface=verification" \}/);
  assert.match(
    usageSource,
    /buildVerificationChecklistHandoffHref\(\{ pathname: "\/verification\?surface=verification", \.\.\.handoffHrefArgs \}\)/,
  );
  assert.match(usageSource, /buildVerificationChecklistHandoffHref\(\{ pathname: action\.path, \.\.\.handoffHrefArgs \}\)/);
});
