import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(testDir, "../../../src/app.ts");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("billing portal source keeps Stripe-only self-serve portal semantics and return intent mapping", async () => {
  const source = await readSource(appPath);

  assert.match(source, /"billing_provider_portal_unavailable"/);
  assert.match(source, /"The current billing provider does not offer a self-serve customer portal"/);
  assert.match(source, /"billing_provider_portal_unimplemented"/);
  assert.match(source, /"Customer portal creation is not implemented for this billing provider"/);
  assert.match(source, /const returnIntent = currentSubscription\.status === "past_due" \? "resolve-billing" : "manage-plan";/);
  assert.match(source, /const returnUrl = resolveStripeCustomerPortalReturnUrl\(request, env, body\.return_url, returnIntent\);/);
  assert.match(source, /const portalSession = await createStripeBillingPortalSession\(/);
  assert.match(source, /billing_provider: portalSession\.provider,/);
  assert.match(source, /portal_url: portalSession\.portalUrl,/);
  assert.match(source, /return_url: returnUrl,/);
});

test("billing webhook source keeps Stripe verification and checkout/subscription normalization semantics", async () => {
  const source = await readSource(appPath);

  assert.match(source, /const verification = await verifyBillingWebhookSignature\(\{/);
  assert.match(source, /providerCode: provider,/);
  assert.match(source, /stripeWebhookSecret: getOptionalEnvString\(env, "STRIPE_WEBHOOK_SECRET"\),/);
  assert.match(source, /parsedBody = normalizeIncomingBillingWebhookRequest\(provider, JSON\.parse\(rawBody\)\);/);
  assert.match(source, /const body = normalizeSaasBillingProviderWebhookRequest\(parsedBody\);/);

  assert.match(source, /if \(body\.event_type === "checkout\.session\.completed"\) \{/);
  assert.match(source, /"checkout\.session\.completed webhook must include data\.checkout_session_id"/);
  assert.match(source, /verification_mode: verification\.verification_mode,/);
  assert.match(source, /billing_summary: buildWorkspaceBillingSummary\(env, targetPlan, result\.subscription\),/);
  assert.match(source, /billing_providers: buildWorkspaceBillingProviders\(result\.subscription, env\),/);

  assert.match(source, /if \(eventType === "checkout\.session\.completed"\) \{/);
  assert.match(source, /const metadata =\s*typeof payload\.metadata === "object" && payload\.metadata !== null/);
  assert.match(source, /typeof metadata\.workspace_id === "string"/);
  assert.match(source, /typeof metadata\.checkout_session_id === "string" \? metadata\.checkout_session_id : null/);
  assert.match(source, /const externalCustomerRef = typeof payload\.customer === "string" \? payload\.customer : null;/);
  assert.match(source, /const externalSubscriptionRef = typeof payload\.subscription === "string" \? payload\.subscription : null;/);
  assert.match(source, /event_type: "checkout\.session\.completed",/);
  assert.match(source, /status: "active",/);
  assert.match(source, /cancel_at_period_end: false,/);
});
