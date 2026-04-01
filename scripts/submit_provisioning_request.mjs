#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

function printUsage() {
  console.log([
    "Usage: node scripts/submit_provisioning_request.mjs --request <file> --endpoint <url> [options]",
    "",
    "Required:",
    "  --request <file>       Provisioning request JSON to submit",
    "  --endpoint <url>       HTTP endpoint that accepts the request JSON",
    "",
    "Options:",
    "  --output <file>        Evidence JSON output path (default: ./provisioning-submission-evidence.json)",
    "  --method <verb>        HTTP method (default: POST)",
    "  --timeout-ms <n>       Request timeout in milliseconds (default: 30000)",
    "  --header <name:value>  Extra header to send; may be repeated",
    "  --help                 Show this help message",
    "",
    "Environment:",
    "  PROVISIONING_TOKEN     Optional bearer token added as Authorization: Bearer <token>",
    "  PROVISIONING_HEADERS   Optional JSON object merged into request headers",
  ].join("\n"));
}

function parseArgs(argv) {
  const options = { headers: [] };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      options._ = options._ ?? [];
      options._.push(arg);
      continue;
    }

    const eqIndex = arg.indexOf("=");
    const key = arg.slice(2, eqIndex === -1 ? undefined : eqIndex);
    let value = eqIndex === -1 ? argv[index + 1] : arg.slice(eqIndex + 1);
    if (eqIndex === -1) {
      if (value === undefined || value.startsWith("--")) {
        value = "true";
      } else {
        index += 1;
      }
    }

    if (key === "header") {
      options.headers.push(value);
    } else {
      options[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    }
  }
  return options;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required argument: ${label}`);
  }
  return value.trim();
}

function normalizeOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseJsonMaybe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function parseHeaderPair(value) {
  const raw = requireString(value, "--header");
  const separatorIndex = raw.indexOf(":");
  if (separatorIndex === -1) {
    throw new Error(`Invalid --header value: ${raw}. Expected name:value`);
  }
  const name = raw.slice(0, separatorIndex).trim();
  const headerValue = raw.slice(separatorIndex + 1).trim();
  if (name === "" || headerValue === "") {
    throw new Error(`Invalid --header value: ${raw}. Expected name:value`);
  }
  return [name, headerValue];
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    return;
  }

  const requestPath = resolve(requireString(args.request, "--request"));
  const endpoint = requireString(args.endpoint, "--endpoint");
  const method = normalizeOptionalString(args.method)?.toUpperCase() ?? "POST";
  const outputPath = resolve(normalizeOptionalString(args.output) ?? "provisioning-submission-evidence.json");
  const timeoutMs = Number.parseInt(normalizeOptionalString(args.timeoutMs) ?? "30000", 10);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive integer");
  }

  const rawRequest = await readFile(requestPath, "utf8");
  const requestJson = parseJsonMaybe(rawRequest);
  if (requestJson === null || typeof requestJson !== "object" || Array.isArray(requestJson)) {
    throw new Error(`Request file must contain a JSON object: ${requestPath}`);
  }

  const headers = new Headers({
    "content-type": "application/json",
    "user-agent": "agent-control-plane-provisioning-submit-helper",
  });
  const authToken = normalizeOptionalString(process.env.PROVISIONING_TOKEN);
  if (authToken) {
    headers.set("authorization", `Bearer ${authToken}`);
  }

  const mergedHeaders = normalizeOptionalString(process.env.PROVISIONING_HEADERS);
  if (mergedHeaders) {
    const parsed = parseJsonMaybe(mergedHeaders);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("PROVISIONING_HEADERS must be a JSON object");
    }
    for (const [name, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim() !== "") {
        headers.set(name, value.trim());
      }
    }
  }

  for (const header of args.headers ?? []) {
    const [name, value] = parseHeaderPair(header);
    headers.set(name, value);
  }

  const headerNames = [...headers.keys()].sort();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);

  let response = null;
  let responseText = null;
  let responseJson = null;
  let networkError = null;
  const submittedAt = new Date().toISOString();

  try {
    response = await fetch(endpoint, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : rawRequest,
      signal: controller.signal,
    });
    responseText = await response.text();
    responseJson = parseJsonMaybe(responseText);
  } catch (error) {
    networkError = error instanceof Error ? error.message : String(error);
  } finally {
    clearTimeout(timeout);
  }

  const evidence = {
    ok: networkError === null && response !== null && response.ok,
    submitted_at: submittedAt,
    request: {
      path: requestPath,
      sha256: sha256(rawRequest),
      body: requestJson,
    },
    endpoint: {
      url: endpoint,
      method,
      timeout_ms: timeoutMs,
      headers: headerNames,
    },
    response:
      response === null
        ? {
            ok: false,
            error: networkError,
          }
        : {
            ok: response.ok,
            status: response.status,
            status_text: response.statusText,
            headers: Object.fromEntries(
              [...response.headers.entries()].filter(([name]) =>
                ["content-type", "x-request-id", "x-trace-id", "location"].includes(name.toLowerCase()),
              ),
            ),
            text: responseText,
            json: responseJson,
          },
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  if (!evidence.ok) {
    const message =
      networkError ??
      `Provisioning request failed with status ${response?.status ?? "unknown"} ${response?.statusText ?? ""}`.trim();
    console.error(message);
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
