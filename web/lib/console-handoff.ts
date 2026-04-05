import type {
  ControlPlaneAdminDeliveryUpdateKind,
  ControlPlaneAdminWeek8ReadinessFocus,
} from "@/lib/control-plane-types";
import type { VerificationChecklistHandoffArgs } from "@/lib/handoff-query";
import { buildAdminReturnHref, buildHandoffHref } from "@/lib/handoff-query";

export type ConsoleSearchParams = Record<string, string | string[] | undefined> | undefined;

export type ConsoleHandoffSource = "admin-attention" | "admin-readiness" | "onboarding";
export type ConsoleDeliveryContext = "recent_activity";
export type ConsoleRecentTrackKey = "verification" | "go_live";

export type ConsoleHandoffState = {
  source: string | null;
  surface: string | null;
  attentionWorkspace: string | null;
  attentionOrganization: string | null;
  week8Focus: string | null;
  deliveryContext: string | null;
  recentTrackKey: string | null;
  recentUpdateKind: string | null;
  evidenceCount: number | null;
  recentOwnerLabel: string | null;
  recentOwnerDisplayName: string | null;
  recentOwnerEmail: string | null;
};

export type RecentDeliveryMetadata = {
  recentTrackKey: ConsoleRecentTrackKey | null;
  recentUpdateKind: ControlPlaneAdminDeliveryUpdateKind | null;
  recentEvidenceCount: number | null;
  recentOwnerLabel: string | null;
};

export type ConsoleAdminReturnState = {
  source: "admin-attention" | "admin-readiness" | null;
  showAttentionHandoff: boolean;
  showReadinessHandoff: boolean;
  showAdminReturn: boolean;
  adminReturnLabel: string;
  adminQueueSurface: ConsoleRecentTrackKey | null;
};

export function getConsoleParam(value?: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] : value;
}

export function parseConsoleEvidenceCount(value?: string | number | null): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function resolveConsoleHandoffSource(value?: string | null): ConsoleHandoffSource | null {
  if (value === "admin-attention" || value === "admin-readiness" || value === "onboarding") {
    return value;
  }
  return null;
}

export function resolveConsoleDeliveryContext(value?: string | null): ConsoleDeliveryContext | null {
  return value === "recent_activity" ? value : null;
}

export function resolveConsoleRecentTrackKey(value?: string | null): ConsoleRecentTrackKey | null {
  if (value === "verification" || value === "go_live") {
    return value;
  }
  return null;
}

export function resolveConsoleRecentUpdateKind(
  value?: string | null,
): ControlPlaneAdminDeliveryUpdateKind | null {
  if (
    value === "verification" ||
    value === "go_live" ||
    value === "verification_completed" ||
    value === "go_live_completed" ||
    value === "evidence_only"
  ) {
    return value;
  }
  return null;
}

export function resolveConsoleWeek8Focus(
  value?: string | null,
): ControlPlaneAdminWeek8ReadinessFocus | undefined {
  if (
    value === "baseline" ||
    value === "credentials" ||
    value === "demo_run" ||
    value === "billing_warning" ||
    value === "go_live_ready"
  ) {
    return value;
  }
  return undefined;
}

export function parseConsoleHandoffState(searchParams?: ConsoleSearchParams): ConsoleHandoffState {
  const recentOwnerDisplayName =
    getConsoleParam(searchParams?.recent_owner_display_name) ?? getConsoleParam(searchParams?.recent_owner_label);
  const recentOwnerEmail = getConsoleParam(searchParams?.recent_owner_email);

  return {
    source: getConsoleParam(searchParams?.source),
    surface: getConsoleParam(searchParams?.surface),
    attentionWorkspace: getConsoleParam(searchParams?.attention_workspace),
    attentionOrganization: getConsoleParam(searchParams?.attention_organization),
    week8Focus: getConsoleParam(searchParams?.week8_focus),
    deliveryContext: getConsoleParam(searchParams?.delivery_context),
    recentTrackKey: getConsoleParam(searchParams?.recent_track_key),
    recentUpdateKind: getConsoleParam(searchParams?.recent_update_kind),
    evidenceCount: parseConsoleEvidenceCount(getConsoleParam(searchParams?.evidence_count)),
    recentOwnerLabel: recentOwnerDisplayName ?? recentOwnerEmail,
    recentOwnerDisplayName,
    recentOwnerEmail,
  };
}

export function buildRecentDeliveryMetadata(handoff: ConsoleHandoffState): RecentDeliveryMetadata {
  return {
    recentTrackKey: resolveConsoleRecentTrackKey(handoff.recentTrackKey),
    recentUpdateKind: resolveConsoleRecentUpdateKind(handoff.recentUpdateKind),
    recentEvidenceCount: handoff.evidenceCount,
    recentOwnerLabel: handoff.recentOwnerLabel,
  };
}

export function parseRecentDeliveryMetadata(searchParams?: ConsoleSearchParams): RecentDeliveryMetadata {
  return buildRecentDeliveryMetadata(parseConsoleHandoffState(searchParams));
}

export function resolveAdminQueueSurface(
  value?: string | null,
): ConsoleRecentTrackKey | null {
  return resolveConsoleRecentTrackKey(value === "go-live" ? "go_live" : value);
}

export function resolveConsoleAdminQueueSurface(args: {
  surface?: string | null;
  recentTrackKey?: string | null;
}): ConsoleRecentTrackKey | null {
  return resolveAdminQueueSurface(args.surface) ?? resolveConsoleRecentTrackKey(args.recentTrackKey);
}

export function buildConsoleVerificationChecklistHandoffArgs(
  handoff: ConsoleHandoffState,
): Omit<VerificationChecklistHandoffArgs, "pathname"> {
  return {
    source: resolveConsoleHandoffSource(handoff.source),
    week8Focus: handoff.week8Focus,
    attentionWorkspace: handoff.attentionWorkspace,
    attentionOrganization: handoff.attentionOrganization,
    deliveryContext: resolveConsoleDeliveryContext(handoff.deliveryContext),
    recentTrackKey: resolveConsoleRecentTrackKey(handoff.recentTrackKey),
    recentUpdateKind: resolveConsoleRecentUpdateKind(handoff.recentUpdateKind),
    evidenceCount: handoff.evidenceCount,
    recentOwnerLabel: handoff.recentOwnerLabel,
  };
}

export function buildConsoleHandoffHref(pathname: string, handoff: ConsoleHandoffState): string {
  return buildHandoffHref(
    pathname,
    {
      source: resolveConsoleHandoffSource(handoff.source),
      week8Focus: handoff.week8Focus,
      attentionWorkspace: handoff.attentionWorkspace,
      attentionOrganization: handoff.attentionOrganization,
      deliveryContext: resolveConsoleDeliveryContext(handoff.deliveryContext),
      recentTrackKey: resolveConsoleRecentTrackKey(handoff.recentTrackKey),
      recentUpdateKind: resolveConsoleRecentUpdateKind(handoff.recentUpdateKind),
      evidenceCount: handoff.evidenceCount,
      recentOwnerLabel: handoff.recentOwnerLabel,
      recentOwnerDisplayName: handoff.recentOwnerDisplayName,
      recentOwnerEmail: handoff.recentOwnerEmail,
    },
    { preserveExistingQuery: true },
  );
}

export function buildConsoleAdminReturnState(args: {
  source?: string | null;
  surface?: string | null;
  expectedSurface: ConsoleRecentTrackKey;
  recentTrackKey?: string | null;
}): ConsoleAdminReturnState {
  const source = resolveConsoleHandoffSource(args.source);
  const normalizedSurface = resolveAdminQueueSurface(args.surface);
  const showAttentionHandoff = source === "admin-attention" && normalizedSurface === args.expectedSurface;
  const showReadinessHandoff = source === "admin-readiness";

  return {
    source: source === "admin-attention" || source === "admin-readiness" ? source : null,
    showAttentionHandoff,
    showReadinessHandoff,
    showAdminReturn: showAttentionHandoff || showReadinessHandoff,
    adminReturnLabel: showAttentionHandoff ? "Return to admin queue" : "Return to admin readiness view",
    adminQueueSurface: resolveConsoleAdminQueueSurface({
      surface: args.surface,
      recentTrackKey: args.recentTrackKey,
    }),
  };
}

export function buildConsoleAdminReturnHref(args: {
  pathname: string;
  handoff: ConsoleHandoffState;
  workspaceSlug: string;
  queueSurface?: ConsoleRecentTrackKey | null;
}): string {
  const source = resolveConsoleHandoffSource(args.handoff.source);
  const adminSource = source === "admin-attention" || source === "admin-readiness" ? source : null;

  return buildAdminReturnHref(args.pathname, {
    source: adminSource,
    queueSurface:
      args.queueSurface ??
      resolveConsoleAdminQueueSurface({
        surface: args.handoff.surface,
        recentTrackKey: args.handoff.recentTrackKey,
      }),
    week8Focus: args.handoff.week8Focus,
    attentionWorkspace: args.handoff.attentionWorkspace ?? args.workspaceSlug,
    attentionOrganization: args.handoff.attentionOrganization,
    deliveryContext: resolveConsoleDeliveryContext(args.handoff.deliveryContext),
    recentUpdateKind: resolveConsoleRecentUpdateKind(args.handoff.recentUpdateKind),
    evidenceCount: args.handoff.evidenceCount,
    recentOwnerLabel: args.handoff.recentOwnerLabel,
    recentOwnerDisplayName: args.handoff.recentOwnerDisplayName,
    recentOwnerEmail: args.handoff.recentOwnerEmail,
  });
}

function formatTrackLabel(trackKey?: ConsoleRecentTrackKey | null): string | null {
  if (trackKey === "go_live") {
    return "Go-live track";
  }
  if (trackKey === "verification") {
    return "Verification track";
  }
  return null;
}

function describeUpdateKind(kind?: ControlPlaneAdminDeliveryUpdateKind | null): string | null {
  switch (kind) {
    case "verification":
      return "Verification tracking refreshed";
    case "go_live":
      return "Go-live tracking refreshed";
    case "verification_completed":
      return "Verification completed";
    case "go_live_completed":
      return "Go-live completed";
    case "evidence_only":
      return "Evidence added";
    default:
      return null;
  }
}

export function buildRecentDeliveryDescription(
  base: string,
  metadata: RecentDeliveryMetadata,
): string {
  const parts: string[] = [];
  const trackLabel = formatTrackLabel(metadata.recentTrackKey);
  if (trackLabel) {
    parts.push(trackLabel);
  }
  const updateLabel = describeUpdateKind(metadata.recentUpdateKind);
  if (updateLabel) {
    parts.push(updateLabel);
  }
  if (metadata.recentEvidenceCount != null) {
    parts.push(
      `${metadata.recentEvidenceCount} evidence ${metadata.recentEvidenceCount === 1 ? "item" : "items"}`,
    );
  }
  if (metadata.recentOwnerLabel) {
    parts.push(`handled by ${metadata.recentOwnerLabel}`);
  }

  if (parts.length === 0) {
    return base;
  }
  return `${base} Latest admin handoff: ${parts.join(" · ")}.`;
}
