import { spawnSync } from "node:child_process";

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const nodeCommand = process.execPath;

run(npmCommand, ["run", "test:browser:build"]);
run(nodeCommand, ["scripts/run-playwright-prebuilt-smoke.mjs", ...process.argv.slice(2)]);
