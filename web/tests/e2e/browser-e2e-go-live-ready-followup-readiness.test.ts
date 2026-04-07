import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(testDir, "../..");
const executionPlanPath = path.resolve(webDir, "../docs/saas_v1_execution_plan_zh.md");

test("go-live-ready follow-up browser batch stays referenced in execution plan", async () => {
  const executionPlan = await readFile(executionPlanPath, "utf8");

  assert.match(executionPlan, /go_live_ready/);
  assert.match(executionPlan, /go-live -> usage -> admin/);
  assert.match(executionPlan, /go-live -> playground -> admin/);
  assert.match(executionPlan, /go-live -> artifacts -> admin/);
  assert.match(executionPlan, /go-live -> settings -> admin/);
});
