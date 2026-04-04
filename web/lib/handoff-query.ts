export type HandoffQueryArgs = {
  source?: string | null;
  surface?: string | null;
  week8Focus?: string | null;
  attentionWorkspace?: string | null;
  attentionOrganization?: string | null;
  deliveryContext?: string | null;
  recentTrackKey?: string | null;
  recentUpdateKind?: string | null;
  evidenceCount?: number | string | null;
  recentOwnerLabel?: string | null;
  recentOwnerDisplayName?: string | null;
  recentOwnerEmail?: string | null;
};

export type AdminReturnQueryArgs = {
  source?: string | null;
  queueSurface?: string | null;
  week8Focus?: string | null;
  attentionWorkspace?: string | null;
  attentionOrganization?: string | null;
  deliveryContext?: string | null;
  recentUpdateKind?: string | null;
  evidenceCount?: number | string | null;
  recentOwnerLabel?: string | null;
  recentOwnerDisplayName?: string | null;
  recentOwnerEmail?: string | null;
};

export function applyHandoffQuery(searchParams: URLSearchParams, args: HandoffQueryArgs): void {
  if (args.source) {
    searchParams.set("source", args.source);
  }
  if (args.surface) {
    searchParams.set("surface", args.surface);
  }
  if (args.week8Focus) {
    searchParams.set("week8_focus", args.week8Focus);
  }
  if (args.attentionWorkspace) {
    searchParams.set("attention_workspace", args.attentionWorkspace);
  }
  if (args.attentionOrganization) {
    searchParams.set("attention_organization", args.attentionOrganization);
  }
  if (args.deliveryContext) {
    searchParams.set("delivery_context", args.deliveryContext);
  }
  if (args.recentTrackKey) {
    searchParams.set("recent_track_key", args.recentTrackKey);
  }
  if (args.recentUpdateKind) {
    searchParams.set("recent_update_kind", args.recentUpdateKind);
  }
  if (args.evidenceCount !== null && args.evidenceCount !== undefined && String(args.evidenceCount) !== "") {
    searchParams.set("evidence_count", String(args.evidenceCount));
  }
  if (args.recentOwnerLabel) {
    searchParams.set("recent_owner_label", args.recentOwnerLabel);
  }
  if (args.recentOwnerDisplayName) {
    searchParams.set("recent_owner_display_name", args.recentOwnerDisplayName);
  }
  if (args.recentOwnerEmail) {
    searchParams.set("recent_owner_email", args.recentOwnerEmail);
  }
}

export function applyAdminReturnQuery(searchParams: URLSearchParams, args: AdminReturnQueryArgs): void {
  if (args.source === "admin-attention") {
    if (args.queueSurface) {
      searchParams.set("queue_surface", args.queueSurface);
    }
    searchParams.set("queue_returned", "1");
  }
  if (args.source === "admin-readiness") {
    if (args.week8Focus) {
      searchParams.set("week8_focus", args.week8Focus);
    }
    searchParams.set("readiness_returned", "1");
  }
  if (args.attentionWorkspace) {
    searchParams.set("attention_workspace", args.attentionWorkspace);
  }
  if (args.attentionOrganization) {
    searchParams.set("attention_organization", args.attentionOrganization);
  }
  if (args.deliveryContext) {
    searchParams.set("delivery_context", args.deliveryContext);
  }
  if (args.recentUpdateKind) {
    searchParams.set("recent_update_kind", args.recentUpdateKind);
  }
  if (args.evidenceCount !== null && args.evidenceCount !== undefined && String(args.evidenceCount) !== "") {
    searchParams.set("evidence_count", String(args.evidenceCount));
  }
  if (args.recentOwnerLabel) {
    searchParams.set("recent_owner_label", args.recentOwnerLabel);
  }
  if (args.recentOwnerDisplayName) {
    searchParams.set("recent_owner_display_name", args.recentOwnerDisplayName);
  }
  if (args.recentOwnerEmail) {
    searchParams.set("recent_owner_email", args.recentOwnerEmail);
  }
}

export function buildHandoffHref(
  pathname: string,
  args: HandoffQueryArgs,
  options?: {
    preserveExistingQuery?: boolean;
  },
): string {
  const [basePath, rawQuery] = pathname.split("?");
  const searchParams = new URLSearchParams(options?.preserveExistingQuery ? rawQuery ?? "" : "");
  applyHandoffQuery(searchParams, args);
  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildAdminReturnHref(pathname: string, args: AdminReturnQueryArgs): string {
  const [basePath, rawQuery] = pathname.split("?");
  const searchParams = new URLSearchParams(rawQuery ?? "");
  applyAdminReturnQuery(searchParams, args);
  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}
