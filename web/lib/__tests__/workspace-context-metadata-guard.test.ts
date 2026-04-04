import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoutePath = path.resolve(testDir, "../../app/api/control-plane/workspace/route.ts");

test("workspace metadata gate keeps helper-based guard semantics", async () => {
  const source = await readFile(workspaceRoutePath, "utf8");
  assert.match(source, /import \{ proxyMetadataGet \} from "\.\.\/get-route-helpers";/);
  assert.match(source, /proxyMetadataGet\(\{/);
  assert.match(source, /metadata-backed SaaS context/i);
});
