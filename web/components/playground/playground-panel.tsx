"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ControlPlaneRunCreateRequest } from "@/lib/control-plane-types";
import {
  ControlPlaneRequestError,
  createRun,
  fetchRun,
  fetchRunGraph,
  isControlPlaneRequestError,
} from "@/services/control-plane";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <Textarea className="min-h-[320px]" defaultValue="" />,
});

type PlaygroundSource = "onboarding" | "admin-readiness" | "admin-attention";
type DeliveryContext = "recent_activity";

function normalizeSource(source: string | null | undefined): PlaygroundSource | null {
  if (source === "onboarding" || source === "admin-readiness" || source === "admin-attention") {
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

function buildPlaygroundHref(args: {
  pathname: string;
  source: PlaygroundSource | null;
  week8Focus?: string | null;
  attentionWorkspace?: string | null;
  attentionOrganization?: string | null;
  deliveryContext?: DeliveryContext | null;
  recentTrackKey?: "verification" | "go_live" | null;
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

function buildDefaultRequest(
  workspaceSlug: string,
  source: PlaygroundSource | null,
): ControlPlaneRunCreateRequest {
  return {
    input: {
      kind: "user_instruction",
      text:
        source === "admin-readiness"
          ? "Summarize the current workspace readiness posture and recommend the next operator action."
          : source === "admin-attention"
            ? "Summarize the latest workspace delivery follow-up and recommend the next operator action."
            : "Summarize the current approval queue and recommend the next operator action.",
    },
    entry_agent_id: "catalog_router",
    context: {
      source_app: "web_console",
      onboarding_flow: "workspace_first_demo",
      workspace_slug: workspaceSlug,
      conversation_id: `onboarding-${workspaceSlug}`,
    },
    policy_context: {
      risk_tier: "default",
      labels: ["onboarding", "demo"],
    },
    options: {
      async: true,
      priority: "normal",
    },
  };
}

function buildInitialResponse(source: PlaygroundSource | null): string {
  if (source === "admin-readiness") {
    return "Invoke a run to capture a real readiness follow-up trace, then use the returned ids for verification and admin handoff evidence.";
  }
  if (source === "admin-attention") {
    return "Invoke a run to capture a governed follow-up trace, then carry the ids back into verification, usage, or admin queue review.";
  }
  return "Invoke a run to inspect the queued response, trace id, and first-run metadata.";
}

function describeRecentDeliverySummary(args: {
  recentTrackKey?: string | null;
  recentUpdateKind?: string | null;
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
  return parts.length ? ` Latest admin context: ${parts.join(" · ")}.` : "";
}

function getContextCardContent(args: {
  source: PlaygroundSource | null;
  recentTrackKey?: string | null;
  recentUpdateKind?: string | null;
  evidenceCount?: number | null;
  recentOwnerLabel?: string | null;
}): { title: string; body: string } | null {
  const extra = describeRecentDeliverySummary(args);
  if (args.source === "onboarding") {
    return {
      title: "Onboarding first demo",
      body:
        "This workspace was sent here to create the first real run. Keep the payload simple, confirm the run queues successfully, then carry the returned ids into verification or API key follow-up."
        + extra,
    };
  }
  if (args.source === "admin-readiness") {
    return {
      title: "Admin readiness follow-up",
      body:
        "You arrived from the Week 8 readiness lane. This page does not automate remediation; it only helps you produce a real run, inspect the response, and gather evidence before returning to readiness review."
        + extra,
    };
  }
  if (args.source === "admin-attention") {
    return {
      title: "Admin queue run follow-up",
      body:
        "You arrived from an admin follow-up path. Use this page to produce or inspect a governed run as supporting evidence, then continue manually into verification, usage, or settings."
        + extra,
    };
  }
  return null;
}

function getFirstRunTip(source: PlaygroundSource | null): string {
  if (source === "admin-readiness") {
    return "Use a narrow request that proves this workspace can queue a governed run. Keep `input.kind` as `user_instruction`, preserve `POST /api/v1/runs`, and avoid broad payload changes until the first response succeeds.";
  }
  if (source === "admin-attention") {
    return "Use a narrow request that supports the current admin follow-up. The goal here is to create concrete run evidence, not to automate any remediation.";
  }
  return "Keep `input.kind` as `user_instruction` for onboarding. You can adjust `entry_agent_id`, labels, and context metadata, but the request must still match `POST /api/v1/runs`.";
}

function getWhatToLookFor(source: PlaygroundSource | null): string {
  if (source === "admin-readiness") {
    return "A healthy follow-up returns `run_id`, `trace_id`, `status`, and `workflow_status`. Use those ids as concrete readiness evidence, then continue into verification or return to the admin review lane.";
  }
  if (source === "admin-attention") {
    return "A healthy follow-up returns `run_id`, `trace_id`, `status`, and `workflow_status`. Use those ids as queue evidence and carry them back into verification, usage, or settings.";
  }
  return "A successful first-run response returns `run_id`, `trace_id`, `status`, and `workflow_status`. Use those ids for logs, replay, and verification follow-up.";
}

function format(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

type PlanLimitNotice = {
  message: string;
  scope: string | null;
  used: number | null;
  limit: number | null;
  periodStart: string | null;
  periodEnd: string | null;
};

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function formatMetricLabel(scope: string | null): string {
  if (scope === "runs_created") {
    return "monthly runs";
  }
  if (scope === "active_tool_providers") {
    return "active providers";
  }
  return "workspace quota";
}

function formatDateLabel(value: string | null): string {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleDateString();
}

function getPlanLimitNotice(error: unknown): PlanLimitNotice | null {
  if (!isControlPlaneRequestError(error) || error.code !== "plan_limit_exceeded") {
    return null;
  }

  return {
    message: error.message,
    scope: readString(error.details.scope),
    used: readNumber(error.details.used),
    limit: readNumber(error.details.limit),
    periodStart: readString(error.details.period_start),
    periodEnd: readString(error.details.period_end),
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ControlPlaneRequestError) {
    return error.message;
  }
  return error instanceof Error ? error.message : "Unknown error";
}

export function PlaygroundPanel({
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
  const normalizedSource = normalizeSource(source);
  const normalizedDeliveryContext = normalizeDeliveryContext(deliveryContext);
  const normalizedRecentTrackKey = normalizeRecentTrackKey(recentTrackKey);
  const contextCard = getContextCardContent({
    source: normalizedSource,
    recentTrackKey,
    recentUpdateKind,
    evidenceCount,
    recentOwnerLabel,
  });
  const [requestBody, setRequestBody] = useState<string>(
    format(buildDefaultRequest(workspaceSlug, normalizedSource)),
  );
  const [responseBody, setResponseBody] = useState<string>(buildInitialResponse(normalizedSource));
  const [statusMessage, setStatusMessage] = useState<string>("Ready for first demo run");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [planLimitNotice, setPlanLimitNotice] = useState<PlanLimitNotice | null>(null);
  const planLimitPeriodLabel =
    planLimitNotice?.periodStart || planLimitNotice?.periodEnd
      ? `${formatDateLabel(planLimitNotice?.periodStart ?? null)} to ${formatDateLabel(planLimitNotice?.periodEnd ?? null)}`
      : "the current billing period";

  const invokeMutation = useMutation({
    mutationFn: async (input: ControlPlaneRunCreateRequest) => createRun(input),
    onSuccess: async (result) => {
      const [run, graph] = await Promise.allSettled([fetchRun(result.run_id), fetchRunGraph(result.run_id)]);
      setResponseBody(
        format({
          queued: result,
          run: run.status === "fulfilled" ? run.value : null,
          graph_summary:
            graph.status === "fulfilled"
              ? {
                  steps: graph.value.steps.length,
                  approvals: graph.value.approvals.length,
                  artifacts: graph.value.artifacts.length,
                }
              : null,
        }),
      );
      setStatusMessage(`Run queued: ${result.run_id}`);
      setErrorMessage(null);
      setPlanLimitNotice(null);
    },
    onError: (error) => {
      setStatusMessage("Invoke failed");
      setErrorMessage(getErrorMessage(error));
      setPlanLimitNotice(getPlanLimitNotice(error));
      setResponseBody(
        format({
          error: {
            message: getErrorMessage(error),
            code: isControlPlaneRequestError(error) ? error.code : "unknown_error",
            details: isControlPlaneRequestError(error) ? error.details : {},
          },
        }),
      );
    },
  });

  async function invokeRun(): Promise<void> {
    let parsed: ControlPlaneRunCreateRequest;
    try {
      parsed = JSON.parse(requestBody) as ControlPlaneRunCreateRequest;
    } catch (error) {
      setErrorMessage(`Invalid JSON: ${error instanceof Error ? error.message : "Unable to parse request"}`);
      setStatusMessage("Broken request");
      return;
    }

    setStatusMessage("Invoking run...");
    setErrorMessage(null);
    setPlanLimitNotice(null);
    setResponseBody("Waiting for control plane response...");
    await invokeMutation.mutateAsync(parsed);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Request</CardTitle>
            <p className="mt-1 text-xs text-muted">{statusMessage}</p>
          </div>
          <Button size="sm" onClick={() => void invokeRun()} disabled={invokeMutation.isPending}>
            {invokeMutation.isPending ? "Invoking..." : "Invoke"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {contextCard ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-xs text-sky-950">
              <p className="font-medium text-sky-950">{contextCard.title}</p>
              <p className="mt-1">{contextCard.body}</p>
            </div>
          ) : null}
          <MonacoEditor
            height="360px"
            theme="vs-dark"
            defaultLanguage="json"
            value={requestBody}
            onChange={(value) => setRequestBody(value ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
            }}
          />
          {errorMessage ? <p className="text-xs text-red-500">{errorMessage}</p> : null}
          {planLimitNotice ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-950">
              <p className="font-medium text-amber-950">Plan limit reached</p>
              <p className="mt-1">
                {planLimitNotice.message} This workspace has used {planLimitNotice.used ?? "?"} of{" "}
                {planLimitNotice.limit ?? "?"} {formatMetricLabel(planLimitNotice.scope)} for {planLimitPeriodLabel}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={buildPlaygroundHref({
                    pathname: "/usage",
                    source: normalizedSource,
                    week8Focus,
                    attentionWorkspace,
                    attentionOrganization,
                    deliveryContext: normalizedDeliveryContext,
                    recentTrackKey: normalizedRecentTrackKey,
                    recentUpdateKind,
                    evidenceCount,
                    recentOwnerLabel,
                  })}
                  className="inline-flex items-center justify-center rounded-xl border border-amber-950 px-3 py-2 font-medium text-amber-950 transition hover:bg-amber-100"
                >
                  Review usage
                </Link>
                <Link
                  href={buildPlaygroundHref({
                    pathname: "/settings",
                    source: normalizedSource,
                    week8Focus,
                    attentionWorkspace,
                    attentionOrganization,
                    deliveryContext: normalizedDeliveryContext,
                    recentTrackKey: normalizedRecentTrackKey,
                    recentUpdateKind,
                    evidenceCount,
                    recentOwnerLabel,
                  })}
                  className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-3 py-2 font-medium text-amber-950 transition hover:bg-amber-100/60"
                >
                  Check plan and limits
                </Link>
              </div>
            </div>
          ) : null}
          <div className="rounded-2xl border border-border bg-background p-4 text-xs text-muted">
            <p className="font-medium text-foreground">First-run tip</p>
            <p className="mt-1">{getFirstRunTip(normalizedSource)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={buildPlaygroundHref({
                  pathname: "/service-accounts",
                  source: normalizedSource,
                  week8Focus,
                  attentionWorkspace,
                  attentionOrganization,
                  deliveryContext: normalizedDeliveryContext,
                  recentTrackKey: normalizedRecentTrackKey,
                  recentUpdateKind,
                  evidenceCount,
                  recentOwnerLabel,
                })}
                className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 font-medium text-foreground transition hover:bg-muted/60"
              >
                Review service accounts
              </Link>
              <Link
                href={buildPlaygroundHref({
                  pathname: "/api-keys",
                  source: normalizedSource,
                  week8Focus,
                  attentionWorkspace,
                  attentionOrganization,
                  deliveryContext: normalizedDeliveryContext,
                  recentTrackKey: normalizedRecentTrackKey,
                  recentUpdateKind,
                  evidenceCount,
                  recentOwnerLabel,
                })}
                className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 font-medium text-foreground transition hover:bg-muted/60"
              >
                Check API key scope
              </Link>
              <Link
                href={buildPlaygroundHref({
                  pathname: "/verification",
                  source: normalizedSource,
                  week8Focus,
                  attentionWorkspace,
                  attentionOrganization,
                  deliveryContext: normalizedDeliveryContext,
                  recentTrackKey: normalizedRecentTrackKey,
                  recentUpdateKind,
                  evidenceCount,
                  recentOwnerLabel,
                })}
                className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 font-medium text-foreground transition hover:bg-muted/60"
              >
                Open verification
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea className="min-h-[360px] font-mono text-xs" value={responseBody} readOnly />
          <div className="rounded-2xl border border-border bg-background p-4 text-xs text-muted">
            <p className="font-medium text-foreground">What to look for</p>
            <p className="mt-1">{getWhatToLookFor(normalizedSource)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
