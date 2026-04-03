import { AdminFollowUpNotice } from "@/components/admin/admin-follow-up-notice";
import { PlaygroundPanel } from "@/components/playground/playground-panel";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

function getParam(value?: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] : value;
}

export default async function PlaygroundPage({
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
  const recentTrackKey = getParam(searchParams?.recent_track_key);
  const recentUpdateKind = getParam(searchParams?.recent_update_kind);
  const evidenceCountParam = getParam(searchParams?.evidence_count);
  const evidenceCount =
    evidenceCountParam && !Number.isNaN(Number(evidenceCountParam)) ? Number(evidenceCountParam) : null;
  const ownerLabel =
    getParam(searchParams?.recent_owner_label) ?? getParam(searchParams?.recent_owner_display_name);
  const showReadinessHandoff = source === "admin-readiness";
  const showAttentionHandoff = source === "admin-attention";
  const showOnboardingHint = source === "onboarding";

  return (
    <div className="space-y-8">
      {showAttentionHandoff ? (
        <AdminFollowUpNotice
          source="admin-attention"
          surface="playground"
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
          surface="playground"
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
        eyebrow="Playground"
        title="Prompt, invoke, inspect"
        description="Use a Monaco-backed request editor to create a real run for the selected workspace and inspect the structured control-plane response."
      />
      {showOnboardingHint ? (
        <Card>
          <CardHeader>
            <CardTitle>Onboarding first demo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted">
            <p>
              This Playground session is part of the onboarding path—submit the first `POST /api/v1/runs` request,
              capture the `run_id`/`trace_id`, then visit `/usage` and `/verification` so the Week 8 checklist sees the evidence.
            </p>
          </CardContent>
        </Card>
      ) : null}
      <PlaygroundPanel
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
      <Card>
        <CardHeader>
          <CardTitle>Supported endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs text-muted">
          <p>POST /api/v1/runs</p>
          <p>GET /api/v1/runs/{"{run_id}"}</p>
          <p>GET /api/v1/runs/{"{run_id}"}/graph</p>
        </CardContent>
      </Card>
    </div>
  );
}
