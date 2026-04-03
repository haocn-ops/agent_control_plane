"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { ReadinessTile } from "@/components/home/readiness-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCurrentWorkspace, fetchWorkspaceDeliveryTrack } from "@/services/control-plane";

function toneFromState(isReady: boolean, isInProgress = false): "ready" | "in_progress" | "blocked" {
  if (isReady) {
    return "ready";
  }
  if (isInProgress) {
    return "in_progress";
  }
  return "blocked";
}

function formatPlanLabel(planCode?: string | null, planDisplayName?: string | null): string {
  if (planDisplayName) {
    return `${planDisplayName} (${planCode ?? "custom"})`;
  }
  return planCode ?? "Unassigned";
}

function formatDateLabel(value?: string | null): string {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString();
}

const nextStepLinks = [
  { label: "Onboarding", path: "/onboarding" },
  { label: "Members", path: "/members" },
  { label: "Service accounts", path: "/service-accounts" },
  { label: "API keys", path: "/api-keys" },
  { label: "Playground", path: "/playground" },
  { label: "Usage", path: "/usage" },
  { label: "Settings", path: "/settings" },
  { label: "Verification", path: "/verification" },
  { label: "Go-live", path: "/go-live" },
];

export function WorkspaceLaunchpad({
  workspaceSlug,
}: {
  workspaceSlug: string;
}) {
  const workspaceQuery = useQuery({
    queryKey: ["home-launchpad-workspace", workspaceSlug],
    queryFn: fetchCurrentWorkspace,
  });

  const deliveryQuery = useQuery({
    queryKey: ["home-launchpad-delivery", workspaceSlug],
    queryFn: fetchWorkspaceDeliveryTrack,
  });

  const workspace = workspaceQuery.data?.workspace;
  const plan = workspaceQuery.data?.plan;
  const onboarding = workspaceQuery.data?.onboarding;
  const billing = workspaceQuery.data?.billing_summary;
  const delivery = deliveryQuery.data;

  const onboardingReady = onboarding?.checklist.baseline_ready === true;
  const credentialsReady =
    onboarding?.checklist.service_account_created === true &&
    onboarding?.checklist.api_key_created === true;
  const demoRunCreated = onboarding?.checklist.demo_run_created === true;
  const demoRunReady = onboarding?.checklist.demo_run_succeeded === true;
  const billingReady = billing?.status_tone !== "warning";
  const verificationReady = delivery?.verification.status === "complete";
  const goLiveReady = delivery?.go_live.status === "complete";
  const mockGoLiveReadinessReady = goLiveReady || (verificationReady && demoRunReady && billingReady);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Workspace launch summary</span>
            <Badge variant="subtle">{workspaceSlug}</Badge>
          </CardTitle>
          <CardDescription>
            This launchpad is a navigation hub for manual governance follow-up. It does not impersonate users and does
            not trigger support automation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted">Workspace</p>
            <p className="mt-1 font-medium text-foreground">{workspace?.display_name ?? workspaceSlug}</p>
            <p className="mt-1 text-xs text-muted">{workspace?.workspace_id ?? "Loading workspace id..."}</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted">Organization</p>
            <p className="mt-1 font-medium text-foreground">{workspace?.organization.display_name ?? "Loading..."}</p>
            <p className="mt-1 text-xs text-muted">{workspace?.organization.slug ?? "-"}</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted">Plan</p>
            <p className="mt-1 font-medium text-foreground">
              {formatPlanLabel(billing?.plan_code ?? plan?.code, billing?.plan_display_name ?? plan?.display_name)}
            </p>
            <p className="mt-1 text-xs text-muted">Billing status: {billing?.status_label ?? "Loading..."}</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted">Updated</p>
            <p className="mt-1 font-medium text-foreground">{formatDateLabel(workspace?.updated_at)}</p>
            <p className="mt-1 text-xs text-muted">
              Delivery: {delivery ? "loaded" : deliveryQuery.isError ? "unavailable" : "loading"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ReadinessTile
          title="Onboarding baseline"
          detail={
            onboardingReady
              ? "Baseline provider/policy bundle is ready."
              : "Bootstrap baseline before moving to credential steps."
          }
          hint="Source: onboarding checklist baseline flag."
          tone={toneFromState(onboardingReady)}
        />
        <ReadinessTile
          title="Credentials"
          detail={
            credentialsReady
              ? "Service account and API key are both present."
              : "Create at least one service account and one API key."
          }
          hint="Source: onboarding checklist credential flags."
          tone={toneFromState(credentialsReady)}
        />
        <ReadinessTile
          title="Demo run"
          detail={
            demoRunReady
              ? "At least one onboarding demo run succeeded."
              : demoRunCreated
              ? "A demo run exists; validate completion in Playground."
              : "Run a first demo flow to produce run/trace evidence."
          }
          hint="Source: onboarding run checklist and latest demo state."
          tone={toneFromState(demoRunReady, demoRunCreated)}
        />
        <ReadinessTile
          title="Billing posture"
          detail={
            billingReady
              ? "Billing posture is not currently warning."
              : "Billing warning is active. Resolve in Settings before go-live."
          }
          hint="Source: workspace billing summary tone/status."
          tone={toneFromState(billingReady)}
        />
        <ReadinessTile
          title="Mock go-live readiness"
          detail={
            mockGoLiveReadinessReady
              ? "Verification and prerequisite posture support mock go-live rehearsal."
              : "Complete verification and clear billing/demo prerequisites first."
          }
          hint="Source: delivery track plus onboarding/billing status."
          tone={toneFromState(mockGoLiveReadinessReady, verificationReady || demoRunReady)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next-step navigation</CardTitle>
          <CardDescription>
            Follow these surfaces to continue workspace launch checks, evidence capture, and readiness review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {nextStepLinks.map((entry) => (
              <Link
                key={entry.path}
                href={entry.path}
                className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-card"
              >
                {entry.label}
              </Link>
            ))}
          </div>
          {(workspaceQuery.isLoading || deliveryQuery.isLoading) && (
            <p className="text-xs text-muted">Loading workspace and delivery context...</p>
          )}
          {(workspaceQuery.isError || deliveryQuery.isError) && (
            <p className="text-xs text-muted">
              Some launchpad signals are temporarily unavailable. You can still navigate manually to complete checks.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
