import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const verificationPagePath = path.resolve(testDir, "../../app/(console)/verification/page.tsx");
const goLivePagePath = path.resolve(testDir, "../../app/(console)/go-live/page.tsx");
const goLivePanelPath = path.resolve(testDir, "../../components/go-live/mock-go-live-drill-panel.tsx");
const handoffHelperPath = path.resolve(testDir, "../../lib/console-handoff.ts");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("Verification page keeps console handoff helper contract and admin return continuity", async () => {
  const source = await readSource(verificationPagePath);

  assert.match(
    source,
    /import \{\s*buildConsoleAdminReturnHref,\s*buildConsoleAdminReturnState,\s*buildConsoleHandoffHref,\s*buildConsoleVerificationChecklistHandoffArgs,\s*buildRecentDeliveryDescription,\s*buildRecentDeliveryMetadata,\s*parseConsoleHandoffState,\s*\} from "@\/lib\/console-handoff";/s,
  );
  assert.match(source, /const handoff = parseConsoleHandoffState\(searchParams\);/);
  assert.match(source, /const recentDeliveryMetadata = buildRecentDeliveryMetadata\(handoff\);/);
  assert.match(source, /const handoffHrefArgs = buildConsoleVerificationChecklistHandoffArgs\(handoff\);/);
  assert.match(
    source,
    /const adminReturnState = buildConsoleAdminReturnState\(\{\s*source: handoff\.source,\s*surface: handoff\.surface,\s*expectedSurface: "verification",\s*recentTrackKey: handoff\.recentTrackKey,\s*\}\);/s,
  );
  assert.match(
    source,
    /const adminReturnHref = buildConsoleAdminReturnHref\(\{\s*pathname: "\/admin",\s*handoff,\s*workspaceSlug: workspaceContext\.workspace\.slug,\s*queueSurface: adminReturnState\.adminQueueSurface,\s*\}\);/s,
  );

  assert.match(source, /\{adminReturnState\.showAttentionHandoff \? \(/);
  assert.match(source, /<AdminFollowUpNotice[\s\S]*source="admin-attention"[\s\S]*surface="verification"/);
  assert.match(source, /\{adminReturnState\.showReadinessHandoff \? \(/);
  assert.match(source, /<AdminFollowUpNotice[\s\S]*source="admin-readiness"[\s\S]*surface="verification"/);
  assert.match(source, /\{adminReturnState\.showAdminReturn \? \(/);
  assert.match(source, /href=\{adminReturnHref\}/);
  assert.match(source, /\{adminReturnState\.adminReturnLabel\}/);

  assert.match(source, /<WorkspaceContextSurfaceNotice[\s\S]*surfaceLabel="Verification"/);
  assert.match(
    source,
    /sessionHref=\{buildConsoleHandoffHref\("\/session", handoff\)\}/,
  );
});

test("Verification page keeps explicit go_live continuation link contract", async () => {
  const source = await readSource(verificationPagePath);

  assert.match(source, /<CardTitle>Verification evidence lane<\/CardTitle>/);
  assert.match(
    source,
    /href=\{buildVerificationChecklistHandoffHref\(\{ pathname: "\/go-live\?surface=go_live", \.\.\.handoffHrefArgs \}\)\}[\s\S]*?>\s*Continue to go-live drill\s*<\/Link>/s,
  );
});

test("Go-live page keeps console handoff helper contract and explicit surface query continuity", async () => {
  const source = await readSource(goLivePagePath);

  assert.match(
    source,
    /import \{\s*buildConsoleAdminReturnHref,\s*buildConsoleAdminReturnState,\s*buildConsoleHandoffHref,\s*buildRecentDeliveryDescription,\s*buildRecentDeliveryMetadata,\s*parseConsoleHandoffState,\s*\} from "@\/lib\/console-handoff";/s,
  );
  assert.match(source, /const handoff = parseConsoleHandoffState\(searchParams\);/);
  assert.match(source, /const goLiveMetadata = buildRecentDeliveryMetadata\(handoff\);/);
  assert.match(
    source,
    /const adminReturnState = buildConsoleAdminReturnState\(\{\s*source: handoff\.source,\s*surface: handoff\.surface,\s*expectedSurface: "go_live",\s*recentTrackKey: handoff\.recentTrackKey,\s*\}\);/s,
  );
  assert.match(source, /const verificationHref = buildConsoleHandoffHref\("\/verification\?surface=verification", handoff\);/);
  assert.match(source, /const usageHref = buildConsoleHandoffHref\("\/usage", handoff\);/);
  assert.match(source, /const settingsHref = buildConsoleHandoffHref\("\/settings", handoff\);/);
  assert.match(source, /const playgroundHref = buildConsoleHandoffHref\("\/playground", handoff\);/);
  assert.match(source, /const artifactsHref = buildConsoleHandoffHref\("\/artifacts", handoff\);/);
  assert.match(
    source,
    /const adminReturnHref = buildConsoleAdminReturnHref\(\{\s*pathname: "\/admin",\s*handoff,\s*workspaceSlug: workspaceContext\.workspace\.slug,\s*queueSurface: adminReturnState\.adminQueueSurface,\s*\}\);/s,
  );
  assert.match(source, /const adminHref = adminReturnState\.showAdminReturn \? adminReturnHref : "\/admin";/);
  assert.match(
    source,
    /const adminLinkLabel = adminReturnState\.showAdminReturn \? adminReturnState\.adminReturnLabel : "Admin overview";/,
  );

  assert.match(source, /<WorkspaceContextSurfaceNotice[\s\S]*surfaceLabel="Go-live drill"/);
  assert.match(source, /sessionHref=\{buildConsoleHandoffHref\("\/session", handoff\)\}/);
  assert.match(source, /\{adminReturnState\.showAttentionHandoff \? \(/);
  assert.match(source, /\{adminReturnState\.showReadinessHandoff \? \(/);
  assert.match(source, /\{adminReturnState\.showAdminReturn \? \(/);
  assert.match(source, /\{adminReturnState\.adminReturnLabel\}/);
});

test("Delivery description stitching stays centralized in console handoff helper", async () => {
  const [verificationSource, goLiveSource, helperSource] = await Promise.all([
    readSource(verificationPagePath),
    readSource(goLivePagePath),
    readSource(handoffHelperPath),
  ]);

  assert.match(verificationSource, /const recentDeliveryMetadata = buildRecentDeliveryMetadata\(handoff\);/);
  assert.match(verificationSource, /const verificationDeliveryDescription = buildRecentDeliveryDescription\(/);
  assert.match(goLiveSource, /const goLiveMetadata = buildRecentDeliveryMetadata\(handoff\);/);
  assert.match(goLiveSource, /const goLiveDeliveryDescription = buildRecentDeliveryDescription\(/);

  assert.match(helperSource, /const parts: string\[\] = \[\];/);
  assert.match(helperSource, /const trackLabel = formatTrackLabel\(metadata\.recentTrackKey\);/);
  assert.match(helperSource, /const updateLabel = describeUpdateKind\(metadata\.recentUpdateKind\);/);
  assert.match(
    helperSource,
    /`\$\{metadata\.recentEvidenceCount\} evidence \$\{metadata\.recentEvidenceCount === 1 \? "item" : "items"\}`/,
  );
  assert.match(helperSource, /parts\.push\(`handled by \$\{metadata\.recentOwnerLabel\}`\);/);
  assert.match(helperSource, /return `\$\{base\} Latest admin handoff: \$\{parts\.join\(" · "\)\}\.`;/);
});

test("Go-live drill panel keeps verification handoff link surface semantics for admin-attention continuity", async () => {
  const source = await readSource(goLivePanelPath);

  assert.match(source, /href: buildHref\("\/verification\?surface=verification"\),/);
});
