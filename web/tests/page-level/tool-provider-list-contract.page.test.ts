import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const componentPath = path.resolve(testDir, "../../components/agents/tool-provider-list.tsx");

async function readSource(): Promise<string> {
  return readFile(componentPath, "utf8");
}

test("Tool provider list keeps helper imports and plan-limit messaging", async () => {
  const source = await readSource();

  assert.match(source, /PlanLimitState,/);
  assert.match(source, /createToolProvider,/);
  assert.match(source, /updateToolProviderStatus,/);
  assert.match(source, /Plan limit reached/);
  assert.match(source, /Scope: <span className="font-medium">\{planLimit\.scope\}<\/span>/);
  assert.match(
    source,
    /Upgrade workspace plan or disable an existing active provider, then retry this action\./,
  );
});
