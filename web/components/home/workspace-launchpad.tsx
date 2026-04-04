"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { ReadinessTile } from "@/components/home/readiness-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCurrentWorkspace, fetchWorkspaceDeliveryTrack } from "@/services/control-plane";

type OnboardingSurface =
  | "onboarding"
  | "members"
  | "service_accounts"
  | "service-accounts"
  | "api_keys"
  | "api-keys"
  | "playground"
  | "verification"
  | "usage"
  | "settings"
  | "go_live"
  | "go-live";

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

const nextStepLinks: Array<{ label: string; surface: OnboardingSurface }> = [
  { label: "Onboarding", surface: "onboarding" },
  { label: "Members", surface: "members" },
  { label: "Service accounts", surface: "service-accounts" },
  { label: "API keys", surface: "api-keys" },
  { label: "Playground", surface: "playground" },
  { label: "Usage", surface: "usage" },
  { label: "Settings", surface: "settings" },
  { label: "Verification", surface: "verification" },
  { label: "Go-live", surface: "go-live" },
];

function toSurfacePath(surface: OnboardingSurface): string {
  if (surface === "service_accounts" || surface === "service-accounts") {
    return "/service-accounts";
  }
  if (surface === "api_keys" || surface === "api-keys") {
    return "/api-keys";
  }
  if (surface === "verification") {
    return "/verification?surface=verification";
  }
  if (surface === "go_live" || surface === "go-live") {
    return "/go-live?surface=go_live";
  }
  return `/${surface}`;
}

function getRecommendedNextStep(args: {
  onboardingStatus?: {
    checklist: {
      baseline_ready: boolean;
      service_account_created: boolean;
      api_key_created: boolean;
      demo_run_created: boolean;
      demo_run_succeeded: boolean;
    };
    recommended_next_surface?: OnboardingSurface | null;
    recommended_next_action?: string | null;
    recommended_next_reason?: string | null;
  } | null;
}): { surface: OnboardingSurface; action: string; reason: string } {
  if (args.onboardingStatus?.recommended_next_surface) {
    return {
      surface: args.onboardingStatus.recommended_next_surface,
      action: args.onboardingStatus.recommended_next_action ?? "Continue onboarding",
      reason:
        args.onboardingStatus.recommended_next_reason ??
        "This step is recommended directly by onboarding state.",
    };
  }

  if (args.onboardingStatus?.checklist.baseline_ready !== true) {
    return {
      surface: "onboarding",
      action: "Bootstrap baseline",
      reason: "Bootstrap providers and policies before credential setup.",
    };
  }
  if (args.onboardingStatus?.checklist.service_account_created !== true) {
    return {
      surface: "service_accounts",
      action: "Create service account",
      reason: "Service account is required for first governed API path.",
    };
  }
  if (args.onboardingStatus?.checklist.api_key_created !== true) {
    return {
      surface: "api_keys",
      action: "Create API key",
      reason: "Create a narrow key (for example `runs:write`) for the first run.",
    };
  }
  if (args.onboardingStatus?.checklist.demo_run_succeeded !== true) {
    return {
      surface: "playground",
      action: args.onboardingStatus?.checklist.demo_run_created ? "Validate demo completion" : "Run first demo",
      reason: "Use Playground to create or confirm first-run evidence.",
    };
  }
  return {
    surface: "verification",
    action: "Capture verification evidence",
    reason: "Demo succeeded; store evidence before go-live rehearsal.",
  };
}

function getBlockers(args: {
  onboardingStatus?: {
    checklist: {
      baseline_ready: boolean;
      service_account_created: boolean;
      api_key_created: boolean;
      demo_run_created: boolean;
      demo_run_succeeded: boolean;
    };
    blockers?: Array<{ message: string }> | null;
  } | null;
}): string[] {
  if (args.onboardingStatus?.blockers && args.onboardingStatus.blockers.length > 0) {
    return args.onboardingStatus.blockers.map((item) => item.message);
  }
  const blockers: string[] = [];
  if (args.onboardingStatus?.checklist.baseline_ready !== true) {
    blockers.push("Baseline providers and policies are not ready.");
  }
  if (args.onboardingStatus?.checklist.service_account_created !== true) {
    blockers.push("Service account is missing.");
  }
  if (args.onboardingStatus?.checklist.api_key_created !== true) {
    blockers.push("API key is missing.");
  }
  if (args.onboardingStatus?.checklist.demo_run_created && !args.onboardingStatus.checklist.demo_run_succeeded) {
    blockers.push("Demo run exists but has not succeeded.");
  }
  return blockers;
}

function filterTextLines(lines: Array<string | null | undefined>): string[] {
  return lines.filter((line): line is string => typeof line === "string" && line.trim() !== "");
}

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
  const latestDemoRunHint = onboarding?.latest_demo_run_hint ?? null;
  const deliveryGuidance = onboarding?.delivery_guidance ?? null;
  const billingReady = billing?.status_tone !== "warning";
  const verificationReady = delivery?.verification.status === "complete";
  const goLiveReady = delivery?.go_live.status === "complete";
  const mockGoLiveReadinessReady = goLiveReady || (verificationReady && demoRunReady && billingReady);
  const recommendedNextStep = getRecommendedNextStep({ onboardingStatus: onboarding });
  const onboardingBlockers = getBlockers({ onboardingStatus: onboarding });
  const onboardingRecoveryTitle = latestDemoRunHint?.needs_attention
    ? latestDemoRunHint.is_terminal
      ? "Recover the first demo run"
      : "Monitor the first demo run"
    : onboarding?.checklist.demo_run_succeeded === true
      ? "Capture first-demo evidence"
      : "Follow the guided onboarding lane";
  const onboardingRecoveryBody = latestDemoRunHint?.needs_attention
    ? latestDemoRunHint.suggested_action ??
      "Keep the demo lane active until the run is healthy, then continue into verification evidence capture."
    : onboarding?.checklist.demo_run_succeeded === true
      ? deliveryGuidance?.summary ?? "Demo succeeded. Capture verification evidence before go-live rehearsal."
      : recommendedNextStep.reason;
  const onboardingRecoveryPrimary =
    latestDemoRunHint?.needs_attention && latestDemoRunHint.is_terminal
      ? { label: "Retry in Playground", surface: "playground" as OnboardingSurface }
      : latestDemoRunHint?.needs_attention
        ? { label: "Inspect Playground status", surface: "playground" as OnboardingSurface }
        : onboarding?.checklist.demo_run_succeeded === true
          ? { label: "Open verification evidence lane", surface: "verification" as OnboardingSurface }
          : { label: recommendedNextStep.action, surface: recommendedNextStep.surface };
  const onboardingRecoverySecondary =
    latestDemoRunHint?.needs_attention || onboarding?.checklist.demo_run_succeeded === true
      ? { label: "Review verification checklist", surface: "verification" as OnboardingSurface }
      : { label: "Review rollback prep in Settings", surface: "settings" as OnboardingSurface };
  const onboardingRecoveryMetaLines = filterTextLines([
    latestDemoRunHint?.status_label,
    latestDemoRunHint?.suggested_action,
    deliveryGuidance?.summary,
  ]);

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
          <CardTitle>Onboarding recovery lane</CardTitle>
          <CardDescription>
            Keep the latest demo run, verification evidence, and go-live rehearsal aligned with the current onboarding
            state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="font-medium text-foreground">{onboardingRecoveryTitle}</p>
          <p className="text-xs text-muted">{onboardingRecoveryBody}</p>
          {onboardingRecoveryMetaLines.length > 0 ? (
            <div className="space-y-1 rounded-2xl border border-border bg-background p-3 text-xs text-muted">
              {onboardingRecoveryMetaLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Link
              href={toSurfacePath(onboardingRecoveryPrimary.surface)}
              className="inline-flex items-center rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted/60"
            >
              {onboardingRecoveryPrimary.label}
            </Link>
            <Link
              href={toSurfacePath(onboardingRecoverySecondary.surface)}
              className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted/60"
            >
              {onboardingRecoverySecondary.label}
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended next step</CardTitle>
          <CardDescription>
            Use this as your primary handoff target, then continue with the rest of the navigation surfaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border bg-background p-4 text-sm">
            <p className="font-medium text-foreground">{recommendedNextStep.action}</p>
            <p className="mt-1 text-xs text-muted">{recommendedNextStep.reason}</p>
            <div className="mt-3">
              <Link
                href={toSurfacePath(recommendedNextStep.surface)}
                className="inline-flex items-center rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted/60"
              >
                Open {recommendedNextStep.surface.replaceAll("_", " ")}
              </Link>
            </div>
          </div>
          {onboardingBlockers.length > 0 ? (
            <div className="rounded-2xl border border-border bg-background p-4 text-xs text-muted">
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted">Current blockers</p>
              <ul className="mt-2 space-y-1 text-foreground">
                {onboardingBlockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs uppercase tracking-[0.15em] text-muted">All launch surfaces</p>
          <div className="flex flex-wrap gap-2">
            {nextStepLinks.map((entry) => (
              <Link
                key={entry.label}
                href={toSurfacePath(entry.surface)}
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
