import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const onboardingWizardPath = path.resolve(testDir, "../../components/onboarding/workspace-onboarding-wizard.tsx");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("onboarding wizard keeps explicit workspace-context selection helper after workspace creation", async () => {
  const source = await readSource(onboardingWizardPath);

  assert.match(source, /async function selectWorkspaceContext\(workspace: \{/);
  assert.match(source, /await fetch\("\/api\/workspace-context", \{/);
  assert.match(source, /method: "POST"/);
  assert.match(source, /accept: "application\/json"/);
  assert.match(source, /"content-type": "application\/json"/);
  assert.match(source, /workspace_id: workspace\.workspace_id/);
  assert.match(source, /workspace_slug: workspace\.slug/);
  assert.match(source, /Keep the onboarding flow resilient even if the context switch probe fails/);
  assert.match(source, /await selectWorkspaceContext\(nextWorkspace\);/);
});

test("onboarding wizard keeps create->context-switch->invalidate->refresh sequencing contract", async () => {
  const source = await readSource(onboardingWizardPath);

  assert.match(source, /setCreatedWorkspace\(nextWorkspace\);\s*setBootstrapResult\(null\);/s);
  assert.match(source, /setBootstrapResult\(null\);\s*await selectWorkspaceContext\(nextWorkspace\);/s);
  assert.match(source, /await selectWorkspaceContext\(nextWorkspace\);\s*await queryClient\.invalidateQueries\(\);\s*router\.refresh\(\);/s);
});
