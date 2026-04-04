import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const createFormPath = path.resolve(testDir, "../../components/api-keys/create-api-key-form.tsx");
const panelPath = path.resolve(testDir, "../../components/api-keys/api-keys-panel.tsx");

async function readSource(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

test("Create API key form keeps structured limit/error guidance copy", async () => {
  const source = await readSource(createFormPath);
  assert.match(source, /function formatApiKeyError/);
  assert.match(source, /API key limit reached/);
  assert.match(source, /API key request failed/);
});

test("API keys panel keeps structured action error copy", async () => {
  const source = await readSource(panelPath);
  assert.match(source, /function formatApiKeyActionError/);
  assert.match(source, /API key action failed/);
  assert.match(source, /text-red-600/);
});
