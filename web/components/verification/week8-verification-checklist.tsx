"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCurrentWorkspace } from "@/services/control-plane";

type ChecklistState = "complete" | "in_progress" | "pending";

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  state: ChecklistState;
};

type VerificationChecklistSource = "admin-readiness" | "admin-attention" | "onboarding";
type DeliveryContext = "recent_activity";

function stateLabel(state: ChecklistState): string {
  if (state === "complete") {
    return "Complete";
  }
  if (state === "in_progress") {
    return "In progress";
  }
  return "Pending";
}

function stateVariant(state: ChecklistState): "strong" | "default" | "subtle" {
  if (state === "complete") {
    return "strong";
  }
  if (state === "in_progress") {
    return "default";
  }
  return "subtle";
}

function sectionProgress(items: ChecklistItem[]): string {
  if (items.length === 0) {
    return "0/0";
  }
  const complete = items.filter((item) => item.state === "complete").length;
  return `${complete}/${items.length}`;
}

function normalizeSource(source?: string | null): VerificationChecklistSource | null {
  if (source === "admin-readiness" || source === "admin-attention" || source === "onboarding") {
    return source;
  }
  return null;
}

function normalizeDeliveryContext(value?: string | null): DeliveryContext | null {
  return value === "recent_activity" ? "recent_activity" : null;
}

function normalizeRecentTrackKey(value?: string | null): "verification" | "go_live" | null {
  if (value === "verification" || value === "go_live") {
    return value;
  }
  return null;
}

function normalizeRecentUpdateKind(value?: string | null): string | null {
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

function buildChecklistHref(
  pathname: string,
  source: VerificationChecklistSource | null,
  week8Focus?: string | null,
  attentionWorkspace?: string | null,
  attentionOrganization?: string | null,
  deliveryContext?: DeliveryContext | null,
  recentTrackKey?: "verification" | "go_live" | null,
  recentUpdateKind?: string | null,
  evidenceCount?: number | null,
  recentOwnerLabel?: string | null,
): string {
  if (!source) {
    return pathname;
  }
  const [basePath, rawQuery] = pathname.split("?", 2);
  const searchParams = new URLSearchParams(rawQuery ?? "");
  searchParams.set("source", source);
  if (week8Focus) {
    searchParams.set("week8_focus", week8Focus);
  }
  if (attentionWorkspace) {
    searchParams.set("attention_workspace", attentionWorkspace);
  }
  if (attentionOrganization) {
    searchParams.set("attention_organization", attentionOrganization);
  }
  if (deliveryContext) {
    searchParams.set("delivery_context", deliveryContext);
  }
  if (recentTrackKey) {
    searchParams.set("recent_track_key", recentTrackKey);
  }
  if (recentUpdateKind) {
    searchParams.set("recent_update_kind", recentUpdateKind);
  }
  if (typeof evidenceCount === "number") {
    searchParams.set("evidence_count", String(evidenceCount));
  }
  if (recentOwnerLabel) {
    searchParams.set("recent_owner_label", recentOwnerLabel);
  }
  return `${basePath}?${searchParams.toString()}`;
}

function buildSettingsIntentHref(
  intent: string | null,
  source: VerificationChecklistSource | null,
  week8Focus?: string | null,
  attentionWorkspace?: string | null,
  attentionOrganization?: string | null,
  deliveryContext?: DeliveryContext | null,
  recentTrackKey?: "verification" | "go_live" | null,
  recentUpdateKind?: string | null,
  evidenceCount?: number | null,
  recentOwnerLabel?: string | null,
): string {
  const baseHref = buildChecklistHref(
    "/settings",
    source,
    week8Focus,
    attentionWorkspace,
    attentionOrganization,
    deliveryContext,
    recentTrackKey,
    recentUpdateKind,
    evidenceCount,
    recentOwnerLabel,
  );
  if (!intent) {
    return baseHref;
  }
  const [basePath, rawQuery] = baseHref.split("?", 2);
  const searchParams = new URLSearchParams(rawQuery ?? "");
  searchParams.set("intent", intent);
  return `${basePath}?${searchParams.toString()}`;
}

function buildAdminEvidenceHref(args: {
  source: VerificationChecklistSource | null;
  week8Focus?: string | null;
  attentionWorkspace?: string | null;
  attentionOrganization?: string | null;
  recentTrackKey?: "verification" | "go_live" | null;
  deliveryContext?: DeliveryContext | null;
  recentUpdateKind?: string | null;
  evidenceCount?: number | null;
  recentOwnerLabel?: string | null;
}): string {
  const searchParams = new URLSearchParams();
  if (args.source === "admin-attention") {
    if (args.recentTrackKey) {
      searchParams.set("queue_surface", args.recentTrackKey);
    }
    searchParams.set("queue_returned", "1");
  }
  if (args.deliveryContext) {
    searchParams.set("delivery_context", args.deliveryContext);
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
  if (args.source === "admin-readiness" && args.week8Focus) {
    searchParams.set("week8_focus", args.week8Focus);
    searchParams.set("readiness_returned", "1");
  }
  if (args.attentionWorkspace) {
    searchParams.set("attention_workspace", args.attentionWorkspace);
  }
  if (args.attentionOrganization) {
    searchParams.set("attention_organization", args.attentionOrganization);
  }
  const query = searchParams.toString();
  return query ? `/admin?${query}` : "/admin";
}

export function Week8VerificationChecklist({
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
    queryKey: ["week8-verification", workspaceSlug],
    queryFn: fetchCurrentWorkspace,
  });

  const normalizedSource = normalizeSource(source);
  const normalizedDeliveryContext = normalizeDeliveryContext(deliveryContext);
  const normalizedRecentTrackKey = normalizeRecentTrackKey(recentTrackKey);
  const normalizedRecentUpdateKind = normalizeRecentUpdateKind(recentUpdateKind);
  const isOnboardingFlow = normalizedSource === "onboarding";

  const onboardingGuidanceItems = [
    {
      id: "onboarding-guidance-api-keys",
      label: "Create your first API key",
      description: "Finish the workspace service account and key setup so you can authenticate playground runs.",
      href: buildChecklistHref("/api-keys", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
    },
    {
      id: "onboarding-guidance-playground",
      label: "Run a demo request in Playground",
      description: "Send a request with the same workspace context to observe the request/response trace manually.",
      href: buildChecklistHref("/playground", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
    },
    {
      id: "onboarding-guidance-verification",
      label: "Return with evidence to verification",
      description: "Capture the run trace and mark the checklist items here to close the first-demo loop.",
      href: buildChecklistHref("/verification", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
    },
  ];

  const onboarding = data?.onboarding;
  const billing = data?.billing_summary;
  const plan = data?.plan;
  const usage = data?.usage;
  const metrics = usage?.metrics ?? {};
  const demoRunSucceeded = onboarding?.checklist.demo_run_succeeded === true;

  const onboardingItems: ChecklistItem[] = [
    {
      id: "onboarding-workspace",
      label: "Workspace created and selected",
      description: "Workspace can be loaded via SaaS metadata context.",
      href: buildChecklistHref("/onboarding", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
      state: data?.workspace ? "complete" : "pending",
    },
    {
      id: "onboarding-baseline",
      label: "Baseline bootstrap completed",
      description: "Provider and policy baseline seeded for safe first-run.",
      href: buildChecklistHref("/onboarding", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
      state: onboarding?.checklist.baseline_ready ? "complete" : onboarding?.checklist.workspace_created ? "in_progress" : "pending",
    },
    {
      id: "onboarding-credentials",
      label: "Service account and API key prepared",
      description: "At least one service account and key path verified.",
      href: buildChecklistHref("/onboarding", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
      state:
        onboarding?.checklist.service_account_created && onboarding?.checklist.api_key_created
          ? "complete"
          : onboarding?.checklist.service_account_created || onboarding?.checklist.api_key_created
          ? "in_progress"
          : "pending",
    },
  ];

  const billingItems: ChecklistItem[] = [
    {
      id: "billing-status",
      label: "Billing posture reviewed",
      description: "Current status, provider, and upgrade path reviewed via the managed billing surface.",
      href: buildSettingsIntentHref("manage-plan", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
      state: billing ? "complete" : "pending",
    },
    {
      id: "billing-warning",
      label: "No unresolved billing warning",
      description: "Past due or warning statuses are either resolved or tracked.",
      href: buildChecklistHref("/settings?intent=resolve-billing", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
      state: !billing ? "pending" : billing.status_tone === "warning" ? "in_progress" : "complete",
    },
    {
      id: "billing-usage",
      label: "Usage and plan pressure checked",
      description: "Billing window and limit pressure reviewed before go-live.",
      href: buildChecklistHref("/usage", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
      state: usage ? "complete" : "pending",
    },
  ];

  const runFlowItems: ChecklistItem[] = [
    {
      id: "run-demo-created",
      label: "Demo run created",
      description: "A first run has been submitted from onboarding or playground.",
      href: buildChecklistHref("/onboarding", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
      state: onboarding?.checklist.demo_run_created ? "complete" : "pending",
    },
    {
      id: "run-demo-succeeded",
      label: "Demo run succeeded",
      description: "At least one run completed successfully in workspace context.",
      href: buildChecklistHref("/onboarding", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
      state: onboarding?.checklist.demo_run_succeeded ? "complete" : onboarding?.checklist.demo_run_created ? "in_progress" : "pending",
    },
    {
      id: "run-playground",
      label: "Run flow validated in playground",
      description: "Request/response path reviewed for the selected workspace.",
      href: buildChecklistHref("/playground", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
      state: onboarding?.checklist.demo_run_created ? "in_progress" : "pending",
    },
  ];

  const evidenceItems: ChecklistItem[] = [
    {
      id: "evidence-usage",
      label: "Usage evidence captured",
      description: "Runs and active-provider metrics can be observed in usage dashboard.",
      href: buildChecklistHref("/usage", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
      state: typeof metrics.runs_created?.used === "number" && metrics.runs_created.used > 0 ? "complete" : "pending",
    },
    {
      id: "evidence-feature-gates",
      label: "Feature-gate posture reviewed",
      description: "Verify SSO, audit export, and dedicated environment gating through the upgrade intent so the feature set matches the new plan.",
      href: buildSettingsIntentHref(
        "upgrade",
        normalizedSource,
        week8Focus,
        attentionWorkspace,
        attentionOrganization,
        normalizedDeliveryContext,
        normalizedRecentTrackKey,
        normalizedRecentUpdateKind,
        evidenceCount,
        recentOwnerLabel,
      ),
      state: plan?.features ? "complete" : "pending",
    },
    {
      id: "evidence-admin",
      label: "Platform snapshot reviewed",
      description: "Admin overview reviewed with latest rollout and plan distribution.",
      href: buildAdminEvidenceHref({
        source: normalizedSource,
        week8Focus,
        attentionWorkspace,
        attentionOrganization,
        recentTrackKey: normalizedRecentTrackKey,
        deliveryContext: normalizedDeliveryContext,
        recentUpdateKind: normalizedRecentUpdateKind,
        evidenceCount,
        recentOwnerLabel,
      }),
      state: "in_progress",
    },
    {
      id: "evidence-go-live-drill",
      label: "Mock go-live drill staged",
      description: "Rehearsal phases and handoff evidence path reviewed in the go-live drill page.",
      href: buildChecklistHref("/go-live", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel),
      state: demoRunSucceeded ? "in_progress" : "pending",
    },
  ];

  const sections: Array<{ title: string; description: string; items: ChecklistItem[] }> = [
    {
      title: "Onboarding",
      description: "Workspace creation, baseline bootstrap, and credentials readiness.",
      items: onboardingItems,
    },
    {
      title: "Billing",
      description: "Billing posture and usage pressure checks before launch.",
      items: billingItems,
    },
    {
      title: "Run flow",
      description: "First run path validation from creation to success.",
      items: runFlowItems,
    },
    {
      title: "Evidence capture",
      description: "Operational evidence checkpoints for Week 8 handoff.",
      items: evidenceItems,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Week 8 checklist status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {isLoading ? <p className="text-muted">Loading workspace verification context...</p> : null}
          {isError ? <p className="text-muted">Unable to load live status, checklist still provides guided links.</p> : null}
          <p className="text-muted">
            Use this checklist as a shared readiness surface for onboarding, billing posture, first run validation,
            and evidence collection before a mock go-live drill.
          </p>
        </CardContent>
      </Card>

      {isOnboardingFlow ? (
        <Card>
          <CardHeader>
            <CardTitle>First-demo lane guidance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted">
              This verification surface is part of the onboarding lane, so these links preserve <code>source=onboarding</code> while you move from
              first key creation to the playground demo and back here for the final checklist evidence. Each step stays navigation-only—no automation, support,
              or impersonation is implied.
            </p>
            <div className="space-y-2">
              {onboardingGuidanceItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted">{item.description}</p>
                  </div>
                  <Link
                    href={item.href}
                    className="mt-3 inline-flex items-center rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-background"
                  >
                    Continue the ordered walkthrough
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Next steps for go-live readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted">
          <p>
            After ticking the Week 8 checklist, keep the same workspace context and use this page as the launch pad
            for the mock go-live drill. Record the run trace in{" "}
            <Link href={buildChecklistHref("/usage", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel)}>Usage</Link>, verify handoff
            notes in the delivery tracking panel on this page, and then open the{" "}
            <Link href={buildChecklistHref("/go-live", normalizedSource, week8Focus, attentionWorkspace, attentionOrganization, normalizedDeliveryContext, normalizedRecentTrackKey, normalizedRecentUpdateKind, evidenceCount, recentOwnerLabel)}>Go-live drill</Link> to
            rehearse the full flow. Each link simply switches context back to the workspace and carries the readiness
            focus along.
          </p>
        </CardContent>
      </Card>

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>{section.title}</span>
              <Badge variant="subtle">{sectionProgress(section.items)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted">{section.description}</p>
            {section.items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <Badge variant={stateVariant(item.state)}>{stateLabel(item.state)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">{item.description}</p>
                <Link
                  href={item.href}
                  className="mt-3 inline-flex items-center rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-background"
                >
                  Open related surface
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
