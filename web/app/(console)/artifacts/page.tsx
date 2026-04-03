import { AdminFollowUpNotice } from "@/components/admin/admin-follow-up-notice";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { artifactRows } from "@/lib/mock-data";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type HandoffArgs = {
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
};

function buildHandoffLink(args: HandoffArgs): string {
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

const evidenceGuidance = {
  body:
    "Artifacts bundle execution evidence, logs, and audit payloads that support the verification checklist and mock go-live drill. This page does not change admin state; it only helps you carry the same workspace handoff into the next evidence surface.",
  links: [
    { label: "Continue to verification", path: "/verification" },
    { label: "Inspect go-live drill", path: "/go-live" },
    { label: "Review logs", path: "/logs" },
  ],
};

function getParam(value?: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] : value;
}

export default async function ArtifactsPage({
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
  const showAdminAttention = source === "admin-attention";
  const showAdminReadiness = source === "admin-readiness";
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
      {showAdminAttention || showAdminReadiness ? (
        <AdminFollowUpNotice
          source={showAdminAttention ? "admin-attention" : "admin-readiness"}
          surface="artifacts"
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
        eyebrow="Artifacts"
        title="Generated output and evidence"
        description="Review persisted bundles, workflow outputs, and audit payloads for traceable agent execution."
      />
      <Card>
        <CardHeader>
          <CardTitle>Evidence context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted">
          <p>{evidenceGuidance.body}</p>
          <div className="flex flex-wrap gap-2">
            {evidenceGuidance.links.map((link) => (
              <Link
                key={link.label}
                href={buildHandoffLink({ pathname: link.path, ...handoffArgs })}
                className="inline-flex items-center rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-background"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {artifactRows.map((artifact) => (
          <Card key={artifact.name}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{artifact.name}</CardTitle>
                <Badge variant="subtle">{artifact.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted">
              <p>Run: {artifact.runId}</p>
              <p>Size: {artifact.size}</p>
              <p>Updated: {artifact.updatedAt}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
