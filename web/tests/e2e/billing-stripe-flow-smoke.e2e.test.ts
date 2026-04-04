import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  completeBillingCheckoutSession,
  createBillingCheckoutSession,
  createBillingPortalSession,
  fetchBillingCheckoutSession,
} from "../../services/control-plane";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(testDir, "../../../src/app.ts");

async function withMockFetch<T>(
  mock: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  fn: () => Promise<T> | T,
): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test(
  "smoke(non-browser, source-assisted+execution): Stripe checkout lifecycle keeps upgrade-to-manage-plan semantics aligned",
  { concurrency: false },
  async () => {
    const source = await readSource(appPath);
    assert.match(
      source,
      /label: isPaidPlan\s*\?\s*"Coordinate plan changes"\s*:\s*actionReady\s*&&\s*checkoutProviderIsStripe\s*\?\s*"Upgrade to Pro"/,
    );
    assert.match(source, /href: isPaidPlan \? "\/settings\?intent=manage-plan" \: "\/settings\?intent=upgrade"/);
    assert.match(source, /status_label: isPaidPlan \? "Paid plan active" : "Subscription active"/);
    assert.match(source, /description: activeManageReady\s*\?\s*"The workspace has an active self-serve-capable subscription\."/);

    const calls: Array<{ path: string; method: string }> = [];

    await withMockFetch(async (input, init) => {
      calls.push({
        path: String(input),
        method: init?.method ?? "GET",
      });

      if (String(input) === "/api/control-plane/workspace/billing/checkout-sessions" && init?.method === "POST") {
        return Response.json({
          data: {
            checkout_session: {
              session_id: "chk_stripe",
              status: "open",
              billing_provider: "stripe",
              target_plan_code: "pro",
              checkout_url: "/settings?intent=upgrade&checkout_session_id=chk_stripe",
              review_url: "/settings?intent=upgrade&checkout_session_id=chk_stripe",
            },
          },
        });
      }

      if (String(input) === "/api/control-plane/workspace/billing/checkout-sessions/chk_stripe" && !init?.method) {
        return Response.json({
          data: {
            checkout_session: {
              session_id: "chk_stripe",
              status: "open",
              billing_provider: "stripe",
              target_plan_code: "pro",
              review_url: "/settings?intent=upgrade&checkout_session_id=chk_stripe",
            },
          },
        });
      }

      if (
        String(input) === "/api/control-plane/workspace/billing/checkout-sessions/chk_stripe/complete" &&
        init?.method === "POST"
      ) {
        return Response.json({
          data: {
            checkout_session: {
              session_id: "chk_stripe",
              status: "completed",
              billing_provider: "stripe",
              target_plan_code: "pro",
            },
            subscription: {
              status: "active",
              billing_provider: "stripe",
              cancel_at_period_end: false,
            },
            billing_summary: {
              status_label: "Paid plan active",
              status_tone: "positive",
              provider: "stripe",
              action: {
                kind: "manage_plan",
                label: "Manage subscription",
                href: "/settings?intent=manage-plan",
                availability: "ready",
              },
            },
          },
        });
      }

      throw new Error(`Unexpected fetch ${String(input)} ${init?.method ?? "GET"}`);
    }, async () => {
      const created = await createBillingCheckoutSession({
        target_plan_id: "plan_pro",
        billing_interval: "monthly",
      });
      assert.equal(created.checkout_session.status, "open");
      assert.equal(created.checkout_session.checkout_url, "/settings?intent=upgrade&checkout_session_id=chk_stripe");

      const fetched = await fetchBillingCheckoutSession("chk_stripe");
      assert.equal(fetched.checkout_session.status, "open");
      assert.equal(fetched.checkout_session.review_url, "/settings?intent=upgrade&checkout_session_id=chk_stripe");

      const completed = await completeBillingCheckoutSession("chk_stripe");
      assert.equal(completed.subscription?.status, "active");
      assert.equal(completed.billing_summary.status_label, "Paid plan active");
      assert.equal(completed.billing_summary.action?.kind, "manage_plan");
      assert.equal(completed.billing_summary.action?.href, "/settings?intent=manage-plan");
    });

    assert.deepEqual(calls, [
      { path: "/api/control-plane/workspace/billing/checkout-sessions", method: "POST" },
      { path: "/api/control-plane/workspace/billing/checkout-sessions/chk_stripe", method: "GET" },
      { path: "/api/control-plane/workspace/billing/checkout-sessions/chk_stripe/complete", method: "POST" },
    ]);
  },
);

test("smoke(non-browser, source-assisted+execution): Stripe billing portal session keeps return_url passthrough and Stripe-like response shape", async () => {
  const calls: Array<{ path: string; method: string; body: Record<string, unknown> | null }> = [];

  await withMockFetch(async (input, init) => {
    const body =
      typeof init?.body === "string"
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : null;
    calls.push({
      path: String(input),
      method: init?.method ?? "GET",
      body,
    });

    if (String(input) === "/api/control-plane/workspace/billing/portal-sessions" && init?.method === "POST") {
      assert.equal(body?.return_url, "https://govrail.net/settings?intent=manage-plan");
      return Response.json({
        data: {
          billing_provider: "stripe",
          portal_url: "https://billing.stripe.test/session/bps_123",
          return_url: "https://govrail.net/settings?intent=manage-plan",
          id: "bps_123",
          object: "billing_portal.session",
          configuration: "bpc_123",
          created: 1712222400,
          livemode: false,
        },
      });
    }

    throw new Error(`Unexpected fetch ${String(input)} ${init?.method ?? "GET"}`);
  }, async () => {
    const portal = await createBillingPortalSession({
      return_url: "https://govrail.net/settings?intent=manage-plan",
    });

    assert.equal(portal.billing_provider, "stripe");
    assert.equal(portal.portal_url, "https://billing.stripe.test/session/bps_123");
    assert.equal(portal.return_url, "https://govrail.net/settings?intent=manage-plan");
  });

  assert.deepEqual(calls, [
    {
      path: "/api/control-plane/workspace/billing/portal-sessions",
      method: "POST",
      body: {
        return_url: "https://govrail.net/settings?intent=manage-plan",
      },
    },
  ]);
});

test("smoke(non-browser, source-assisted): billing webhook normalizes subscription events to internal metadata", async () => {
  const source = await readSource(appPath);

  assert.match(
    source,
    /if \(eventType === "customer\.subscription\.updated" \|\| eventType === "customer\.subscription\.deleted"\)/,
  );
  assert.match(source, /const cancelAtPeriodEnd =\s*typeof payload\.cancel_at_period_end === "boolean"/);
  assert.match(
    source,
    /event_type: eventType === "customer\.subscription\.deleted" \? "subscription\.cancelled" : "subscription\.updated",/,
  );
  assert.match(source, /new Date\(payload\.current_period_start \* 1000\)\.toISOString\(\)/);
  assert.match(source, /\.\.\.\(cancelAtPeriodEnd !== null \? \{ cancel_at_period_end: cancelAtPeriodEnd \} : {}\),/);
});

test("smoke(non-browser, source-assisted): checkout.session.completed webhook keeps workspace and external refs aligned", async () => {
  const source = await readSource(appPath);

  assert.match(source, /if \(eventType === "checkout\.session\.completed"\) \{/);
  assert.match(
    source,
    /const workspaceId =\s*typeof metadata\.workspace_id === "string"\s*\?\s*metadata\.workspace_id\s*:\s*typeof payload\.client_reference_id === "string"\s*\?\s*payload\.client_reference_id\s*:\s*null;/s,
  );
  assert.match(source, /const checkoutSessionId = typeof metadata\.checkout_session_id === "string" \? metadata\.checkout_session_id : null;/);
  assert.match(source, /const externalCustomerRef = typeof payload\.customer === "string" \? payload\.customer : null;/);
  assert.match(source, /const externalSubscriptionRef = typeof payload\.subscription === "string" \? payload\.subscription : null;/);
  assert.match(source, /event_type: "checkout\.session\.completed",/);
  assert.match(source, /status: "active",/);
  assert.match(source, /cancel_at_period_end: false,/);
});

test(
  "smoke(non-browser, source-assisted): subscription cancellation and resume webhook transitions keep billing summary follow-up semantics aligned",
  async () => {
    const source = await readSource(appPath);

    assert.match(
      source,
      /const nextStatus =\s*body\.event_type === "subscription\.cancelled"\s*\?\s*"cancelled"\s*:\s*body\.event_type === "subscription\.resumed"\s*\?\s*"active"\s*:/s,
    );
    assert.match(
      source,
      /const nextCancelAtPeriodEnd =\s*body\.event_type === "subscription\.cancelled"\s*\?\s*false\s*:\s*body\.event_type === "subscription\.resumed"\s*\?\s*false\s*:/s,
    );
    assert.match(
      source,
      /const nextCurrentPeriodEnd =\s*body\.data\.current_period_end \?\?\s*\(body\.event_type === "subscription\.cancelled"\s*\?\s*\(currentSubscription\.current_period_end \?\? nowIso\(\)\)\s*:\s*currentSubscription\.current_period_end\);/s,
    );

    assert.match(
      source,
      /if \(cancelAtPeriodEnd\) \{[\s\S]*status_label: "Scheduled to end"[\s\S]*label: manageSelfServeEnabled \? "Manage scheduled cancellation" : "Coordinate renewal"[\s\S]*href: "\/settings\?intent=manage-plan"[\s\S]*availability: manageSelfServeEnabled \? "ready" : "staged",/s,
    );
    assert.match(
      source,
      /if \(subscription\.status === "cancelled"\) \{[\s\S]*status_label: "Subscription cancelled"[\s\S]*label:\s*replacementUpgradeReady\s*\?[\s\S]*"Choose a new plan"[\s\S]*"Run replacement test flow"[\s\S]*"Start replacement plan flow"[\s\S]*"Prepare replacement plan"[\s\S]*href: "\/settings\?intent=upgrade"[\s\S]*availability: replacementUpgradeReady \? "ready" : "staged",/s,
    );
    assert.match(
      source,
      /const activeManageReady = manageSelfServeEnabled;[\s\S]*status_label: isPaidPlan \? "Paid plan active" : "Subscription active"[\s\S]*description: activeManageReady\s*\?\s*"The workspace has an active self-serve-capable subscription\."[\s\S]*href: "\/settings\?intent=manage-plan"[\s\S]*availability: activeManageReady \? "ready" : "staged",/s,
    );
  },
);
