"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ControlPlaneWorkspaceBootstrapResult } from "@/lib/control-plane-types";
import {
  bootstrapWorkspace,
  createWorkspace,
  fetchCurrentWorkspace,
  isControlPlaneRequestError,
} from "@/services/control-plane";

function normalizeSlug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "workspace";
}

type WorkspaceContextSource = "metadata" | "env-fallback" | "preview-fallback";

type WorkspaceContextResponse = {
  data?: {
    source?: WorkspaceContextSource;
  };
};

async function fetchWorkspaceContextSource(): Promise<WorkspaceContextSource | null> {
  try {
    const response = await fetch("/api/workspace-context", {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as WorkspaceContextResponse;
    const source = payload.data?.source;
    if (source === "metadata" || source === "env-fallback" || source === "preview-fallback") {
      return source;
    }
    return null;
  } catch {
    return null;
  }
}

function getActionableErrorMessage(error: unknown, fallback: string): string {
  if (isControlPlaneRequestError(error)) {
    const reason = error.message?.trim() || fallback;
    const code = error.code?.trim();
    return code ? `${reason} (code: ${code})` : reason;
  }
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  return fallback;
}

type OnboardingSource = "admin-attention" | "admin-readiness" | "onboarding";

function buildOnboardingHref(args: {
  pathname: string;
  source?: OnboardingSource | null;
  week8Focus?: string | null;
  attentionWorkspace?: string | null;
  attentionOrganization?: string | null;
  deliveryContext?: string | null;
  recentTrackKey?: string | null;
  recentUpdateKind?: string | null;
  evidenceCount?: number | null;
  recentOwnerLabel?: string | null;
}): string {
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
  return `${basePath}?${searchParams.toString()}`;
}

export function WorkspaceOnboardingWizard({
  workspaceSlug,
  source = "onboarding",
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlugInput, setWorkspaceSlugInput] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [createdWorkspace, setCreatedWorkspace] = useState<{
    workspace_id: string;
    slug: string;
    display_name: string;
    tenant_id: string;
  } | null>(null);
  const [bootstrapResult, setBootstrapResult] = useState<ControlPlaneWorkspaceBootstrapResult | null>(null);

  const workspaceQuery = useQuery({
    queryKey: ["workspace-settings", workspaceSlug],
    queryFn: fetchCurrentWorkspace,
  });
  const contextSourceQuery = useQuery({
    queryKey: ["workspace-context-source"],
    queryFn: fetchWorkspaceContextSource,
  });
  const persistedWorkspace =
    workspaceQuery.data?.workspace &&
    workspaceQuery.data.workspace.organization.organization_id !== "org_preview"
      ? {
          workspace_id: workspaceQuery.data.workspace.workspace_id,
          slug: workspaceQuery.data.workspace.slug,
          display_name: workspaceQuery.data.workspace.display_name,
          tenant_id: workspaceQuery.data.workspace.tenant_id,
        }
      : null;
  const activeWorkspace = createdWorkspace ?? persistedWorkspace;
  const onboardingState = workspaceQuery.data?.onboarding ?? null;
  const bootstrapSummary = bootstrapResult?.summary ?? onboardingState?.summary ?? null;
  const nextActions = bootstrapResult?.next_actions ?? onboardingState?.next_actions ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const currentWorkspace = workspaceQuery.data?.workspace;
      if (!currentWorkspace) {
        throw new Error("Current workspace context is unavailable");
      }

      const slug = normalizeSlug(workspaceSlugInput);
      const displayName = workspaceName.trim() || slug;

      return createWorkspace({
        organization_id: currentWorkspace.organization.organization_id,
        slug,
        display_name: displayName,
        plan_id: currentWorkspace.plan_id,
        data_region: currentWorkspace.data_region,
      });
    },
    onSuccess: async (result) => {
      const nextWorkspace = {
        workspace_id: result.workspace.workspace_id,
        slug: result.workspace.slug,
        display_name: result.workspace.display_name,
        tenant_id: result.workspace.tenant_id,
      };
      setCreatedWorkspace(nextWorkspace);
      setBootstrapResult(null);

      await fetch("/api/workspace-context", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: nextWorkspace.workspace_id,
          workspace_slug: nextWorkspace.slug,
        }),
      });

      await queryClient.invalidateQueries();
      router.refresh();
    },
  });

  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      if (!activeWorkspace) {
        throw new Error("Create a workspace before bootstrapping");
      }

      return bootstrapWorkspace(activeWorkspace.workspace_id);
    },
    onSuccess: async (result) => {
      setBootstrapResult(result);
      await queryClient.invalidateQueries();
      router.refresh();
    },
  });

  const stepOneComplete = activeWorkspace !== null;
  const stepTwoComplete = bootstrapResult !== null || onboardingState?.checklist.baseline_ready === true;
  const serviceAccountReady = onboardingState?.checklist.service_account_created === true;
  const apiKeyReady = onboardingState?.checklist.api_key_created === true;
  const stepThreeReady = stepTwoComplete && serviceAccountReady && apiKeyReady;
  const stepThreeComplete = onboardingState?.checklist.demo_run_succeeded === true;
  const latestDemoRun = onboardingState?.latest_demo_run ?? null;
  const firstDemoStatusText = stepThreeComplete
    ? "First demo run succeeded"
    : onboardingState?.checklist.demo_run_created
    ? "Demo run in progress"
    : stepThreeReady
    ? "Baseline + credentials ready"
    : "Behind on prerequisites";
  const firstDemoStatusVariant = stepThreeComplete
    ? "strong"
    : onboardingState?.checklist.demo_run_created
    ? "default"
    : stepThreeReady
    ? "default"
    : "subtle";
  const normalizedSource: OnboardingSource =
    source === "admin-attention" || source === "admin-readiness" || source === "onboarding"
      ? source
      : "onboarding";
  const handoffHrefArgs: Omit<Parameters<typeof buildOnboardingHref>[0], "pathname"> = {
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
  const contextSource = contextSourceQuery.data;
  const showPreviewContextNotice = contextSource === "preview-fallback" || contextSource === "env-fallback";
  const contextNoticeBody =
    contextSource === "preview-fallback"
      ? "Workspace context is currently coming from preview fallback data. This is useful for UI validation, but values may not reflect a real SaaS membership/session."
      : "Workspace context is currently coming from environment fallback values. This can be valid for local/operator flows, but not all data is session-derived from SaaS metadata yet.";
  const createErrorMessage = createMutation.isError
    ? getActionableErrorMessage(
        createMutation.error,
        "Workspace creation failed. Check organization access and slug uniqueness, then retry.",
      )
    : null;
  const bootstrapErrorMessage = bootstrapMutation.isError
    ? getActionableErrorMessage(
        bootstrapMutation.error,
        "Bootstrap failed. Check workspace permissions and retry.",
      )
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Onboarding"
        title="Launch and onboard a workspace"
        description="Create a workspace, seed the baseline provider and policy bundle, then track the first operational actions until the first demo flow is ready."
        badge={<Badge variant="strong">{onboardingState?.status ?? "Week 5"}</Badge>}
      />
      {showPreviewContextNotice ? (
        <Card>
          <CardHeader>
            <CardTitle>Workspace context notice</CardTitle>
            <CardDescription>Onboarding remains available, with context loaded from a fallback source.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted">
            <p>{contextNoticeBody}</p>
            <p>
              Current source: <span className="font-medium text-foreground">{contextSource}</span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Step 1. Create workspace</CardTitle>
            <CardDescription>Create a workspace, then keep using this page as the persistent onboarding hub for that workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Workspace name"
                value={workspaceName}
                onChange={(event) => {
                  const nextName = event.currentTarget.value;
                  setWorkspaceName(nextName);
                  if (!slugManuallyEdited) {
                    setWorkspaceSlugInput(normalizeSlug(nextName));
                  }
                }}
              />
              <Input
                placeholder="Workspace slug"
                value={workspaceSlugInput}
                onChange={(event) => {
                  setSlugManuallyEdited(true);
                  setWorkspaceSlugInput(event.currentTarget.value);
                }}
              />
            </div>
            {!slugManuallyEdited ? (
              <p className="text-xs text-muted">
                Slug is auto-suggested from the workspace name until you edit it manually.
              </p>
            ) : null}
            <Button
              disabled={createMutation.isPending || workspaceQuery.isLoading || workspaceQuery.isError}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating workspace..." : "Create workspace"}
            </Button>
            {createErrorMessage ? (
              <p className="text-xs text-muted">{createErrorMessage}</p>
            ) : null}
            {activeWorkspace ? (
              <div className="rounded-2xl border border-border bg-background p-4 text-sm">
                <p className="font-medium text-foreground">{activeWorkspace.display_name}</p>
                <p className="mt-1 text-xs text-muted">
                  {activeWorkspace.slug} · {activeWorkspace.workspace_id}
                </p>
                <p className="mt-1 text-xs text-muted">Tenant: {activeWorkspace.tenant_id}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>Each step unlocks the next one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
              <div>
                <p className="font-medium text-foreground">Workspace skeleton</p>
                <p className="mt-1 text-xs text-muted">Organization mapping and tenant binding</p>
              </div>
              <Badge variant={stepOneComplete ? "strong" : "subtle"}>{stepOneComplete ? "Done" : "Pending"}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
              <div>
                <p className="font-medium text-foreground">Baseline governance bundle</p>
                <p className="mt-1 text-xs text-muted">Bootstrap providers and policies for first-run safety</p>
              </div>
              <Badge variant={stepTwoComplete ? "strong" : "subtle"}>{stepTwoComplete ? "Done" : "Locked"}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
              <div>
                <p className="font-medium text-foreground">First operational actions</p>
                <p className="mt-1 text-xs text-muted">Service account, API key, and first demo run</p>
              </div>
              <Badge variant={stepThreeComplete ? "strong" : stepThreeReady ? "default" : "subtle"}>
                {stepThreeComplete ? "Ready" : stepThreeReady ? "In progress" : "Waiting"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Step 2. Bootstrap baseline</CardTitle>
            <CardDescription>Seed the minimum provider and policy deck for a safe first demo run.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="secondary"
              disabled={!activeWorkspace || bootstrapMutation.isPending || stepTwoComplete}
              onClick={() => bootstrapMutation.mutate()}
            >
              {stepTwoComplete ? "Baseline ready" : bootstrapMutation.isPending ? "Bootstrapping..." : "Bootstrap baseline"}
            </Button>
            <p className="text-xs text-muted">
              This creates a small, deterministic seed set based on the workspace id, so re-running does not create duplicates.
            </p>
            {bootstrapErrorMessage ? (
              <p className="text-xs text-muted">{bootstrapErrorMessage}</p>
            ) : null}
            {bootstrapSummary ? (
              <div className="space-y-3 rounded-2xl border border-border bg-background p-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-muted">Providers</p>
                    <p className="mt-1 font-medium text-foreground">{bootstrapSummary.providers_total}</p>
                    <p className="mt-1 text-xs text-muted">
                      {bootstrapSummary.providers_created} created · {bootstrapSummary.providers_existing} existing
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-muted">Policies</p>
                    <p className="mt-1 font-medium text-foreground">{bootstrapSummary.policies_total}</p>
                    <p className="mt-1 text-xs text-muted">
                      {bootstrapSummary.policies_created} created · {bootstrapSummary.policies_existing} existing
                    </p>
                  </div>
                </div>
                {bootstrapResult ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {bootstrapResult.providers.map((provider) => (
                        <Badge key={provider.tool_provider_id} variant="subtle">
                          {provider.name}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {bootstrapResult.policies.map((policy) => (
                        <Badge key={policy.policy_id} variant="subtle">
                          {policy.decision}: {policy.scope.tool_name ?? policy.policy_id}
                        </Badge>
                      ))}
                    </div>
                  </>
                ) : null}
                {nextActions.length > 0 ? (
                  <div className="rounded-2xl border border-border/70 bg-card p-3 text-xs text-muted">
                    <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted">Next actions</p>
                    <ul className="mt-2 space-y-1 text-xs text-foreground">
                      {nextActions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 3. Next actions</CardTitle>
            <CardDescription>Turn baseline setup into a first demo-ready workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 text-sm">
              <p className="font-medium text-foreground">Guided lane</p>
              <p className="mt-1 text-xs text-muted">
                Use the same workspace context for the full first-run path: invite the first operator or approver if
                needed, create one service account, mint one `runs:write` API key, run the first demo in Playground,
                then capture evidence in Verification.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4 text-sm">
              <div>
                <p className="font-medium text-foreground">First demo run</p>
                <p className="mt-1 text-xs text-muted">
                  {stepThreeComplete
                    ? "The first onboarding demo run completed successfully."
                    : onboardingState?.checklist.demo_run_created
                    ? "A demo run exists. Inspect the latest run and confirm it completed."
                    : stepThreeReady
                    ? "Service account and API key exist; Playground is now unlocked."
                    : "Finish the baseline, service account, and API key steps before invoking the run."}
                </p>
              </div>
              <Badge variant={firstDemoStatusVariant}>{firstDemoStatusText}</Badge>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
                <div>
                  <p className="font-medium text-foreground">Members</p>
                  <p className="mt-1 text-xs text-muted">Invite the first viewer, operator, or approver when the workspace needs shared governance.</p>
                </div>
                <Badge variant="subtle">Optional first</Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
                <div>
                  <p className="font-medium text-foreground">Service account</p>
                  <p className="mt-1 text-xs text-muted">Create one machine identity for the first workload.</p>
                </div>
                <Badge variant={onboardingState?.checklist.service_account_created ? "strong" : "subtle"}>
                  {onboardingState?.summary.service_accounts_total ?? 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
                <div>
                  <p className="font-medium text-foreground">API key</p>
                  <p className="mt-1 text-xs text-muted">Issue and store the first secret for northbound access.</p>
                </div>
                <Badge variant={onboardingState?.checklist.api_key_created ? "strong" : "subtle"}>
                  {onboardingState?.summary.api_keys_total ?? 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
                <div>
                  <p className="font-medium text-foreground">Demo runs</p>
                  <p className="mt-1 text-xs text-muted">Runs started from the onboarding Playground flow.</p>
                </div>
                <Badge variant={onboardingState?.checklist.demo_run_succeeded ? "strong" : onboardingState?.checklist.demo_run_created ? "default" : "subtle"}>
                  {onboardingState?.summary.demo_runs_total ?? 0}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={buildOnboardingHref({ pathname: "/members", ...handoffHrefArgs })}>
                <Button size="sm" variant="ghost" disabled={!stepOneComplete}>
                  Members
                </Button>
              </Link>
              <Link href={buildOnboardingHref({ pathname: "/service-accounts", ...handoffHrefArgs })}>
                <Button size="sm" variant="ghost" disabled={!stepTwoComplete}>
                  Service accounts
                </Button>
              </Link>
              <Link href={buildOnboardingHref({ pathname: "/api-keys", ...handoffHrefArgs })}>
                <Button size="sm" variant="ghost" disabled={!stepTwoComplete}>
                  API keys
                </Button>
              </Link>
              <Link href={buildOnboardingHref({ pathname: "/playground", ...handoffHrefArgs })}>
                <Button size="sm" variant="ghost" disabled={!stepThreeReady}>
                  Playground
                </Button>
              </Link>
              <Link href={buildOnboardingHref({ pathname: "/verification", ...handoffHrefArgs })}>
                <Button size="sm" variant="ghost" disabled={!onboardingState?.checklist.demo_run_created}>
                  Verification
                </Button>
              </Link>
            </div>
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
              <p className="text-xs uppercase tracking-[0.15em] text-muted">First-run quickstart</p>
              <ol className="space-y-1 text-xs text-foreground">
                <li>1. If the workspace is shared, invite the first viewer, operator, or approver from Members.</li>
                <li>2. Create a service account scoped to the first workload or external runtime path.</li>
                <li>3. Generate an API key that includes <code>runs:write</code>; store the secret and keep it handy for the first external run.</li>
                <li>4. Use the one-time secret with your agent client or a curl call against <code>POST /api/v1/runs</code>, then return to Playground to inspect or reproduce the same flow in console context.</li>
                <li>5. After the run succeeds, open Verification to capture the evidence before widening scope or moving into go-live rehearsal.</li>
              </ol>
              <p className="text-xs text-muted">
                The first run only needs a simple JSON payload and a bearer key. Playground stays useful as the in-console surface for validating the same path after the external API call succeeds.
              </p>
            </div>
            {latestDemoRun ? (
              <div className="rounded-2xl border border-border bg-background p-4 text-sm">
                <p className="font-medium text-foreground">Latest demo run</p>
                <p className="mt-1 text-xs text-muted">
                  {latestDemoRun.run_id} · {latestDemoRun.status}
                </p>
                <p className="mt-1 text-xs text-muted">Trace: {latestDemoRun.trace_id}</p>
                <p className="mt-1 text-xs text-muted">Updated: {new Date(latestDemoRun.updated_at).toLocaleString()}</p>
              </div>
            ) : null}
            <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted">
              <p>Recommended sequence: members if needed, then service account, API key, Playground, and Verification.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
