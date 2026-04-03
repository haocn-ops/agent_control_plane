import Link from "next/link";

import { AdminFollowUpNotice } from "@/components/admin/admin-follow-up-notice";
import { CreateInvitationForm } from "@/components/members/create-invitation-form";
import { InvitationsPanel } from "@/components/members/invitations-panel";
import { MembersPanel } from "@/components/members/members-panel";
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

function buildHandoffHref(args: {
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

export default async function MembersPage({
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
  const showOnboardingFlow = source === "onboarding";
  const showReadinessHandoff = source === "admin-readiness";
  const showAttentionHandoff = source === "admin-attention";
  const handoffArgs = {
    source,
    week8Focus,
    attentionWorkspace: handoffWorkspace,
    attentionOrganization: handoffOrganization,
    deliveryContext,
    recentTrackKey,
    recentUpdateKind,
    evidenceCount,
    recentOwnerLabel: ownerLabel,
  };

  return (
    <div className="space-y-8">
      {showAttentionHandoff ? (
        <AdminFollowUpNotice
          source="admin-attention"
          surface="members"
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
          surface="members"
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
        eyebrow="Members"
        title="Workspace access"
        description="Review member roles, access status, and onboarding posture for the selected workspace."
      />
      {showOnboardingFlow ? (
        <Card>
          <CardHeader>
            <CardTitle>Onboarding context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted">
            <p>
              This workspace is in the onboarding lane. Invite at least one viewer, one operator, and one approver to
              cover audit, run, and legal gates before extending ever-broader access. Viewers keep verification evidence
              readable, operators run the first demos, and approvers close the Week 8 checklist. Continue with service
              account creation and then issue your first API key before stepping into the playground.
            </p>
            <p className="text-xs text-foreground">
              Next: create a service account, issue an API key, then run in the playground to capture the trace for verification.
            </p>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>First-team guidance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted">
            Start your workspace governance by inviting at least one viewer (for audit and verification), one operator (for run/integration tasks), and, if approvals are required, a legal/approver role. Spread these roles out so the first run and billing checks can be validated without overloading a single inbox. Keep the workspace owner slot for the person managing plans and billing actions.
          </p>
          <p className="text-xs text-muted">
            Once the first members accept via <code>/accept-invitation</code> and complete onboarding, each membership is tied to a workspace and a role; you can adjust the role later if operational needs change.
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <MembersPanel workspaceSlug={workspaceContext.workspace.slug} />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invite member</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CreateInvitationForm workspaceSlug={workspaceContext.workspace.slug} />
              <p className="text-xs text-muted">
                Invitations create pending access records first, then convert into memberships after acceptance.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
                  href="/accept-invitation"
                >
                  Open accept-invitation page
                </Link>
                {showOnboardingFlow ? (
                  <Link
                    className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
                    href={buildHandoffHref({ pathname: "/service-accounts", ...handoffArgs })}
                  >
                    Next: service accounts
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <InvitationsPanel workspaceSlug={workspaceContext.workspace.slug} />
        </div>
      </div>
    </div>
  );
}
