import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoutePath = path.resolve(testDir, "../workspace/route.ts");
const meRoutePath = path.resolve(testDir, "../me/route.ts");
const membersRoutePath = path.resolve(testDir, "../members/route.ts");

async function readRouteSource(routePath: string): Promise<string> {
  return readFile(routePath, "utf8");
}

function assertMetadataGuardContract(source: string, pathPattern: RegExp): void {
  assert.match(source, /import \{ proxyMetadataGet \} from "\.\.\/get-route-helpers";/);
  assert.match(source, /return proxyMetadataGet\(\{/s);
  assert.match(source, /message:\s*"[^"]+"/);
  assert.match(source, pathPattern);
}

test("workspace route keeps metadata guard 412 contract", async () => {
  const source = await readRouteSource(workspaceRoutePath);
  assertMetadataGuardContract(
    source,
    /getPath:\s*\(workspaceContext\)\s*=>\s*`\/api\/v1\/saas\/workspaces\/\$\{workspaceContext\.workspace\.workspace_id\}`/s,
  );
});

test("me route keeps metadata guard 412 contract and includeTenant=false", async () => {
  const source = await readRouteSource(meRoutePath);
  assertMetadataGuardContract(
    source,
    /getPath:\s*\(\)\s*=>\s*"\/api\/v1\/saas\/me".*includeTenant:\s*false/s,
  );
});

test("members route keeps metadata guard 412 contract and workspace members upstream path", async () => {
  const source = await readRouteSource(membersRoutePath);
  assertMetadataGuardContract(
    source,
    /getPath:\s*\(workspaceContext\)\s*=>\s*`\/api\/v1\/saas\/workspaces\/\$\{workspaceContext\.workspace\.workspace_id\}\/members`/s,
  );
});
