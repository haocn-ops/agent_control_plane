import { defineConfig } from "@playwright/test";

const systemChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3005";
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
  "npm run build && npm run start -- --hostname 127.0.0.1 --port 3005";
const webServerTimeout = Number(process.env.PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS ?? "240000");
const reuseExistingServer =
  process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER == null
    ? true
    : process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1";

export default defineConfig({
  testDir: "./tests/browser",
  // Keep artifacts out of the app tree and run against a production-backed server
  // so long suites are not interrupted by dev-server watcher churn.
  outputDir: "/tmp/govrail-playwright-test-results",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    launchOptions: {
      executablePath: systemChromePath,
    },
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    timeout: webServerTimeout,
    reuseExistingServer,
  },
});
