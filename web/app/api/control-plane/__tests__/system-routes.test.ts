import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const healthRoutePath = path.resolve(testDir, "../health/route.ts");
const policiesRoutePath = path.resolve(testDir, "../policies/route.ts");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("health route keeps /api/v1/health path and includeTenant=false guard", async () => {
  const source = await readSource(healthRoutePath);

  assert.match(source, /proxyControlPlane\("\/api\/v1\/health"/);
  assert.match(source, /includeTenant:\s*false/);
});

test("policies route keeps preview fallback contract", async () => {
  const source = await readSource(policiesRoutePath);

  assert.match(source, /proxyControlPlaneOrFallback\(\s*"\/api\/v1\/policies",/s);
  assert.match(source, /items:\s*previewPolicies,/);
  assert.match(source, /page_info:\s*\{\s*next_cursor:\s*null\s*\}/s);
});
