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

test("checkout completion route defers to billing provider webhook for Stripe", async () => {
  const source = await readSource(appPath);

  assert.match(
    source,
    /if \(session\.billing_provider !== "mock_checkout"\) \{[\s\S]*?throw new ApiError\(\s*409,\s*"billing_checkout_completion_deferred",\s*"This checkout session must be finalized by its billing provider webhook flow",/s,
  );
  assert.match(source, /billing_checkout_completion_deferred[\s\S]*billing_provider: session\.billing_provider/);
});

test("billing webhook handles missing checkout session and normalizes Stripe payload", async () => {
  const source = await readSource(appPath);

  assert.match(source, /if \(body\.event_type === "checkout\.session\.completed"\) \{/);
  assert.match(source, /"checkout\.session\.completed webhook must include data\.checkout_session_id"/);
  assert.match(source, /throw new ApiError\(404,\s*"billing_checkout_session_not_found"/);
  assert.match(source, /normalizeIncomingBillingWebhookRequest\(provider, JSON\.parse\(rawBody\)\);/);
  assert.match(source, /const eventType = typeof event\.type === "string" \? event\.type : "";/);
  assert.match(source, /const payload = event\.data\?\.object;/);
  assert.match(source, /event_type: "checkout\.session\.completed",/);
  assert.match(source, /status: "active",/);
  assert.match(source, /cancel_at_period_end: false,/);
});
