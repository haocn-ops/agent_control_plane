"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import type { ControlPlaneAdminDeliveryUpdateKind } from "@/lib/control-plane-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCurrentWorkspace } from "@/services/control-plane";

type UsageSource = "admin-attention" | "admin-readiness" | "onboarding";
type DeliveryContext = "recent_activity";

function normalizeSource(source?: string | null): UsageSource | null {
  if (source === "admin-attention" || source === "admin-readiness" || source === "onboarding") {
    return source;
  }
  return null;
}

function normalizeDeliveryContext(value?: string | null): DeliveryContext | null {
  return value === "recent_activity" ? value : null;
}

function normalizeRecentTrackKey(value?: string | null): "verification" | "go_live" | null {
  if (value === "verification" || value === "go_live") {
    return value;
  }
  return null;
}

function normalizeRecentUpdateKind(value?: string | null): ControlPlaneAdminDeliveryUpdateKind | null {
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

function normalizeEvidenceCount(value?: number | string | null): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildMetadataLines(metadata: {
  track?: "verification" | "go_live" | null;
  update?: ControlPlaneAdminDeliveryUpdateKind | null;
  evidence?: number | null;
  ownerLabel?: string | null;
}): string[] {
  const lines: string[] = [];
  if (metadata.ownerLabel) {
    lines.push(`Latest handoff owner: ${metadata.ownerLabel}`);
  }
  if (metadata.track) {
    lines.push(`Recent admin activity touched the ${metadata.track} track`);
  }
  if (metadata.update) {
    if (metadata.update === "evidence_only") {
      lines.push("Evidence links were added in this update");
    } else if (metadata.update.endsWith("_completed")) {
      lines.push("Track was marked complete");
    } else {
      lines.push("Tracking was refreshed");
    }
  }
  if (typeof metadata.evidence === "number") {
    if (metadata.evidence > 0) {
      lines.push(`${metadata.evidence} evidence ${metadata.evidence === 1 ? "link" : "links"} recorded`);
    } else {
      lines.push("No evidence links were recorded yet");
    }
  }
  return lines;
}

type ContextCard = {
  title: string;
  body: string;
  actions?: { label: string; path: string }[];
  metaLines?: string[];
};

function getContextCard(source: UsageSource | null, metadata: { summaryLines: string[] }): ContextCard | null {
  if (!source) {
    return null;
  }
  if (source === "admin-readiness") {
    return {
      title: "Admin readiness follow-up",
      body:
        "You arrived here from the Week 8 readiness summary. This dashboard stays read-only for usage pressure—record evidence and keep navigation cues aligned with the originating focus before returning to the admin view.",
      metaLines: metadata.summaryLines.length > 0 ? metadata.summaryLines : undefined,
    };
  }
  if (source === "admin-attention") {
    return {
      title: "Admin queue usage follow-up",
      body:
        "You arrived here from an admin follow-up path. Review usage pressure as supporting evidence, then continue manually into verification, go-live, or settings before returning to the admin queue.",
      actions: [
        { label: "Return to verification", path: "/verification" },
        { label: "Review billing + settings", path: "/settings" },
      ],
      metaLines: metadata.summaryLines.length > 0 ? metadata.summaryLines : undefined,
    };
  }
  if (source === "onboarding") {
    return {
      title: "Onboarding usage checkpoint",
      body:
        "Now that the playground run is complete, confirm the invited admins and that the onboarding service account used in the demo exists. Capture the run_id/trace_id so verification notes can cite them before moving to settings or billing follow-up.",
      actions: [
        { label: "Capture verification evidence", path: "/verification" },
        { label: "Review billing + features", path: "/settings" },
      ],
      metaLines: metadata.summaryLines.length > 0 ? metadata.summaryLines : undefined,
    };
  }
  return null;
}

function getFirstRunCallout(): { title: string; body: string } {
  return {
    title: "Governed first demo signal",
    body: "A successful first run should leave a usage trace we can point to in the Week 8 checklist. Confirm `billing_summary` shows the assigned plan, run a workspace demo through the Playground, and capture the `run_id`/`trace_id` before moving to verification or API key follow-up.",
  };
}

function buildFollowUpHref(args: {
  pathname: string;
  source: UsageSource | null;
  week8Focus?: string | null;
  attentionWorkspace?: string | null;
  attentionOrganization?: string | null;
  deliveryContext?: DeliveryContext | null;
  recentTrackKey?: "verification" | "go_live" | null;
  recentUpdateKind?: ControlPlaneAdminDeliveryUpdateKind | null;
  evidenceCount?: number | null;
  recentOwnerLabel?: string | null;
}): string {
  if (!args.source) {
    return args.pathname;
  }
  const searchParams = new URLSearchParams();
  searchParams.set("source", args.source);
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
  if (typeof args.evidenceCount === "number") {
    searchParams.set("evidence_count", String(args.evidenceCount));
  }
  if (args.recentOwnerLabel) {
    searchParams.set("recent_owner_label", args.recentOwnerLabel);
  }
  const query = searchParams.toString();
  return query ? `${args.pathname}?${query}` : args.pathname;
}

function formatPrice(monthlyPriceCents: number): string {
  if (monthlyPriceCents <= 0) {
    return "Custom / free";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(monthlyPriceCents / 100);
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString();
}

function formatMetricLabel(key: string): string {
  switch (key) {
    case "runs_created":
      return "Runs created";
    case "active_tool_providers":
      return "Active tool providers";
    case "artifact_storage_bytes":
      return "Artifact storage";
    default:
      return key.replaceAll("_", " ");
  }
}

function formatMetricValue(key: string, value: number): string {
  if (key !== "artifact_storage_bytes") {
    return String(value);
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatPercent(used: number, limit: number | null): number {
  if (!limit || limit <= 0) {
    return 0;
  }
  return Math.min(100, (used / limit) * 100);
}

function statusToneClasses(tone?: string): string {
  if (tone === "warning") {
    return "border-amber-500 bg-amber-50/90";
  }
  if (tone === "positive") {
    return "border-emerald-400 bg-emerald-50/70";
  }
  return "border-border bg-background";
}

function statusToneBadgeVariant(tone?: string): "strong" | "default" | "subtle" {
  if (tone === "warning") {
    return "default";
  }
  if (tone === "positive") {
    return "strong";
  }
  return "subtle";
}

function billingActionHelpText(availability?: string): string {
  if (availability === "staged") {
    return "This is a staged self-serve entry. Checkout is not live yet; next step is manual/support-assisted plan processing.";
  }
  return "This action is ready for workspace operators.";
}

function isEnabledFeature(value: unknown): boolean {
  return value === true;
}

export function WorkspaceUsageDashboard({
  workspaceSlug,
  source,
  week8Focus,
  attentionWorkspace,
  attentionOrganization,
  deliveryContext,
  recentTrackKey,
  recentUpdateKind,
  evidenceCount,
  recentOwnerLabel,
}: {
  workspaceSlug: string;
  source?: string | null;
  week8Focus?: string | null;
  attentionWorkspace?: string | null;
  attentionOrganization?: string | null;
  deliveryContext?: string | null;
  recentTrackKey?: string | null;
  recentUpdateKind?: string | null;
  evidenceCount?: number | null;
  recentOwnerLabel?: string | null;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["workspace-usage-dashboard", workspaceSlug],
    queryFn: fetchCurrentWorkspace,
  });

  const normalizedSource = normalizeSource(source);
  const contextCard = getContextCard(normalizedSource, {
    summaryLines: buildMetadataLines({
      track: normalizeRecentTrackKey(recentTrackKey),
      update: normalizeRecentUpdateKind(recentUpdateKind),
      evidence: evidenceCount ?? normalizeEvidenceCount(evidenceCount),
      ownerLabel: recentOwnerLabel,
    }),
  });
  const firstRunCallout = getFirstRunCallout();

  const workspace = data?.workspace;
  const plan = data?.plan;
  const billingSummary = data?.billing_summary;
  const usage = data?.usage;
  const metrics = usage ? Object.entries(usage.metrics) : [];
  const overLimitMetrics = metrics.filter(([, metric]) => metric.over_limit);
  const planLimitEntries = Object.entries(plan?.limits ?? {});
  const featureEntries = Object.entries(plan?.features ?? {});
  const enabledFeatures = featureEntries.filter(([, value]) => isEnabledFeature(value));
  const disabledFeatures = featureEntries.filter(([, value]) => !isEnabledFeature(value));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{firstRunCallout.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted">{firstRunCallout.body}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildFollowUpHref({
                pathname: "/playground",
                source: normalizedSource,
                week8Focus,
                attentionWorkspace,
                attentionOrganization,
                deliveryContext: normalizeDeliveryContext(deliveryContext),
                recentTrackKey: normalizeRecentTrackKey(recentTrackKey),
                recentUpdateKind: normalizeRecentUpdateKind(recentUpdateKind),
                evidenceCount,
                recentOwnerLabel,
              })}
              className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
            >
              Run a playground demo
            </Link>
            <Link
              href={buildFollowUpHref({
                pathname: "/verification",
                source: normalizedSource,
                week8Focus,
                attentionWorkspace,
                attentionOrganization,
                deliveryContext: normalizeDeliveryContext(deliveryContext),
                recentTrackKey: normalizeRecentTrackKey(recentTrackKey),
                recentUpdateKind: normalizeRecentUpdateKind(recentUpdateKind),
                evidenceCount,
                recentOwnerLabel,
              })}
              className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
            >
              Capture evidence in verification
            </Link>
            <Link
              href={buildFollowUpHref({
                pathname: "/api-keys",
                source: normalizedSource,
                week8Focus,
                attentionWorkspace,
                attentionOrganization,
                deliveryContext: normalizeDeliveryContext(deliveryContext),
                recentTrackKey: normalizeRecentTrackKey(recentTrackKey),
                recentUpdateKind: normalizeRecentUpdateKind(recentUpdateKind),
                evidenceCount,
                recentOwnerLabel,
              })}
              className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
            >
              Review API key scopes
            </Link>
          </div>
        </CardContent>
      </Card>
      {contextCard ? (
        <Card>
          <CardHeader>
            <CardTitle>{contextCard.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted">{contextCard.body}</p>
            {contextCard.metaLines?.length ? (
              <div className="space-y-1">
                {contextCard.metaLines.map((line) => (
                  <p key={line} className="text-xs text-muted">
                    {line}
                  </p>
                ))}
              </div>
            ) : null}
            {contextCard.actions?.length ? (
              <div className="flex flex-wrap gap-2">
                {contextCard.actions.map((action) => (
                  <Link
                    key={action.label}
                    href={buildFollowUpHref({
                      pathname: action.path,
                      source: normalizedSource,
                      week8Focus,
                      attentionWorkspace,
                      attentionOrganization,
                      deliveryContext: normalizeDeliveryContext(deliveryContext),
                      recentTrackKey: normalizeRecentTrackKey(recentTrackKey),
                      recentUpdateKind: normalizeRecentUpdateKind(recentUpdateKind),
                      evidenceCount,
                      recentOwnerLabel,
                    })}
                    className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Plan limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {planLimitEntries.length === 0 ? (
            <p className="text-muted text-xs">Plan limits are not available in this workspace.</p>
          ) : (
            <div className="space-y-2">
              {planLimitEntries.map(([metric, limit]) => (
                (() => {
                  const numericLimit = typeof limit === "number" ? limit : null;
                  return (
                    <div
                      key={metric}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted">{formatMetricLabel(metric)}</p>
                        <p className="text-sm font-semibold text-foreground">{String(limit ?? "Unlimited")}</p>
                      </div>
                      <p className="text-xs text-muted">
                        {formatPercent(usage?.metrics[metric]?.used ?? 0, numericLimit)}% used
                      </p>
                    </div>
                  );
                })()
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Usage metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {metrics.length === 0 ? (
            <p className="text-muted text-xs">No usage metrics available yet.</p>
          ) : (
            <div className="space-y-2">
              {metrics.map(([key, metric]) => (
                <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">{formatMetricLabel(key)}</p>
                    <p className="text-sm font-semibold text-foreground">{formatMetricValue(key, metric.used)}</p>
                  </div>
                  <div className="text-xs text-muted">
                    {metric.over_limit ? "Over limit" : `${formatPercent(metric.used, metric.limit)}% of limit`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Billing posture and window</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {billingSummary ? (
            <div className={`rounded-2xl border p-4 ${statusToneClasses(billingSummary.status_tone)}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Billing status</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{billingSummary.status_label}</p>
                </div>
                <Badge variant={statusToneBadgeVariant(billingSummary.status_tone)}>
                  {billingSummary.status}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted">{billingSummary.description}</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <p className="text-xs text-muted">Provider: {billingSummary.provider}</p>
                <p className="text-xs text-muted">
                  Plan binding: {billingSummary.plan_display_name ?? "Unassigned"} ({billingSummary.plan_code ?? "-"})
                </p>
                <p className="text-xs text-muted">
                  Next action: {billingSummary.action ? billingSummary.action.label : "Billing action not available"}
                </p>
                <p className="text-xs text-muted">{billingActionHelpText(billingSummary.action?.availability)}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted text-xs">Billing summary is unavailable for this workspace.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
