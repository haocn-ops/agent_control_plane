import Link from "next/link";

import { AdminFollowUpNotice } from "@/components/admin/admin-follow-up-notice";
import { PageHeader } from "@/components/page-header";
import { CreateServiceAccountForm } from "@/components/service-accounts/create-service-account-form";
import { ServiceAccountsPanel } from "@/components/service-accounts/service-accounts-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

function getParam(value?: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] : value;
}

function normalizeRecentTrackKey(value?: string | null): "verification" | "go_live" | null {
  if (value === "verification" || value === "go_live") {
    return value;
  }
  return null;
}

function buildPageHref(args: {
  pathname: string;
  source?: string | null;
  week8Focus?: string | null;
  attentionWorkspace?: string | null;
  attentionOrganization?: string | null;
  deliveryContext?: string | null;
  recentTrackKey?: string | null;
  recentUpdateKind?: string | null;
  evidenceCount?: number | null;
  recentOwnerLabel?: string | null;
}): string {
  const searchParams = new URLSearchParams();
  if (args.source) {
    searchParams.set("source", args.source);
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
  if (typeof args.evidenceCount === "number") {
    searchParams.set("evidence_count", String(args.evidenceCount));
  }
  if (args.recentOwnerLabel) {
    searchParams.set("recent_owner_label", args.recentOwnerLabel);
  }
  const query = searchParams.toString();
  return query ? `${args.pathname}?${query}` : args.pathname;
}

export default async function ServiceAccountsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const workspaceContext = await resolveWorkspaceContextForServer();
  const source = getParam(searchParams?.source);
  const handoffWorkspace = getParam(searchParams?.attention_workspace);
  const handoffOrganization = getParam(searchParams?.attention_organization);
  const week8Focus = getParam(searchParams?.week8_focus);
  const deliveryContext = getParam(searchParams?.delivery_context);
  const recentTrackKey = normalizeRecentTrackKey(getParam(searchParams?.recent_track_key));
  const recentUpdateKind = getParam(searchParams?.recent_update_kind);
  const evidenceCountParam = getParam(searchParams?.evidence_count);
  const evidenceCount =
    evidenceCountParam && !Number.isNaN(Number(evidenceCountParam)) ? Number(evidenceCountParam) : null;
  const ownerLabel =
    getParam(searchParams?.recent_owner_label) ?? getParam(searchParams?.recent_owner_display_name);
  const showReadinessHandoff = source === "admin-readiness";
  const showAttentionHandoff = source === "admin-attention";
  const showOnboardingContext = source === "onboarding";

  return (
    <div className="space-y-8">
      {showAttentionHandoff ? (
        <AdminFollowUpNotice
          source="admin-attention"
          surface="service-accounts"
          workspaceSlug={workspaceContext.workspace.slug}
          sourceWorkspaceSlug={handoffWorkspace}
          attentionOrganization={handoffOrganization}
          deliveryContext={deliveryContext}
          recentTrackKey={recentTrackKey}
          recentUpdateKind={recentUpdateKind}
          evidenceCount={evidenceCount}
          ownerDisplayName={ownerLabel}
        />
      ) : null}
      {showReadinessHandoff ? (
        <AdminFollowUpNotice
          source="admin-readiness"
          surface="service-accounts"
          workspaceSlug={workspaceContext.workspace.slug}
          sourceWorkspaceSlug={handoffWorkspace}
          week8Focus={week8Focus}
          attentionOrganization={handoffOrganization}
          deliveryContext={deliveryContext}
          recentTrackKey={recentTrackKey}
          recentUpdateKind={recentUpdateKind}
          evidenceCount={evidenceCount}
          ownerDisplayName={ownerLabel}
        />
      ) : null}
      <PageHeader
        eyebrow="Service Accounts"
        title="Machine identities"
        description="Create runtime identities for API keys, automation, and future service-to-service access control."
      />
      {showOnboardingContext ? (
        <Card>
          <CardHeader>
            <CardTitle>Onboarding guidance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted">
            <p>
              While onboarding, create the first service account before issuing the inaugural API key. Keep the scope tied
              to that account small—`runs:write` is enough for the first demo run—and then decide if replay, cancel, approval,
              A2A, or MCP operations need extra scopes.
            </p>
            <p className="text-xs text-foreground">
              Next step: issue the first API key, run the playground demo, capture the trace, and move into verification.
            </p>
            <Link
              href={buildPageHref({
                pathname: "/api-keys",
                source,
                week8Focus,
                attentionWorkspace: handoffWorkspace,
                attentionOrganization: handoffOrganization,
                deliveryContext,
                recentTrackKey,
                recentUpdateKind,
                evidenceCount,
                recentOwnerLabel: ownerLabel,
              })}
              className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
            >
              Create the first API key
            </Link>
          </CardContent>
        </Card>
        ) : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create service account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CreateServiceAccountForm workspaceSlug={workspaceContext.workspace.slug} />
            <p className="text-xs text-muted">
              Start with a single service account for the first workspace demo or any external runtime flow you want to
              run via an API key. Bind future API key scope to `runs:write` so northbound calls stay aligned with the
              control-plane contract; add broader scope only when you need cancel/replay, approvals, A2A, or MCP calls.
            </p>
            <p className="text-xs text-muted">
              The role field is a governance tag that helps describe what the account is for, but it does not change the
              scopes an API key grants. Scopes live on the key itself, so pair each new service account with the key
              scope you expect to need.
            </p>
            <p className="text-xs text-muted">
              Use distinct service accounts per workload so API keys, usage, and audit trails stay attributable.
            </p>
            <p className="text-xs text-muted">
              Disable service accounts when a workload is retired, then separately revoke any surviving API keys that
              should stop working right away.
            </p>
          </CardContent>
        </Card>

        <ServiceAccountsPanel
          workspaceSlug={workspaceContext.workspace.slug}
          source={source}
          week8Focus={week8Focus}
          attentionWorkspace={handoffWorkspace}
          attentionOrganization={handoffOrganization}
          deliveryContext={deliveryContext}
          recentTrackKey={recentTrackKey}
          recentUpdateKind={recentUpdateKind}
          evidenceCount={evidenceCount}
          recentOwnerLabel={ownerLabel}
        />
      </div>
    </div>
  );
}
