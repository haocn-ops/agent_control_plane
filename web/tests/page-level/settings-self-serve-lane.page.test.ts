import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const settingsPagePath = path.resolve(testDir, "../../app/(console)/settings/page.tsx");
const workspaceContextSurfaceNoticePath = path.resolve(
  testDir,
  "../../components/console/workspace-context-surface-notice.tsx",
);
const workspaceContextCalloutPath = path.resolve(testDir, "../../components/workspace-context-callout.tsx");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("settings page keeps self-serve billing lane framing navigation-only and evidence-linked", async () => {
  const source = await readSource(settingsPagePath);

  assert.match(source, /<CardTitle>Enterprise evidence lane<\/CardTitle>/);
  assert.match(source, /import \{ WorkspaceContextSurfaceNotice \} from "@\/components\/console\/workspace-context-surface-notice";/);
  assert.match(source, /import \{ buildConsoleHandoffHref, parseConsoleHandoffState \} from "@\/lib\/console-handoff";/);
  assert.match(source, /const handoff = parseConsoleHandoffState\(searchParams\);/);
  assert.match(source, /const buildSettingsPageHref = \(pathname: string\) =>/);
  assert.match(source, /buildConsoleHandoffHref\(pathname,/);
  assert.match(source, /<WorkspaceContextSurfaceNotice[\s\S]*surfaceLabel="Settings"[\s\S]*sessionHref=\{buildSettingsPageHref\("\/session"\)\}/);
  assert.match(
    source,
    /description="Review workspace tenancy, self-serve billing follow-up, subscription status, and retention defaults while keeping the verification\/go-live\/admin-readiness governance lane connected\."/,
  );
  assert.match(
    source,
    /Use Settings as the manual governance surface for self-serve billing follow-up, portal-return status,\s*audit export, SSO readiness, and dedicated-environment planning\./,
  );
  assert.match(
    source,
    /These controls only preserve workspace handoff context and surface billing\/status cues\.\s*They do not open\s*support workflows, trigger automatic remediation, or impersonate another role\./,
  );
  assert.match(source, /Review usage pressure/);
  assert.match(
    source,
    /href=\{buildSettingsPageHref\("\/verification\?surface=verification"\)\}[\s\S]*?>\s*Capture verification evidence\s*<\/Link>/s,
  );
  assert.match(source, /href=\{buildSettingsPageHref\("\/usage"\)\}/);
  assert.match(source, /href=\{buildSettingsPageHref\("\/go-live\?surface=go_live"\)\}/);
  assert.match(source, /href=\{buildSettingsPageHref\("\/admin"\)\}/);
  assert.match(source, /<WorkspaceContextSurfaceNotice[\s\S]*surfaceLabel="Settings"/);
  assert.match(source, /sessionHref=\{buildSettingsPageHref\("\/session"\)\}/);
  assert.match(source, /Capture verification evidence/);
  assert.match(source, /Rehearse go-live readiness/);
  assert.match(source, /Return to admin readiness view/);
});

test("workspace context surface notice keeps metadata-vs-fallback checkpoint wording explicit", async () => {
  const source = await readSource(workspaceContextSurfaceNoticePath);

  assert.match(source, /<CardTitle>Workspace session checkpoint<\/CardTitle>/);
  assert.match(source, /Reconfirm the active session before/);
  assert.match(source, /Treat the current state as preview-only/);
  assert.match(source, /metadata-backed SaaS context/);
  assert.match(source, /Re-check session context/);
});

test("workspace context callout documents settings and verification usage surfaces", async () => {
  const source = await readSource(workspaceContextCalloutPath);

  assert.match(source, /"settings", "usage", "verification", "go-live"/);
  assert.match(source, /if \(surface === "settings"\) \{/);
  assert.match(
    source,
    /Confirm workspace identity before billing follow-up, SSO readiness, or dedicated-environment governance updates\./,
  );
  assert.match(source, /if \(surface === "verification"\) \{/);
  assert.match(
    source,
    /Confirm workspace identity before attaching verification notes, checklist evidence, or rollout readiness commentary\./,
  );
});
