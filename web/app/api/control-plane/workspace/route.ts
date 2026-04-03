import { proxyControlPlaneOrFallback } from "@/lib/control-plane-proxy";
import { resolveWorkspaceContextForServer } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const workspaceContext = await resolveWorkspaceContextForServer();
  const now = new Date().toISOString();

  return proxyControlPlaneOrFallback(
    `/api/v1/saas/workspaces/${workspaceContext.workspace.workspace_id}`,
    {
      workspace: {
        workspace_id: workspaceContext.workspace.workspace_id,
        organization: {
          organization_id: "org_preview",
          slug: "preview",
          display_name: "Preview Organization",
          status: "active",
        },
        tenant_id: workspaceContext.workspace.tenant_id,
        slug: workspaceContext.workspace.slug,
        display_name: workspaceContext.workspace.display_name,
        status: "active",
        plan_id: "plan_free",
        data_region: "global",
        membership: {
          role: "workspace_owner",
          status: "active",
          joined_at: null,
        },
        created_at: now,
        updated_at: now,
      },
      plan: {
        plan_id: "plan_free",
        code: "free",
        display_name: "Free",
        tier: "free",
        status: "active",
        monthly_price_cents: 0,
        yearly_price_cents: 0,
        limits: {
          runs_per_month: 1000,
          tool_providers: 3,
          member_seats: 3,
          artifact_retention_days: 7,
        },
        features: {
          sso: false,
          audit_export: false,
          dedicated_environment: false,
        },
      },
      subscription: null,
      billing_summary: {
        status: "manual_free",
        status_label: "Free plan",
        status_tone: "neutral",
        provider: "manual",
        plan_code: "free",
        plan_display_name: "Free",
        monthly_price_cents: 0,
        current_period_start: now,
        current_period_end: null,
        cancel_at_period_end: false,
        self_serve_enabled: false,
        description: "Upgrade entry is staged for the first self-serve billing slice.",
        action: {
          kind: "upgrade",
          label: "Stage Pro upgrade",
          href: "/settings?intent=upgrade",
          availability: "staged",
        },
      },
      billing_providers: {
        current_provider_code: "manual",
        providers: [
          {
            code: "manual",
            display_name: "Manual billing",
            kind: "manual",
            status: "active",
            is_current: true,
            supports_checkout: false,
            supports_customer_portal: false,
            supports_subscription_cancel: false,
            supports_webhooks: false,
            webhook_path: null,
            notes: ["Workspace plan changes are coordinated manually in preview mode."],
          },
          {
            code: "mock_checkout",
            display_name: "Mock checkout",
            kind: "mock",
            status: "available",
            is_current: false,
            supports_checkout: true,
            supports_customer_portal: false,
            supports_subscription_cancel: true,
            supports_webhooks: true,
            webhook_path: "/api/v1/saas/billing/providers/mock_checkout:webhook",
            notes: ["Preview self-serve billing scaffold for Week 7."],
          },
          {
            code: "stripe",
            display_name: "Stripe",
            kind: "external",
            status: "staged",
            is_current: false,
            supports_checkout: false,
            supports_customer_portal: false,
            supports_subscription_cancel: false,
            supports_webhooks: true,
            webhook_path: "/api/v1/saas/billing/providers/stripe:webhook",
            notes: [
              "Planned external billing provider target for the next integration slice.",
              "Stripe webhook signature verification can be enabled with STRIPE_WEBHOOK_SECRET.",
            ],
          },
        ],
      },
      usage: {
        period_start: now,
        period_end: now,
        metrics: {
          runs_created: {
            used: 0,
            limit: 1000,
            remaining: 1000,
            over_limit: false,
          },
          artifact_storage_bytes: {
            used: 0,
            limit: null,
            remaining: null,
            over_limit: false,
          },
          active_tool_providers: {
            used: 0,
            limit: 3,
            remaining: 3,
            over_limit: false,
          },
        },
      },
      onboarding: {
        status: "workspace_created",
        checklist: {
          workspace_created: true,
          baseline_ready: false,
          service_account_created: false,
          api_key_created: false,
          demo_run_created: false,
          demo_run_succeeded: false,
        },
        summary: {
          providers_total: 0,
          policies_total: 0,
          providers_created: 0,
          providers_existing: 0,
          policies_created: 0,
          policies_existing: 0,
          service_accounts_total: 0,
          api_keys_total: 0,
          demo_runs_total: 0,
        },
        latest_demo_run: null,
        next_actions: [
          "Bootstrap the baseline provider and policy bundle",
          "Create a service account for the first workload",
          "Issue an API key and store the one-time secret",
        ],
      },
      members: [],
    },
  );
}
