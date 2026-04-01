#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";

function printUsage() {
  console.log([
    "Usage: node scripts/update_tenant_handoff_state.mjs --bundle <file> [options]",
    "",
    "Required:",
    "  --bundle <file>       Bundle metadata JSON (bundle.json)",
    "",
    "Options:",
    "  --request <file>      Provisioning request JSON to fold into the state",
    "  --verify <file>       Verification summary JSON to fold into the state",
    "  --state-in <file>     Existing handoff state JSON to update",
    "  --output <file>       Output path (default: <bundle-dir>/handoff-state.json)",
    "  --help                Show this help message",
    "",
    "The script emits a consolidated handoff state/evidence JSON and writes it to --output.",
  ].join("\n"));
}

function parseArgs(argv) {
  const options = {};
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

    options[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
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

function parseJsonMaybe(text, sourcePath) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function readJsonFile(filePath) {
  const resolvedPath = resolve(filePath);
  const raw = await readFile(resolvedPath, "utf8");
  const parsed = parseJsonMaybe(raw, resolvedPath);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`JSON file must contain an object: ${resolvedPath}`);
  }
  return { path: resolvedPath, raw, json: parsed };
}

function pickVerifiedState(stateIn, request, verify) {
  if (verify?.json?.ok === true) {
    return "verified";
  }
  if (request) {
    return request.json.status === "draft" ? "ready_for_submission" : "submitted";
  }
  if (stateIn?.json?.handoff_state?.status) {
    return stateIn.json.handoff_state.status;
  }
  return "draft";
}

function summarizeBundle(bundle) {
  return {
    tenant_id: bundle.json.tenant_id ?? null,
    deploy_env: bundle.json.deploy_env ?? null,
    created_at: bundle.json.created_at ?? null,
    base_url: bundle.json.base_url ?? null,
    output_dir: bundle.json.output_dir ?? dirname(bundle.path),
    files: bundle.json.files ?? null,
    verification_artifacts: bundle.json.verification_artifacts ?? null,
    suggested_commands: bundle.json.suggested_commands ?? null,
  };
}

function summarizeRequest(request) {
  return {
    path: request.path,
    sha256: sha256(request.raw),
    request_type: request.json.request_type ?? null,
    status: request.json.status ?? null,
    external_handoff: request.json.external_handoff ?? null,
    completion_criteria: request.json.completion_criteria ?? null,
    actions: Array.isArray(request.json.actions)
      ? request.json.actions.map((action) => ({
          action_id: action?.action_id ?? null,
          type: action?.type ?? null,
          required: action?.required ?? null,
          mode: action?.mode ?? null,
          evidence_path: action?.evidence_path ?? null,
        }))
      : null,
  };
}

function summarizeVerify(verify) {
  return {
    path: verify.path,
    sha256: sha256(verify.raw),
    ok: verify.json.ok === true,
    mode: verify.json.mode ?? null,
    run_id: verify.json.run_id ?? null,
    trace_id: verify.json.trace_id ?? null,
    duration_ms: verify.json.duration_ms ?? null,
    check_count: verify.json.check_count ?? null,
    verification_output_path: verify.json.verification_output_path ?? null,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    return;
  }

  const bundle = await readJsonFile(requireString(args.bundle, "--bundle"));
  const request = normalizeOptionalString(args.request) ? await readJsonFile(args.request) : null;
  const verify = normalizeOptionalString(args.verify) ? await readJsonFile(args.verify) : null;
  const stateIn = normalizeOptionalString(args.stateIn) ? await readJsonFile(args.stateIn) : null;

  const outputPath = resolve(
    normalizeOptionalString(args.output) ?? join(dirname(bundle.path), "handoff-state.json"),
  );

  const existingState = stateIn?.json ?? {};
  const handoffState = {
    status: pickVerifiedState(stateIn, request, verify),
    updated_at: new Date().toISOString(),
    updated_from: {
      bundle: bundle.path,
      request: request?.path ?? null,
      verify: verify?.path ?? null,
      state_in: stateIn?.path ?? null,
    },
  };

  const requestSummary = request ? summarizeRequest(request) : null;
  const verifySummary = verify ? summarizeVerify(verify) : null;
  const bundleSummary = summarizeBundle(bundle);

  const nextActions = [];
  if (handoffState.status === "draft") {
    nextActions.push("submit provisioning request");
  }
  if (request && handoffState.status === "ready_for_submission") {
    nextActions.push("apply bundle changes");
  }
  if (request && !verify) {
    nextActions.push("run verification after request submission");
  }
  if (verify && verify.json.ok !== true) {
    nextActions.push("resolve verification failures and re-run");
  }

  const output = {
    ok: true,
    schema_version: "2026-04-01",
    generated_at: new Date().toISOString(),
    handoff_state: {
      ...handoffState,
      previous_status: existingState?.handoff_state?.status ?? null,
    },
    bundle: bundleSummary,
    request: requestSummary,
    verify: verifySummary,
    evidence: {
      bundle_path: bundle.path,
      bundle_sha256: sha256(bundle.raw),
      request_path: request?.path ?? null,
      request_sha256: request ? sha256(request.raw) : null,
      verify_path: verify?.path ?? null,
      verify_sha256: verify ? sha256(verify.raw) : null,
      state_in_path: stateIn?.path ?? null,
      state_in_sha256: stateIn ? sha256(stateIn.raw) : null,
    },
    next_actions: nextActions,
    previous_state: stateIn?.json ?? null,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
