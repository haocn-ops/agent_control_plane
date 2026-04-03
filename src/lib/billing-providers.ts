import { ApiError } from "./http.js";
import type {
  BillingCheckoutSessionRow,
  PricingPlanRow,
  UserRow,
  WorkspaceRow,
} from "../types.js";

const encoder = new TextEncoder();
const DEFAULT_STRIPE_WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export type BillingProviderCode = "manual" | "internal" | "mock_checkout" | "stripe";

export type BillingProviderDescriptor = {
  code: BillingProviderCode;
  display_name: string;
  kind: "manual" | "internal" | "mock" | "external";
  status: "active" | "available" | "staged";
  is_current: boolean;
  supports_checkout: boolean;
  supports_customer_portal: boolean;
  supports_subscription_cancel: boolean;
  supports_webhooks: boolean;
  webhook_path: string | null;
  notes: string[];
};

export type BillingProviderRegistry = {
  current_provider_code: string | null;
  providers: BillingProviderDescriptor[];
};

export type BillingProviderRegistryOptions = {
  stripeCheckoutEnabled?: boolean;
};

export type BillingWebhookVerificationResult = {
  provider: BillingProviderCode;
  verification_mode: "none" | "stripe_signature";
};

export function buildBillingProviderRegistry(
  activeProviderCode: string | null,
  options: BillingProviderRegistryOptions = {},
): BillingProviderRegistry {
  const activeProvider = normalizeBillingProviderCode(activeProviderCode) ?? activeProviderCode ?? "manual";
  const stripeCheckoutEnabled = options.stripeCheckoutEnabled === true;

  return {
    current_provider_code: activeProviderCode,
    providers: [
      {
        code: "manual",
        display_name: "Manual billing",
        kind: "manual",
        status: activeProvider === "manual" ? "active" : "available",
        is_current: activeProvider === "manual",
        supports_checkout: false,
        supports_customer_portal: false,
        supports_subscription_cancel: false,
        supports_webhooks: false,
        webhook_path: null,
        notes: ["Workspace plan changes are coordinated manually by the team."],
      },
      {
        code: "internal",
        display_name: "Internal operations",
        kind: "internal",
        status: activeProvider === "internal" ? "active" : "staged",
        is_current: activeProvider === "internal",
        supports_checkout: false,
        supports_customer_portal: false,
        supports_subscription_cancel: false,
        supports_webhooks: false,
        webhook_path: null,
        notes: ["Reserved for internal billing operations and assisted migrations."],
      },
      {
        code: "mock_checkout",
        display_name: "Mock checkout",
        kind: "mock",
        status: activeProvider === "mock_checkout" ? "active" : "available",
        is_current: activeProvider === "mock_checkout",
        supports_checkout: true,
        supports_customer_portal: false,
        supports_subscription_cancel: true,
        supports_webhooks: true,
        webhook_path: "/api/v1/saas/billing/providers/mock_checkout:webhook",
        notes: [
          "Internal Week 7 provider used to validate checkout and subscription orchestration safely.",
          "Webhook route accepts normalized provider events without external payment capture.",
        ],
      },
      {
        code: "stripe",
        display_name: "Stripe",
        kind: "external",
        status: activeProvider === "stripe" ? "active" : stripeCheckoutEnabled ? "available" : "staged",
        is_current: activeProvider === "stripe",
        supports_checkout: stripeCheckoutEnabled,
        supports_customer_portal: stripeCheckoutEnabled,
        supports_subscription_cancel: stripeCheckoutEnabled,
        supports_webhooks: true,
        webhook_path: "/api/v1/saas/billing/providers/stripe:webhook",
        notes: stripeCheckoutEnabled
          ? [
              "Hosted Stripe Checkout sessions can now be created for self-serve plan upgrades.",
              "Workspace upgrades finalize only after a verified Stripe webhook completes the session.",
              "Subscription management and cancellation changes are routed through Stripe Billing Portal.",
            ]
          : [
              "Planned external billing provider target for the next integration slice.",
              "Webhook signature verification can be enabled with STRIPE_WEBHOOK_SECRET.",
            ],
      },
    ],
  };
}

export function getBillingProviderDescriptor(
  providerCode: string,
  activeProviderCode: string | null = null,
  options: BillingProviderRegistryOptions = {},
): BillingProviderDescriptor | null {
  const normalizedCode = normalizeBillingProviderCode(providerCode);
  if (!normalizedCode) {
    return null;
  }

  return (
    buildBillingProviderRegistry(activeProviderCode, options).providers.find(
      (provider) => provider.code === normalizedCode,
    ) ?? null
  );
}

export function resolveWorkspaceCheckoutProvider(args?: {
  preferredProviderCode?: string | null;
  stripeCheckoutEnabled?: boolean;
}): BillingProviderDescriptor {
  const preferredProvider = args?.preferredProviderCode
    ? getBillingProviderDescriptor(args.preferredProviderCode, null, {
        stripeCheckoutEnabled: args.stripeCheckoutEnabled === true,
      })
    : null;
  if (preferredProvider?.supports_checkout) {
    return preferredProvider;
  }

  const fallback = getBillingProviderDescriptor("mock_checkout");
  if (!fallback) {
    throw new Error("mock_checkout billing provider is not registered");
  }
  return fallback;
}

export async function verifyBillingWebhookSignature(args: {
  providerCode: string;
  rawBody: string;
  headers: Headers;
  stripeWebhookSecret?: string | null;
  nowMs?: number;
  toleranceSeconds?: number;
}): Promise<BillingWebhookVerificationResult> {
  const providerCode = normalizeBillingProviderCode(args.providerCode);
  if (!providerCode) {
    throw new ApiError(404, "billing_provider_not_supported", "Billing provider is not registered");
  }

  if (providerCode === "mock_checkout") {
    return {
      provider: providerCode,
      verification_mode: "none",
    };
  }

  if (providerCode !== "stripe") {
    throw new ApiError(
      409,
      "billing_provider_webhook_unverified",
      "Webhook verification is not implemented for this billing provider",
      { provider: providerCode },
    );
  }

  const secret = args.stripeWebhookSecret?.trim() ?? "";
  if (secret === "") {
    throw new ApiError(
      503,
      "billing_provider_misconfigured",
      "STRIPE_WEBHOOK_SECRET must be configured before Stripe webhooks can be accepted",
      { provider: providerCode },
    );
  }

  const signatureHeader = args.headers.get("stripe-signature");
  if (!signatureHeader || signatureHeader.trim() === "") {
    throw new ApiError(401, "billing_webhook_signature_missing", "Stripe-Signature header is required");
  }

  const parsedHeader = parseStripeSignatureHeader(signatureHeader);
  const timestamp = parsedHeader.timestamp;
  const nowMs = args.nowMs ?? Date.now();
  const toleranceSeconds = args.toleranceSeconds ?? DEFAULT_STRIPE_WEBHOOK_TOLERANCE_SECONDS;
  if (Math.abs(Math.floor(nowMs / 1000) - timestamp) > toleranceSeconds) {
    throw new ApiError(401, "billing_webhook_signature_expired", "Stripe webhook signature timestamp is outside the allowed tolerance");
  }

  const expectedSignature = await hmacSha256Hex(secret, `${timestamp}.${args.rawBody}`);
  const matched = parsedHeader.signatures.some((signature) => constantTimeEqualHex(signature, expectedSignature));
  if (!matched) {
    throw new ApiError(401, "billing_webhook_signature_invalid", "Stripe webhook signature could not be verified");
  }

  return {
    provider: providerCode,
    verification_mode: "stripe_signature",
  };
}

export async function createStripeCheckoutSession(args: {
  stripeSecretKey: string;
  stripePriceIdMonthly?: string | null;
  stripePriceIdYearly?: string | null;
  workspace: WorkspaceRow;
  user: UserRow;
  targetPlan: PricingPlanRow;
  billingInterval: BillingCheckoutSessionRow["billing_interval"];
  checkoutSessionId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{
  provider: "stripe";
  providerSessionId: string;
  checkoutUrl: string;
}> {
  const secretKey = args.stripeSecretKey.trim();
  if (secretKey === "") {
    throw new ApiError(
      503,
      "billing_provider_misconfigured",
      "STRIPE_SECRET_KEY must be configured before Stripe checkout can be created",
      { provider: "stripe" },
    );
  }

  const form = new URLSearchParams();
  const configuredPriceId =
    args.billingInterval === "yearly"
      ? args.stripePriceIdYearly?.trim() ?? ""
      : args.stripePriceIdMonthly?.trim() ?? "";
  const planAmountCents =
    args.billingInterval === "yearly" ? args.targetPlan.yearly_price_cents : args.targetPlan.monthly_price_cents;

  form.set("mode", "subscription");
  form.set("success_url", args.successUrl);
  form.set("cancel_url", args.cancelUrl);
  form.set("client_reference_id", args.workspace.workspace_id);
  form.set("metadata[workspace_id]", args.workspace.workspace_id);
  form.set("metadata[checkout_session_id]", args.checkoutSessionId);
  form.set("metadata[target_plan_id]", args.targetPlan.plan_id);
  form.set("metadata[target_plan_code]", args.targetPlan.code);
  form.set("metadata[billing_interval]", args.billingInterval);
  form.set("subscription_data[metadata][workspace_id]", args.workspace.workspace_id);
  form.set("subscription_data[metadata][checkout_session_id]", args.checkoutSessionId);
  form.set("subscription_data[metadata][target_plan_id]", args.targetPlan.plan_id);
  form.set("subscription_data[metadata][target_plan_code]", args.targetPlan.code);
  form.set("subscription_data[metadata][billing_interval]", args.billingInterval);
  form.set("line_items[0][quantity]", "1");

  if (configuredPriceId !== "") {
    form.set("line_items[0][price]", configuredPriceId);
  } else {
    if (!Number.isFinite(planAmountCents) || (planAmountCents ?? 0) <= 0) {
      throw new ApiError(
        503,
        "billing_provider_misconfigured",
        "Stripe checkout could not resolve a non-zero price for the selected billing interval",
        {
          provider: "stripe",
          target_plan_id: args.targetPlan.plan_id,
          billing_interval: args.billingInterval,
        },
      );
    }

    form.set("line_items[0][price_data][currency]", "usd");
    form.set("line_items[0][price_data][unit_amount]", String(planAmountCents));
    form.set("line_items[0][price_data][product_data][name]", `Govrail ${args.targetPlan.display_name}`);
    form.set(
      "line_items[0][price_data][product_data][description]",
      `${args.targetPlan.display_name} workspace subscription billed ${args.billingInterval}`,
    );
    form.set(
      "line_items[0][price_data][recurring][interval]",
      args.billingInterval === "yearly" ? "year" : "month",
    );
  }

  if (args.user.email_normalized.trim() !== "") {
    form.set("customer_email", args.user.email_normalized.trim());
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": args.checkoutSessionId,
    },
    body: form,
  });

  const rawBody = await response.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error =
      payload && typeof payload.error === "object" && payload.error !== null
        ? (payload.error as Record<string, unknown>)
        : null;
    throw new ApiError(
      502,
      "billing_provider_checkout_failed",
      typeof error?.message === "string"
        ? error.message
        : `Stripe checkout session creation failed with status ${response.status}`,
      {
        provider: "stripe",
        stripe_status: response.status,
        stripe_code: typeof error?.code === "string" ? error.code : null,
        stripe_type: typeof error?.type === "string" ? error.type : null,
      },
    );
  }

  const providerSessionId = typeof payload?.id === "string" ? payload.id : null;
  const checkoutUrl = typeof payload?.url === "string" ? payload.url : null;
  if (!providerSessionId || !checkoutUrl) {
    throw new ApiError(
      502,
      "billing_provider_checkout_failed",
      "Stripe checkout session response was missing id or url",
      { provider: "stripe" },
    );
  }

  return {
    provider: "stripe",
    providerSessionId,
    checkoutUrl,
  };
}

export async function createStripeBillingPortalSession(args: {
  stripeSecretKey: string;
  customerRef: string;
  returnUrl: string;
  portalSessionId: string;
}): Promise<{
  provider: "stripe";
  providerSessionId: string;
  portalUrl: string;
}> {
  const secretKey = args.stripeSecretKey.trim();
  if (secretKey === "") {
    throw new ApiError(
      503,
      "billing_provider_misconfigured",
      "STRIPE_SECRET_KEY must be configured before Stripe billing portal sessions can be created",
      { provider: "stripe" },
    );
  }

  const customerRef = args.customerRef.trim();
  if (customerRef === "") {
    throw new ApiError(
      409,
      "billing_provider_customer_missing",
      "Stripe billing portal requires a synced customer reference",
      { provider: "stripe" },
    );
  }

  const form = new URLSearchParams();
  form.set("customer", customerRef);
  form.set("return_url", args.returnUrl);

  const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": args.portalSessionId,
    },
    body: form,
  });

  const rawBody = await response.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error =
      payload && typeof payload.error === "object" && payload.error !== null
        ? (payload.error as Record<string, unknown>)
        : null;
    throw new ApiError(
      502,
      "billing_provider_portal_failed",
      typeof error?.message === "string"
        ? error.message
        : `Stripe billing portal session creation failed with status ${response.status}`,
      {
        provider: "stripe",
        stripe_status: response.status,
        stripe_code: typeof error?.code === "string" ? error.code : null,
        stripe_type: typeof error?.type === "string" ? error.type : null,
      },
    );
  }

  const providerSessionId = typeof payload?.id === "string" ? payload.id : null;
  const portalUrl = typeof payload?.url === "string" ? payload.url : null;
  if (!providerSessionId || !portalUrl) {
    throw new ApiError(
      502,
      "billing_provider_portal_failed",
      "Stripe billing portal response was missing id or url",
      { provider: "stripe" },
    );
  }

  return {
    provider: "stripe",
    providerSessionId,
    portalUrl,
  };
}

function normalizeBillingProviderCode(value: string | null | undefined): BillingProviderCode | null {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "manual" ||
    normalized === "internal" ||
    normalized === "mock_checkout" ||
    normalized === "stripe"
  ) {
    return normalized;
  }
  return null;
}

function parseStripeSignatureHeader(header: string): {
  timestamp: number;
  signatures: string[];
} {
  const entries = header
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const separator = part.indexOf("=");
      if (separator <= 0) {
        return null;
      }
      return {
        key: part.slice(0, separator),
        value: part.slice(separator + 1),
      };
    })
    .filter((entry): entry is { key: string; value: string } => entry !== null);

  const timestampValue = entries.find((entry) => entry.key === "t")?.value;
  const timestamp = Number.parseInt(timestampValue ?? "", 10);
  if (!Number.isFinite(timestamp)) {
    throw new ApiError(400, "invalid_request", "Stripe-Signature header must include a valid t= timestamp");
  }

  const signatures = entries
    .filter((entry) => entry.key === "v1" && entry.value.trim() !== "")
    .map((entry) => entry.value.trim().toLowerCase());
  if (signatures.length === 0) {
    throw new ApiError(400, "invalid_request", "Stripe-Signature header must include at least one v1 signature");
  }

  return {
    timestamp,
    signatures,
  };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqualHex(left: string, right: string): boolean {
  const normalizedLeft = left.trim().toLowerCase();
  const normalizedRight = right.trim().toLowerCase();
  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < normalizedLeft.length; index += 1) {
    diff |= normalizedLeft.charCodeAt(index) ^ normalizedRight.charCodeAt(index);
  }
  return diff === 0;
}
