import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const routes = [
  ["workspace", path.resolve(testDir, "../workspace/route.ts")],
  ["members", path.resolve(testDir, "../members/route.ts")],
  ["me", path.resolve(testDir, "../me/route.ts")],
] as const;

async function readSource(routePath: string): Promise<string> {
  return readFile(routePath, "utf8");
}

function assertMetadataRouteHelper(source: string, routeName: string) {
  assert.match(source, /import \{ proxyMetadataGet \} from "\.\.\/get-route-helpers";/);
  assert.match(source, /return proxyMetadataGet\(/);
  assert.match(source, /message:\s*"[^"]+"/);
  if (routeName === "me") {
    assert.match(source, /getPath:\s*\(\)\s*=>\s*"\/api\/v1\/saas\/me"/);
    assert.match(source, /includeTenant:\s*false/);
  } else {
    assert.match(
      source,
      /getPath:\s*\(workspaceContext\)\s*=>\s*`\/api\/v1\/saas\/workspaces\/\$\{workspaceContext\.workspace\.workspace_id\}(?:\/members)?`/s,
    );
  }
}

test("metadata-only routes use shared helper", async () => {
  for (const [name, routePath] of routes) {
    const source = await readSource(routePath);
    assertMetadataRouteHelper(source, name);
  }
});
