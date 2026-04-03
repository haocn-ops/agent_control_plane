"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { disableServiceAccount, fetchServiceAccounts } from "@/services/control-plane";

type HandoffSource = "admin-attention" | "admin-readiness" | "onboarding";
type HandoffQuery = {
  source?: HandoffSource | null;
  week8Focus?: string | null;
  attentionWorkspace?: string | null;
  attentionOrganization?: string | null;
  deliveryContext?: string | null;
  recentTrackKey?: "verification" | "go_live" | null;
  recentUpdateKind?: string | null;
  evidenceCount?: number | null;
  recentOwnerLabel?: string | null;
};
type HandoffHrefArgs = HandoffQuery & { pathname: string };

function buildHandoffHref({ pathname, ...query }: HandoffHrefArgs): string {
  if (!query.source) {
    return pathname;
  }
  const searchParams = new URLSearchParams();
  searchParams.set("source", query.source);
  if (query.week8Focus) {
    searchParams.set("week8_focus", query.week8Focus);
  }
  if (query.attentionWorkspace) {
    searchParams.set("attention_workspace", query.attentionWorkspace);
  }
  if (query.attentionOrganization) {
    searchParams.set("attention_organization", query.attentionOrganization);
  }
  if (query.deliveryContext) {
    searchParams.set("delivery_context", query.deliveryContext);
  }
  if (query.recentTrackKey) {
    searchParams.set("recent_track_key", query.recentTrackKey);
  }
  if (query.recentUpdateKind) {
    searchParams.set("recent_update_kind", query.recentUpdateKind);
  }
  if (typeof query.evidenceCount === "number") {
    searchParams.set("evidence_count", String(query.evidenceCount));
  }
  if (query.recentOwnerLabel) {
    searchParams.set("recent_owner_label", query.recentOwnerLabel);
  }
  const search = searchParams.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function buildContextLines(params: {
  ownerLabel?: string | null;
  recentTrackKey?: "verification" | "go_live" | null;
  recentUpdateKind?: string | null;
  evidenceCount?: number | null;
}): string[] {
  const lines: string[] = [];
  if (params.ownerLabel) {
    lines.push(`Latest handoff owner: ${params.ownerLabel}`);
  }
  if (params.recentTrackKey) {
    const label = params.recentTrackKey === "go_live" ? "go-live" : "verification";
    lines.push(`Recent delivery tracked the ${label} surface`);
  }
  if (params.recentUpdateKind) {
    const phrase = params.recentUpdateKind.replaceAll("_", " ");
    lines.push(`Delivery update noted: ${phrase}`);
  }
  if (typeof params.evidenceCount === "number") {
    lines.push(
      params.evidenceCount > 0
        ? `${params.evidenceCount} evidence ${params.evidenceCount === 1 ? "link" : "links"} recorded`
        : "No evidence links yet",
    );
  }
  return lines;
}

function getContextCard(source: HandoffSource | null, lines: string[]): { title: string; body: string; actions: Array<{ label: string; path: string }>; metaLines?: string[] } | null {
  if (!source) {
    return null;
  }
  if (source === "admin-readiness") {
    return {
      title: "Admin readiness follow-up",
      body:
        "You followed the Week 8 readiness focus. Keep this page navigation-only while confirming service accounts, billing, or verification evidence before returning to the admin snapshot.",
      actions: [
        { label: "Return to verification", path: "/verification" },
        { label: "Continue to playground", path: "/playground" },
      ],
      metaLines: lines.length ? lines : undefined,
    };
  }
  if (source === "admin-attention") {
    return {
      title: "Admin queue follow-up",
      body: "You’re tracking a workspace in the admin attention queue. Review service accounts then manually continue into the pending verification, usage, or API key surfaces before returning to the queue.",
      actions: [
        { label: "Open verification", path: "/verification" },
        { label: "Inspect API keys", path: "/api-keys" },
      ],
      metaLines: lines.length ? lines : undefined,
    };
  }
  if (source === "onboarding") {
    return {
      title: "Onboarding guidance",
      body:
        "You arrived here via onboarding. Create the first service account, keep the scope narrow, and then use the workspace playground and verification pages to capture the evidence trace.",
      actions: [
        { label: "Run a playground demo", path: "/playground" },
        { label: "Capture verification evidence", path: "/verification" },
      ],
      metaLines: lines.length ? lines : undefined,
    };
  }
  return null;
}

type ServiceAccountsPanelProps = {
  workspaceSlug: string;
  source?: HandoffSource | string | null;
  week8Focus?: string | null;
  attentionWorkspace?: string | null;
  attentionOrganization?: string | null;
  deliveryContext?: string | null;
  recentTrackKey?: "verification" | "go_live" | null;
  recentUpdateKind?: string | null;
  evidenceCount?: number | null;
  recentOwnerLabel?: string | null;
};

function formatTime(value: string | null): string {
  if (!value) {
    return "never";
  }

  return new Date(value).toLocaleString();
}

export function ServiceAccountsPanel({
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
}: ServiceAccountsPanelProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["workspace-service-accounts", workspaceSlug],
    queryFn: fetchServiceAccounts,
  });

  const serviceAccounts = data ?? [];
  const disableMutation = useMutation({
    mutationFn: (serviceAccountId: string) => disableServiceAccount(serviceAccountId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace-service-accounts", workspaceSlug],
      });
    },
  });

  const normalizedSource: HandoffSource | null =
    source === "admin-attention" || source === "admin-readiness" || source === "onboarding"
      ? source
      : null;
  const metadataLines = buildContextLines({
    ownerLabel: recentOwnerLabel,
    recentTrackKey,
    recentUpdateKind,
    evidenceCount,
  });
  const contextCard = getContextCard(normalizedSource, metadataLines);
  const handoffHrefArgs: Omit<HandoffHrefArgs, "pathname"> = {
    source: normalizedSource,
    week8Focus,
    attentionWorkspace,
    attentionOrganization,
    deliveryContext,
    recentTrackKey,
    recentUpdateKind,
    evidenceCount,
    recentOwnerLabel,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service accounts</CardTitle>
        <CardDescription>Machine identities used to bind API keys and runtime traffic.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted">
          The first service account usually backs your onboarding demo or any workspace-scoped runtime call. Pair it with
          an API key scoped to `runs:write`; add approvals, cancel/replay, A2A, or MCP scopes later as needed.
        </p>
        {contextCard ? (
          <Card className="rounded-2xl border border-border bg-background p-4">
            <CardHeader>
              <CardTitle>{contextCard.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted">{contextCard.body}</p>
              {contextCard.metaLines ? (
                <div className="space-y-1 text-[0.65rem] text-muted">
                  {contextCard.metaLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {contextCard.actions.map((action) => (
                  <Link
                    key={action.label}
                    href={buildHandoffHref({ pathname: action.path, ...handoffHrefArgs })}
                    className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
              <p className="text-xs text-muted">
                These links preserve the admin handoff navigation context without impersonation, automation, or support tooling.
              </p>
            </CardContent>
          </Card>
        ) : null}
        <p className="text-sm text-muted">
          Use the governance path below to keep the evidence trace connected—service accounts, api keys, and playground runs all stay within the same navigation context.
        </p>
        {isLoading ? <p className="text-sm text-muted">Loading service accounts...</p> : null}
        {isError ? (
          <p className="text-sm text-muted">Service accounts endpoint unavailable, showing fallback state.</p>
        ) : null}
        {!isLoading && serviceAccounts.length === 0 ? (
          <p className="text-sm text-muted">No service accounts found for this workspace yet.</p>
        ) : null}
        <Card className="rounded-2xl border border-border bg-background p-4">
          <p className="font-medium text-foreground">First-run governance path</p>
          <p className="mt-1 text-xs text-muted">
            Pair the key with a workspace service account, then use `/playground` to submit the first `runs:write` request. Capture the `run_id` and reference it in `/usage` or `/verification` so the Week 8 checklist can see the trace.
          </p>
          <p className="mt-1 text-xs text-muted">
            When you need replay, cancel, approval, A2A send/cancel, or MCP calls, incrementally add the matching scopes (`runs:manage`, `approvals:write`, `a2a:write`, `mcp:call`) for the same key or rotate to a new one. Keep the scope list narrow—each permission should align with a real workflow.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={buildHandoffHref({ pathname: "/service-accounts", ...handoffHrefArgs })}
              className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
            >
              Review service accounts
            </Link>
            <Link
              href={buildHandoffHref({ pathname: "/playground", ...handoffHrefArgs })}
              className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
            >
              Run a verification demo
            </Link>
            <Link
              href={buildHandoffHref({ pathname: "/verification", ...handoffHrefArgs })}
              className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
            >
              Capture Week 8 evidence
            </Link>
          </div>
        </Card>

        {serviceAccounts.map((serviceAccount) => (
          <div
            key={serviceAccount.service_account_id}
            className="rounded-2xl border border-border bg-background p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{serviceAccount.name}</p>
                <p className="mt-1 text-xs text-muted">{serviceAccount.service_account_id}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="subtle">{serviceAccount.role}</Badge>
                <Badge variant={serviceAccount.status === "active" ? "strong" : "default"}>
                  {serviceAccount.status}
                </Badge>
              </div>
            </div>
            {serviceAccount.description ? (
              <p className="mt-2 text-sm text-muted">{serviceAccount.description}</p>
            ) : null}
            {serviceAccount.status === "active" ? (
              <p className="mt-2 text-xs text-muted">
                Disabling this identity blocks future key issuance and new runtime attachment, but does not auto-revoke
                existing API keys that were already created under it.
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">
                This identity is disabled. Existing historical keys may still need separate revocation if they should
                stop working immediately.
              </p>
            )}
            <p className="mt-3 text-xs text-muted">Created: {formatTime(serviceAccount.created_at)}</p>
            <p className="mt-1 text-xs text-muted">Last used: {formatTime(serviceAccount.last_used_at)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={
                  serviceAccount.status !== "active" ||
                  (disableMutation.isPending &&
                    disableMutation.variables === serviceAccount.service_account_id)
                }
                onClick={() => disableMutation.mutate(serviceAccount.service_account_id)}
              >
                {disableMutation.isPending && disableMutation.variables === serviceAccount.service_account_id
                  ? "Disabling…"
                  : "Disable"}
              </Button>
            </div>
          </div>
        ))}
        {disableMutation.isError ? (
          <p className="text-xs text-muted">Service account disable failed. Check workspace permissions and retry.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
