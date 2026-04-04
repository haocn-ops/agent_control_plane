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

test("billing webhook keeps checkout.session.completed fallback to session lookup before not-found", async () => {
  const source = await readSource(appPath);

  assert.match(source, /if \(body\.event_type === "checkout\.session\.completed"\)/);
  assert.match(
    source,
    /const checkoutSession = await requireWorkspaceBillingCheckoutSession\([\s\S]*?body\.data\.checkout_session_id[\s\S]*?\.catch\(async \(\) => \{/s,
  );
  assert.match(
    source,
    /const session = await getBillingCheckoutSessionById\(env,\s*body\.data\.checkout_session_id as string\);/,
  );
  assert.match(
    source,
    /throw new ApiError\(404,\s*"billing_checkout_session_not_found",\s*"Checkout session does not exist"\);/,
  );
});
