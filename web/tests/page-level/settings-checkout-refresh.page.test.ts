import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const settingsPanelPath = path.resolve(testDir, "../../components/settings/workspace-settings-panel.tsx");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("settings panel keeps checkout refresh notice tied to fetched session", async () => {
  const source = await readSource(settingsPanelPath);

  assert.match(
    source,
    /setCheckout\(\(current\) => \(\{\s*\.\.\.current,\s*refreshing: true,\s*error: null,\s*notice: null,\s*\}\)\);/s,
  );
  assert.match(
    source,
    /setCheckout\(\(current\) => \(\{\s*\.\.\.current,\s*refreshing: false,\s*session,\s*notice: session \? "Loaded checkout session from the current settings link\." : current\.notice,\s*\}\)\);/s,
  );
});
