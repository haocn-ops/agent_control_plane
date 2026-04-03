import { AdminFollowUpNotice } from "@/components/admin/admin-follow-up-notice";
import { ApiKeysPanel } from "@/components/api-keys/api-keys-panel";
import { CreateApiKeyForm } from "@/components/api-keys/create-api-key-form";
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

function normalizeRecentTrackKey(value?: string | null): "verification" | "go_live" | null {
  if (value === "verification" || value === "go_live") {
    return value;
  }
  return null;
}

export default async function ApiKeysPage({
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
  const showOnboardingHint = source === "onboarding";
  const showReadinessHandoff = source === "admin-readiness";
  const showAttentionHandoff = source === "admin-attention";

  return (
    <div className="space-y-8">
      {showAttentionHandoff ? (
        <AdminFollowUpNotice
          source="admin-attention"
          surface="api-keys"
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
          surface="api-keys"
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
        eyebrow="API Keys"
        title="Credential lifecycle"
        description="Manage API keys, ownership metadata, scopes, and rotation windows for the control plane."
      />
      {showOnboardingHint ? (
        <Card>
          <CardHeader>
            <CardTitle>Onboarding context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted">
            <p>
              You arrived here while following the onboarding path. Generate a `runs:write` key, keep its secret
              safe, then immediately run the first demo via the Playground so Usage and Verification can capture the
              trace before widening scope.
            </p>
            <p>
              After that first run, add the additional scopes (replay/cancel, approvals, A2A, MCP) only when the
              verified trace justifies them, and rotate the key once you need new audit evidence.
            </p>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CreateApiKeyForm workspaceSlug={workspaceContext.workspace.slug} />
            <p className="text-xs text-muted">
              New API keys are only revealed once at creation time. Store the secret before navigating away.
            </p>
            <p className="text-xs text-muted">
              Rotation creates a replacement key and revokes the previous secret immediately, which is the safest path
              for routine rollover.
            </p>
            <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted">
              <p className="font-medium text-foreground">Recommended first-run scope</p>
              <p className="mt-1 text-xs text-muted">
                Start with `runs:write` for the first workspace demo flow. Add broader scopes only when the key also
                needs replay, cancel, approvals, MCP, or A2A actions.
              </p>
              <p className="mt-2 text-xs text-muted">
                After the first run queues via `/playground`, revisit `/usage` to capture run pressure and `/verification` to log the evidence before extending scope.
              </p>
            </div>
          </CardContent>
        </Card>

        <ApiKeysPanel
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
