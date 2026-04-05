import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConsoleAdminReturnHref,
  buildConsoleAdminReturnState,
  buildConsoleHandoffHref,
  buildConsoleVerificationChecklistHandoffArgs,
  buildRecentDeliveryDescription,
  buildRecentDeliveryMetadata,
  parseConsoleEvidenceCount,
  parseConsoleHandoffState,
  resolveAdminQueueSurface,
} from "../console-handoff";

test("parseConsoleHandoffState normalizes shared search params and owner continuity", () => {
  const handoff = parseConsoleHandoffState({
    source: "admin-attention",
    surface: "go_live",
    attention_workspace: "ws-alpha",
    attention_organization: "org-alpha",
    week8_focus: "billing_warning",
    delivery_context: "recent_activity",
    recent_track_key: "verification",
    recent_update_kind: "verification_completed",
    evidence_count: "2",
    recent_owner_display_name: "Alice",
    recent_owner_email: "alice@example.com",
  });

  assert.equal(handoff.source, "admin-attention");
  assert.equal(handoff.surface, "go_live");
  assert.equal(handoff.attentionWorkspace, "ws-alpha");
  assert.equal(handoff.attentionOrganization, "org-alpha");
  assert.equal(handoff.week8Focus, "billing_warning");
  assert.equal(handoff.deliveryContext, "recent_activity");
  assert.equal(handoff.recentTrackKey, "verification");
  assert.equal(handoff.recentUpdateKind, "verification_completed");
  assert.equal(handoff.evidenceCount, 2);
  assert.equal(handoff.recentOwnerLabel, "Alice");
  assert.equal(handoff.recentOwnerDisplayName, "Alice");
  assert.equal(handoff.recentOwnerEmail, "alice@example.com");
});

test("parseConsoleEvidenceCount and queue surface helpers reject invalid values", () => {
  assert.equal(parseConsoleEvidenceCount(""), null);
  assert.equal(parseConsoleEvidenceCount("not-a-number"), null);
  assert.equal(parseConsoleEvidenceCount("3"), 3);
  assert.equal(resolveAdminQueueSurface("go-live"), "go_live");
  assert.equal(resolveAdminQueueSurface("verification"), "verification");
  assert.equal(resolveAdminQueueSurface("usage"), null);
});

test("buildConsoleVerificationChecklistHandoffArgs keeps only shared continuity contract", () => {
  const args = buildConsoleVerificationChecklistHandoffArgs(
    parseConsoleHandoffState({
      source: "admin-readiness",
      delivery_context: "other-context",
      recent_track_key: "go_live",
      recent_update_kind: "go_live_completed",
      evidence_count: "4",
      recent_owner_label: "Ops",
    }),
  );

  assert.equal(args.source, "admin-readiness");
  assert.equal(args.deliveryContext, null);
  assert.equal(args.recentTrackKey, "go_live");
  assert.equal(args.recentUpdateKind, "go_live_completed");
  assert.equal(args.evidenceCount, 4);
  assert.equal(args.recentOwnerLabel, "Ops");
});

test("buildConsoleHandoffHref preserves existing query and extended owner metadata", () => {
  const href = buildConsoleHandoffHref(
    "/settings?intent=manage-plan",
    parseConsoleHandoffState({
      source: "admin-attention",
      attention_workspace: "ws-beta",
      recent_track_key: "verification",
      evidence_count: "1",
      recent_owner_display_name: "Alice",
      recent_owner_email: "alice@example.com",
    }),
  );

  const parsed = new URL(`https://example.test${href}`);
  assert.equal(parsed.pathname, "/settings");
  assert.equal(parsed.searchParams.get("intent"), "manage-plan");
  assert.equal(parsed.searchParams.get("source"), "admin-attention");
  assert.equal(parsed.searchParams.get("attention_workspace"), "ws-beta");
  assert.equal(parsed.searchParams.get("recent_track_key"), "verification");
  assert.equal(parsed.searchParams.get("evidence_count"), "1");
  assert.equal(parsed.searchParams.get("recent_owner_display_name"), "Alice");
  assert.equal(parsed.searchParams.get("recent_owner_email"), "alice@example.com");
});

test("buildConsoleAdminReturnState and href keep admin queue/readiness semantics", () => {
  const handoff = parseConsoleHandoffState({
    source: "admin-attention",
    surface: "go_live",
    recent_track_key: "verification",
    attention_workspace: "ws-gamma",
    attention_organization: "org-gamma",
    recent_owner_display_name: "Alice",
  });
  const state = buildConsoleAdminReturnState({
    source: handoff.source,
    surface: handoff.surface,
    expectedSurface: "go_live",
    recentTrackKey: handoff.recentTrackKey,
  });

  assert.equal(state.showAttentionHandoff, true);
  assert.equal(state.showReadinessHandoff, false);
  assert.equal(state.showAdminReturn, true);
  assert.equal(state.adminReturnLabel, "Return to admin queue");
  assert.equal(state.adminQueueSurface, "go_live");

  const href = buildConsoleAdminReturnHref({
    pathname: "/admin",
    handoff,
    workspaceSlug: "ws-fallback",
    queueSurface: state.adminQueueSurface,
  });
  const parsed = new URL(`https://example.test${href}`);

  assert.equal(parsed.pathname, "/admin");
  assert.equal(parsed.searchParams.get("queue_surface"), "go_live");
  assert.equal(parsed.searchParams.get("queue_returned"), "1");
  assert.equal(parsed.searchParams.get("attention_workspace"), "ws-gamma");
  assert.equal(parsed.searchParams.get("attention_organization"), "org-gamma");
  assert.equal(parsed.searchParams.get("recent_owner_display_name"), "Alice");
});

test("buildRecentDeliveryDescription keeps stitched admin handoff copy centralized", () => {
  const description = buildRecentDeliveryDescription(
    "Track delivery state.",
    buildRecentDeliveryMetadata(
      parseConsoleHandoffState({
        recent_track_key: "verification",
        recent_update_kind: "evidence_only",
        evidence_count: "3",
        recent_owner_label: "Alice",
      }),
    ),
  );

  assert.equal(
    description,
    "Track delivery state. Latest admin handoff: Verification track · Evidence added · 3 evidence items · handled by Alice.",
  );
});
