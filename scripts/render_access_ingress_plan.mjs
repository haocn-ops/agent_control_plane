import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function normalizeNonEmpty(rawValue, label) {
  if (typeof rawValue !== "string") {
    throw new Error(`Missing required argument: ${label}`);
  }
  const value = rawValue.trim();
  if (value === "") {
    throw new Error(`Missing required argument: ${label}`);
  }
  return value;
}

function normalizeDeployEnv(rawValue) {
  const value = (rawValue ?? "").trim().toLowerCase();
  if (value !== "staging" && value !== "production") {
    throw new Error(`deploy_env must be staging or production`);
  }
  return value;
}

function normalizeOptionalString(rawValue) {
  if (typeof rawValue !== "string") {
    return null;
  }
  const value = rawValue.trim();
  return value === "" ? null : value;
}

function deriveReadonlyOutputPath(writeOutputPath) {
  if (!writeOutputPath) {
    return "/tmp/access-ingress-readonly-verify.json";
  }
  if (writeOutputPath.endsWith(".json")) {
    return writeOutputPath.replace(/\.json$/, "-readonly.json");
  }
  return `${writeOutputPath}-readonly`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildWriteVerifyCommand(plan) {
  return `BASE_URL="${plan.worker_url}" TENANT_ID="${plan.tenant_id}" VERIFY_OUTPUT_PATH="${plan.write_verify_output_path}" npm --prefix "${plan.repo_root}" run post-deploy:verify`;
}

function buildReadonlyVerifyCommand(plan) {
  return `BASE_URL="${plan.worker_url}" TENANT_ID="${plan.tenant_id}" RUN_ID="<existing_run_id>" VERIFY_OUTPUT_PATH="${plan.readonly_verify_output_path}" npm --prefix "${plan.repo_root}" run post-deploy:verify:readonly`;
}

function planFromTemplate(template) {
  const legacyVerifyOutputPath = normalizeOptionalString(template.verify_output_path);
  const writeVerifyOutputPath =
    normalizeOptionalString(template.write_verify_output_path) ??
    legacyVerifyOutputPath ??
    "/tmp/access-ingress-verify.json";
  const readonlyVerifyOutputPath =
    normalizeOptionalString(template.readonly_verify_output_path) ??
    deriveReadonlyOutputPath(legacyVerifyOutputPath ?? writeVerifyOutputPath);

  return {
    tenant_id: normalizeNonEmpty(template.tenant_id, "tenant_id"),
    deploy_env: normalizeDeployEnv(template.deploy_env),
    worker_url: normalizeNonEmpty(template.worker_url, "worker_url"),
    northbound_auth_mode: normalizeNonEmpty(template.northbound_auth_mode ?? "trusted_edge", "northbound_auth_mode"),
    access_application_name: normalizeNonEmpty(
      template.access_application_name ?? `${template.tenant_id}-access`,
      "access_application_name",
    ),
    service_token_name: normalizeNonEmpty(
      template.service_token_name ?? `${template.tenant_id}-service-token`,
      "service_token_name",
    ),
    trusted_subject_header: normalizeNonEmpty(
      template.trusted_subject_header ?? "X-Authenticated-Subject",
      "trusted_subject_header",
    ),
    trusted_roles_header: normalizeNonEmpty(
      template.trusted_roles_header ?? "X-Authenticated-Roles",
      "trusted_roles_header",
    ),
    access_group_names: Array.isArray(template.access_group_names)
      ? template.access_group_names.map((value) => String(value).trim()).filter((value) => value !== "")
      : [],
    service_token_audience: normalizeOptionalString(template.service_token_audience),
    repo_root: normalizeNonEmpty(normalizeOptionalString(template.repo_root) ?? resolve("."), "repo_root"),
    write_verify_output_path: normalizeNonEmpty(writeVerifyOutputPath, "write_verify_output_path"),
    readonly_verify_output_path: normalizeNonEmpty(readonlyVerifyOutputPath, "readonly_verify_output_path"),
    handoff_owner: normalizeOptionalString(template.handoff_owner),
    change_reference: normalizeOptionalString(template.change_reference),
    readonly_run_id_source: normalizeOptionalString(template.readonly_run_id_source),
    notes: normalizeOptionalString(template.notes),
  };
}

function renderChecklist(plan) {
  const writeVerifyCommand = buildWriteVerifyCommand(plan);
  const readonlyVerifyCommand = buildReadonlyVerifyCommand(plan);

  return [
    "# Access Ingress Checklist",
    "",
    `Tenant: \`${plan.tenant_id}\``,
    `Deploy env: \`${plan.deploy_env}\``,
    `Worker URL: \`${plan.worker_url}\``,
    `Northbound auth mode: \`${plan.northbound_auth_mode}\``,
    "",
    "## Access / Token Setup",
    "",
    `- [ ] Access application exists: \`${plan.access_application_name}\``,
    `- [ ] Service token exists: \`${plan.service_token_name}\``,
    `- [ ] Trusted subject header is \`${plan.trusted_subject_header}\``,
    `- [ ] Trusted roles header is \`${plan.trusted_roles_header}\``,
    "- [ ] Access groups or token scopes are aligned with tenant access",
    `- [ ] Worker is configured with \`NORTHBOUND_AUTH_MODE=${plan.northbound_auth_mode}\``,
    "",
    "## Verification",
    "",
    "```bash",
    writeVerifyCommand,
    readonlyVerifyCommand,
    "```",
    "",
    "Generated helper:",
    "",
    "```bash",
    "./access-ingress-verify.sh write",
    'RUN_ID="<existing_run_id>" ./access-ingress-verify.sh readonly',
    "```",
    "",
    "## Evidence",
    "",
    "- Store the verification summary JSON and update `access-ingress-evidence-template.json`.",
    "- Attach `access-ingress-handoff-manifest.json` to the release or handoff record.",
    "- Record the Access application name, service token name, and the latest successful `trace_id`.",
    "- If this plan is for staging, use write-mode verification first.",
    "- If this plan is for production, prefer readonly verification after the controlled write verify has completed.",
    "",
    ...(plan.notes ? ["## Notes", "", plan.notes, ""] : []),
  ].join("\n");
}

function renderPlanJson(plan) {
  return {
    ok: true,
    ...plan,
    trusted_headers: {
      subject: plan.trusted_subject_header,
      roles: plan.trusted_roles_header,
    },
    generated_artifacts: {
      checklist: "access-ingress-checklist.md",
      verify_helper: "access-ingress-verify.sh",
      evidence_template: "access-ingress-evidence-template.json",
      handoff_manifest: "access-ingress-handoff-manifest.json",
    },
    verification_commands: {
      write: buildWriteVerifyCommand(plan),
      readonly: buildReadonlyVerifyCommand(plan),
    },
  };
}

function renderVerifyHelper(plan) {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    `BASE_URL=${shellQuote(plan.worker_url)}`,
    `TENANT_ID=${shellQuote(plan.tenant_id)}`,
    `DEFAULT_REPO_ROOT=${shellQuote(plan.repo_root)}`,
    `DEFAULT_WRITE_VERIFY_OUTPUT_PATH=${shellQuote(plan.write_verify_output_path)}`,
    `DEFAULT_READONLY_VERIFY_OUTPUT_PATH=${shellQuote(plan.readonly_verify_output_path)}`,
    "",
    'MODE="${1:-write}"',
    'ARTIFACT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"',
    'REPO_ROOT="${REPO_ROOT:-$DEFAULT_REPO_ROOT}"',
    'if [ ! -f "$REPO_ROOT/package.json" ]; then',
    '  echo "package.json not found under REPO_ROOT=$REPO_ROOT; override REPO_ROOT before running this helper" >&2',
    "  exit 1",
    "fi",
    "",
    'case "$MODE" in',
    "  write)",
    '    VERIFY_OUTPUT_PATH="${VERIFY_OUTPUT_PATH:-$DEFAULT_WRITE_VERIFY_OUTPUT_PATH}"',
    '    export BASE_URL TENANT_ID VERIFY_OUTPUT_PATH',
    '    npm --prefix "$REPO_ROOT" run post-deploy:verify',
    '    echo "Update ${ARTIFACT_DIR}/access-ingress-evidence-template.json with ${VERIFY_OUTPUT_PATH}"',
    "    ;;",
    "  readonly)",
    '    RUN_ID="${RUN_ID:-}"',
    '    if [ -z "$RUN_ID" ]; then',
    '      echo "RUN_ID is required for readonly mode" >&2',
    "      exit 1",
    "    fi",
    '    VERIFY_OUTPUT_PATH="${VERIFY_OUTPUT_PATH:-$DEFAULT_READONLY_VERIFY_OUTPUT_PATH}"',
    '    export BASE_URL TENANT_ID RUN_ID VERIFY_OUTPUT_PATH',
    '    npm --prefix "$REPO_ROOT" run post-deploy:verify:readonly',
    '    echo "Update ${ARTIFACT_DIR}/access-ingress-evidence-template.json with ${VERIFY_OUTPUT_PATH}"',
    "    ;;",
    "  *)",
    '    echo "Usage: ./access-ingress-verify.sh [write|readonly]" >&2',
    "    exit 1",
    "    ;;",
    "esac",
    "",
  ].join("\n");
}

function renderEvidenceTemplate(plan) {
  return {
    ok: false,
    tenant_id: plan.tenant_id,
    deploy_env: plan.deploy_env,
    worker_url: plan.worker_url,
    handoff_owner: plan.handoff_owner,
    change_reference: plan.change_reference,
    repo_root: plan.repo_root,
    access: {
      access_application_name: plan.access_application_name,
      service_token_name: plan.service_token_name,
      service_token_audience: plan.service_token_audience,
      access_group_names: plan.access_group_names,
      trusted_subject_header: plan.trusted_subject_header,
      trusted_roles_header: plan.trusted_roles_header,
    },
    verification: {
      write: {
        summary_path: plan.write_verify_output_path,
        command: buildWriteVerifyCommand(plan),
        verified_at: null,
        verified_by: null,
        trace_id: null,
        run_id: null,
        duration_ms: null,
        check_count: null,
      },
      readonly: {
        summary_path: plan.readonly_verify_output_path,
        command: buildReadonlyVerifyCommand(plan),
        run_id_source: plan.readonly_run_id_source,
        verified_at: null,
        verified_by: null,
        trace_id: null,
        run_id: null,
        duration_ms: null,
        check_count: null,
      },
    },
    notes: plan.notes,
  };
}

function renderHandoffManifest(plan) {
  return {
    ok: true,
    tenant_id: plan.tenant_id,
    deploy_env: plan.deploy_env,
    worker_url: plan.worker_url,
    northbound_auth_mode: plan.northbound_auth_mode,
    handoff_owner: plan.handoff_owner,
    change_reference: plan.change_reference,
    repo_root: plan.repo_root,
    access: {
      access_application_name: plan.access_application_name,
      service_token_name: plan.service_token_name,
      service_token_audience: plan.service_token_audience,
      access_group_names: plan.access_group_names,
    },
    trusted_headers: {
      subject: plan.trusted_subject_header,
      roles: plan.trusted_roles_header,
    },
    artifacts: {
      plan: "access-ingress-plan.json",
      checklist: "access-ingress-checklist.md",
      verify_helper: "access-ingress-verify.sh",
      evidence_template: "access-ingress-evidence-template.json",
    },
    verification: {
      write_summary_path: plan.write_verify_output_path,
      readonly_summary_path: plan.readonly_verify_output_path,
      readonly_run_id_source: plan.readonly_run_id_source,
      commands: {
        write: buildWriteVerifyCommand(plan),
        readonly: buildReadonlyVerifyCommand(plan),
      },
    },
    required_handoff_fields: [
      "access_application_name",
      "service_token_name",
      "trusted_subject_header",
      "trusted_roles_header",
      "latest_trace_id",
      "latest_run_id",
      "verification_summary_path",
      "repo_root",
    ],
    notes: plan.notes,
  };
}

async function main() {
  const planFile = normalizeOptionalString(readArg("--plan-file"));
  const outputDir = resolve(normalizeOptionalString(readArg("--output-dir")) ?? ".access-ingress-plans");
  const tenantIdArg = normalizeOptionalString(readArg("--tenant-id"));
  const deployEnvArg = normalizeOptionalString(readArg("--deploy-env"));
  const workerUrlArg = normalizeOptionalString(readArg("--worker-url"));

  const template = planFile
    ? JSON.parse(await readFile(resolve(planFile), "utf8"))
    : {
        tenant_id: tenantIdArg,
        deploy_env: deployEnvArg,
        worker_url: workerUrlArg,
        northbound_auth_mode: normalizeOptionalString(readArg("--northbound-auth-mode")) ?? "trusted_edge",
        access_application_name: normalizeOptionalString(readArg("--access-application-name")),
        service_token_name: normalizeOptionalString(readArg("--service-token-name")),
        trusted_subject_header: normalizeOptionalString(readArg("--trusted-subject-header")),
        trusted_roles_header: normalizeOptionalString(readArg("--trusted-roles-header")),
        service_token_audience: normalizeOptionalString(readArg("--service-token-audience")),
        repo_root: normalizeOptionalString(readArg("--repo-root")),
        write_verify_output_path: normalizeOptionalString(readArg("--write-verify-output-path")),
        readonly_verify_output_path: normalizeOptionalString(readArg("--readonly-verify-output-path")),
        verify_output_path: normalizeOptionalString(readArg("--verify-output-path")),
        handoff_owner: normalizeOptionalString(readArg("--handoff-owner")),
        change_reference: normalizeOptionalString(readArg("--change-reference")),
        readonly_run_id_source: normalizeOptionalString(readArg("--readonly-run-id-source")),
        notes: normalizeOptionalString(readArg("--notes")),
      };

  const plan = planFromTemplate(template);
  await mkdir(outputDir, { recursive: true });

  const planJsonPath = join(outputDir, "access-ingress-plan.json");
  const checklistPath = join(outputDir, "access-ingress-checklist.md");
  const verifyHelperPath = join(outputDir, "access-ingress-verify.sh");
  const evidenceTemplatePath = join(outputDir, "access-ingress-evidence-template.json");
  const handoffManifestPath = join(outputDir, "access-ingress-handoff-manifest.json");
  const renderedPlan = renderPlanJson(plan);
  const renderedChecklist = renderChecklist(plan);
  const renderedVerifyHelper = renderVerifyHelper(plan);
  const renderedEvidenceTemplate = renderEvidenceTemplate(plan);
  const renderedHandoffManifest = renderHandoffManifest(plan);

  await Promise.all([
    writeFile(planJsonPath, `${JSON.stringify(renderedPlan, null, 2)}\n`, "utf8"),
    writeFile(checklistPath, renderedChecklist, "utf8"),
    writeFile(verifyHelperPath, renderedVerifyHelper, "utf8"),
    writeFile(evidenceTemplatePath, `${JSON.stringify(renderedEvidenceTemplate, null, 2)}\n`, "utf8"),
    writeFile(handoffManifestPath, `${JSON.stringify(renderedHandoffManifest, null, 2)}\n`, "utf8"),
  ]);
  await chmod(verifyHelperPath, 0o755);

  process.stdout.write(`${JSON.stringify(renderedPlan, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
