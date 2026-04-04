import Link from "next/link";

import { AdminFollowUpNotice } from "@/components/admin/admin-follow-up-notice";
import { LogStream } from "@/components/logs/log-stream";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildHandoffHref, type HandoffQueryArgs } from "@/lib/handoff-query";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

function getParam(value?: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] : value;
}

function buildLogsHandoffHref(args: HandoffQueryArgs & { pathname: string; runId?: string | null }): string {
  const { pathname, runId, ...query } = args;
  const href = buildHandoffHref(pathname, query, { preserveExistingQuery: true });
  if (!runId) {
    return href;
  }

  const [basePath, rawQuery] = href.split("?");
  const searchParams = new URLSearchParams(rawQuery ?? "");
  searchParams.set("run_id", runId);
  const finalQuery = searchParams.toString();
  return finalQuery ? `${basePath}?${finalQuery}` : basePath;
}

const evidenceGuidance = {
  body:
    "Logs provide the operator trace that pairs with stored artifacts and checklist evidence. Treat this view as navigation context only: review the stream, then carry the same workspace handoff into the next evidence surface.",
  links: [
    { label: "Review artifacts", path: "/artifacts" },
    { label: "Capture verification evidence", path: "/verification?surface=verification" },
    { label: "Continue the go-live drill", path: "/go-live?surface=go_live" },
    { label: "Review settings handoff", path: "/settings" },
  ],
};

export default async function LogsPage({
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
  const requestedRunId = getParam(searchParams?.run_id) ?? getParam(searchParams?.runId);
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
    runId: requestedRunId,
  };

  return (
    <div className="space-y-8">
      {showAdminAttention ? (
        <AdminFollowUpNotice
          source="admin-attention"
          surface="logs"
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
      {showAdminReadiness ? (
        <AdminFollowUpNotice
          source="admin-readiness"
          surface="logs"
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
        eyebrow="Logs"
        title="Realtime and historical logs"
        description="Inspect workflow, approval, proxy, and dispatch traces for the current workspace before you save evidence elsewhere."
      />
      <Card>
        <CardHeader>
          <CardTitle>Evidence context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted">
          <p>{evidenceGuidance.body}</p>
          <p>
            Current workspace: <span className="font-medium text-foreground">{workspaceContext.workspace.slug}</span>
            {handoffWorkspace ? (
              <>
                {" "}
                · Requested from admin: <span className="font-medium text-foreground">{handoffWorkspace}</span>
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {evidenceGuidance.links.map((link) => (
              <Link
                key={link.label}
                href={buildLogsHandoffHref({ pathname: link.path, ...handoffArgs })}
                className="inline-flex items-center rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-background"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Live stream</CardTitle>
          <Badge variant="subtle">tailing</Badge>
        </CardHeader>
        <CardContent>
          <LogStream runId={requestedRunId} />
        </CardContent>
      </Card>
    </div>
  );
}
