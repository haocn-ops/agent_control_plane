import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountFormPath = path.resolve(testDir, "../../components/service-accounts/create-service-account-form.tsx");
const invitationFormPath = path.resolve(testDir, "../../components/members/create-invitation-form.tsx");

test("Service account form keeps structured error copy and success reset contract", async () => {
  const source = await readFile(serviceAccountFormPath, "utf8");

  assert.match(source, /function describeServiceAccountError/);
  assert.match(source, /Service account limit reached\. Disable another account or upgrade the plan\./);
  assert.match(source, /setName\(""\);/);
  assert.match(source, /setRole\("workspace_service"\);/);
  assert.match(source, /setDescription\(""\);/);
  assert.match(source, /setFormError\(null\);/);
});

test("Invitation form keeps invitation limit copy and success reset contract", async () => {
  const source = await readFile(invitationFormPath, "utf8");

  assert.match(source, /ControlPlaneRequestError/);
  assert.match(source, /Invitation limit reached\. Disable an existing invite or upgrade the plan\./);
  assert.match(source, /setRevealedToken\(result\.invite_token\);/);
  assert.match(source, /setEmail\(""\);/);
  assert.match(source, /setRole\("viewer"\);/);
  assert.match(source, /setExpiresAt\(""\);/);
});
