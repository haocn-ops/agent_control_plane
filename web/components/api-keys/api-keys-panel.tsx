"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { revokeApiKey, rotateApiKey, fetchApiKeys } from "@/services/control-plane";
import type { ControlPlaneAdminDeliveryUpdateKind } from "@/lib/control-plane-types";

function formatScope(scope: string[]): string {
  if (scope.length === 0) {
    return "legacy full access (compat)";
  }
  return scope.join(", ");
}

function formatTime(value: string | null): string {
  if (!value) {
    return "never";
  }
  return new Date(value).toLocaleString();
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function normalizeScope(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

type ApiKeysSource = "admin-attention" | "admin-readiness" | "onboarding";
type DeliveryContext = "recent_activity";

function normalizeSource(source?: string | null): ApiKeysSource | null {
  if (source === "admin-attention" || source === "admin-readiness" || source === "onboarding") {
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
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

type HandoffLinkArgs = {
  pathname: string;
  source?: ApiKeysSource | null;
  week8Focus?: string | null;
  attentionWorkspace?: string | null;
  attentionOrganization?: string | null;
  deliveryContext?: DeliveryContext | null;
  recentTrackKey?: "verification" | "go_live" | null;
  recentUpdateKind?: ControlPlaneAdminDeliveryUpdateKind | null;
  evidenceCount?: number | null;
  recentOwnerLabel?: string | null;
};

function buildApiKeysHref(args: HandoffLinkArgs): string {
  const [basePath, rawQuery] = args.pathname.split("?", 2);
  const searchParams = new URLSearchParams(rawQuery ?? "");
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
  return query ? `${basePath}?${query}` : basePath;
}

function describeRecentDeliverySummary(args: {
  recentTrackKey?: "verification" | "go_live" | null;
  recentUpdateKind?: ControlPlaneAdminDeliveryUpdateKind | null;
  evidenceCount?: number | null;
  recentOwnerLabel?: string | null;
}): string {
  const parts = [
    args.recentTrackKey ? `${args.recentTrackKey} track` : null,
    args.recentUpdateKind ? args.recentUpdateKind.replaceAll("_", " ") : null,
    typeof args.evidenceCount === "number"
      ? `${args.evidenceCount} evidence ${args.evidenceCount === 1 ? "item" : "items"}`
      : null,
    args.recentOwnerLabel ? `owner ${args.recentOwnerLabel}` : null,
  ].filter(Boolean);
  return parts.length ? `Latest admin context: ${parts.join(" · ")}.` : "";
}


type RotateFormState = {
  serviceAccountId: string;
  scope: string;
  expiresAt: string;
};

function buildInitialRotateState(key: {
  service_account_id: string | null;
  scope: string[];
  expires_at: string | null;
}): RotateFormState {
  return {
    serviceAccountId: key.service_account_id ?? "",
    scope: key.scope.join(", "),
    expiresAt: toDateTimeLocalValue(key.expires_at),
  };
}

export function ApiKeysPanel({
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
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["workspace-api-keys", workspaceSlug],
    queryFn: fetchApiKeys,
  });

  const keys = data ?? [];
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [rotateForms, setRotateForms] = useState<Record<string, RotateFormState>>({});

  const normalizedSource = normalizeSource(source);
  const normalizedDeliveryContext = normalizeDeliveryContext(deliveryContext);
  const normalizedRecentTrackKey = normalizeRecentTrackKey(recentTrackKey);
  const normalizedRecentUpdateKind = normalizeRecentUpdateKind(recentUpdateKind);
  const normalizedEvidenceCount = normalizeEvidenceCount(evidenceCount);
  const metadataDescription =
    normalizedDeliveryContext === "recent_activity"
      ? describeRecentDeliverySummary({
          recentTrackKey: normalizedRecentTrackKey,
          recentUpdateKind: normalizedRecentUpdateKind,
          evidenceCount: normalizedEvidenceCount,
          recentOwnerLabel,
        })
      : "";
  const handoffHrefArgs = {
    source: normalizedSource,
    week8Focus,
    attentionWorkspace,
    attentionOrganization,
    deliveryContext: normalizedDeliveryContext,
    recentTrackKey: normalizedRecentTrackKey,
    recentUpdateKind: normalizedRecentUpdateKind,
    evidenceCount: normalizedEvidenceCount,
    recentOwnerLabel,
  } satisfies Omit<HandoffLinkArgs, "pathname">;
  const serviceAccountsHref = buildApiKeysHref({ pathname: "/service-accounts", ...handoffHrefArgs });
  const playgroundHref = buildApiKeysHref({ pathname: "/playground", ...handoffHrefArgs });
  const verificationHref = buildApiKeysHref({ pathname: "/verification", ...handoffHrefArgs });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace-api-keys", workspaceSlug],
      });
    },
  });

  const rotateMutation = useMutation({
    mutationFn: async (input: {
      apiKeyId: string;
      serviceAccountId?: string;
      scope?: string[];
      expiresAt?: string | null;
    }) =>
      rotateApiKey(input.apiKeyId, {
        service_account_id: input.serviceAccountId,
        scope: input.scope,
        expires_at: input.expiresAt ?? null,
      }),
    onSuccess: async (result, variables) => {
      setRevealedSecrets((current) => ({
        ...current,
        [result.api_key.api_key_id]: result.secret_key ?? "",
      }));
      setExpandedKeyId(null);
      setRotateForms((current) => {
        const next = { ...current };
        delete next[variables.apiKeyId];
        return next;
      });
      await queryClient.invalidateQueries({
        queryKey: ["workspace-api-keys", workspaceSlug],
      });
    },
  });

  const sortedKeys = useMemo(
    () =>
      [...keys].sort((left, right) => {
        if (left.status === right.status) {
          return right.created_at.localeCompare(left.created_at);
        }
        if (left.status === "active") {
          return -1;
        }
        if (right.status === "active") {
          return 1;
        }
        return left.status.localeCompare(right.status);
      }),
    [keys],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Existing keys</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <p className="text-sm text-muted">Loading API keys...</p> : null}
        {isError ? <p className="text-sm text-muted">API keys endpoint unavailable, showing fallback state.</p> : null}
        {!isLoading && sortedKeys.length === 0 ? (
          <p className="text-sm text-muted">No API keys found for this workspace yet.</p>
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
                href={serviceAccountsHref}
                className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
              >
                Review service accounts
              </Link>
              <Link
                href={playgroundHref}
                className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
              >
                Run a verification demo
              </Link>
              <Link
                href={verificationHref}
                className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
              >
                Capture Week 8 evidence
              </Link>
          </div>
        </Card>

        {metadataDescription ? (
          <Card className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.15em] text-muted">Admin context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted">
              <p>{metadataDescription}</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={verificationHref}
                  className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
                >
                  Continue to verification
                </Link>
                <Link
                  href={serviceAccountsHref}
                  className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
                >
                  Review service accounts
                </Link>
                <Link
                  href={playgroundHref}
                  className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
                >
                  Run a governance demo
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {sortedKeys.map((key) => {
          const rotateForm = rotateForms[key.api_key_id] ?? buildInitialRotateState(key);
          const revealedSecret = revealedSecrets[key.api_key_id];
          const isRotateOpen = expandedKeyId === key.api_key_id;
          const isRevoked = key.status === "revoked";
          const isActive = key.status === "active";

          return (
            <div key={key.api_key_id} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{key.key_prefix}</p>
                  <p className="mt-1 text-xs text-muted">Key ID: {key.api_key_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isActive ? "strong" : "default"}>{key.status}</Badge>
                </div>
              </div>

              <p className="mt-2 text-sm text-muted">{formatScope(key.scope)}</p>
              <p className="mt-1 text-xs text-muted">
                Service account: {key.service_account_name ?? key.service_account_id ?? "workspace default"}
              </p>
              <p className="mt-3 text-xs text-muted">Created: {formatTime(key.created_at)}</p>
              <p className="mt-1 text-xs text-muted">Last used: {formatTime(key.last_used_at)}</p>
              <p className="mt-1 text-xs text-muted">Expires: {formatTime(key.expires_at)}</p>
              {isRevoked ? <p className="mt-1 text-xs text-muted">Revoked: {formatTime(key.revoked_at)}</p> : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!isActive || revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate(key.api_key_id)}
                >
                  {revokeMutation.isPending ? "Revoking..." : "Revoke"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!isActive}
                  onClick={() => {
                    setRotateForms((current) => ({
                      ...current,
                      [key.api_key_id]: current[key.api_key_id] ?? buildInitialRotateState(key),
                    }));
                    setExpandedKeyId((current) => (current === key.api_key_id ? null : key.api_key_id));
                  }}
                >
                  {isRotateOpen ? "Hide rotate form" : "Rotate"}
                </Button>
              </div>

              {isRotateOpen ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-border/80 bg-card p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted">Rotate key</p>
                  <Input
                    placeholder="Service account ID (optional)"
                    value={rotateForm.serviceAccountId}
                    onChange={(event) =>
                      setRotateForms((current) => ({
                        ...current,
                        [key.api_key_id]: {
                          ...rotateForm,
                          serviceAccountId: event.currentTarget.value,
                        },
                      }))
                    }
                  />
                  <Input
                    placeholder="Scopes, comma separated (for example: runs:write, runs:manage)"
                    value={rotateForm.scope}
                    onChange={(event) =>
                      setRotateForms((current) => ({
                        ...current,
                        [key.api_key_id]: {
                          ...rotateForm,
                          scope: event.currentTarget.value,
                        },
                      }))
                    }
                  />
                  <Input
                    type="datetime-local"
                    value={rotateForm.expiresAt}
                    onChange={(event) =>
                      setRotateForms((current) => ({
                        ...current,
                        [key.api_key_id]: {
                          ...rotateForm,
                          expiresAt: event.currentTarget.value,
                        },
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={rotateMutation.isPending}
                      onClick={() =>
                        rotateMutation.mutate({
                          apiKeyId: key.api_key_id,
                          serviceAccountId: rotateForm.serviceAccountId.trim() || undefined,
                          scope: normalizeScope(rotateForm.scope),
                          expiresAt: rotateForm.expiresAt
                            ? new Date(rotateForm.expiresAt).toISOString()
                            : null,
                        })
                      }
                    >
                      {rotateMutation.isPending ? "Rotating..." : "Rotate and reveal new secret"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setExpandedKeyId(null)}>
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-muted">
                    Rotation creates a replacement key and revokes the current one immediately. Use `runs:write` for
                    the first demo flow, and add `runs:manage` only if the key also needs replay or cancel actions.
                  </p>
                </div>
              ) : null}

              {revealedSecret ? (
                <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted">New one-time secret</p>
                  <p className="mt-2 break-all font-mono text-sm text-foreground">{revealedSecret}</p>
                </div>
              ) : null}
            </div>
          );
        })}

        {revokeMutation.isError ? (
          <p className="text-xs text-muted">API key revoke failed. Check workspace permissions and retry.</p>
        ) : null}
        {rotateMutation.isError ? (
          <p className="text-xs text-muted">API key rotate failed. Check workspace permissions and key state.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
