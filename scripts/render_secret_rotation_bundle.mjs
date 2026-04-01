import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function normalizeOptionalString(rawValue) {
  if (typeof rawValue !== "string") {
    return null;
  }
  const trimmed = rawValue.trim();
  return trimmed === "" ? null : trimmed;
}

function requireStringField(value, fieldPath) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required field: ${fieldPath}`);
  }
  return value.trim();
}

function uniqueNonEmpty(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value !== ""))];
}

function extractEnvAssignment(command, envName) {
  if (typeof command !== "string" || command.trim() === "") {
    return null;
  }

  const patterns = [
    new RegExp(`${envName}="([^"]+)"`),
    new RegExp(`${envName}='([^']+)'`),
    new RegExp(`${envName}=([^\\s]+)`),
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match !== null) {
      return match[1];
    }
  }

  return null;
}

function normalizeProviderUpdate(candidate, index) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error(`provider_updates[${index}] must be an object`);
  }

  const providerId = requireStringField(candidate.tool_provider_id, `provider_updates[${index}].tool_provider_id`);
  const providerType = requireStringField(candidate.provider_type, `provider_updates[${index}].provider_type`);
  const currentAuthRef = requireStringField(candidate.current_auth_ref, `provider_updates[${index}].current_auth_ref`);
  const nextAuthRef = requireStringField(candidate.next_auth_ref, `provider_updates[${index}].next_auth_ref`);
  const secretBindingName = requireStringField(candidate.secret_binding_name, `provider_updates[${index}].secret_binding_name`);
  const cutoverVerifyCommand = requireStringField(
    candidate.cutover_verify_command,
    `provider_updates[${index}].cutover_verify_command`,
  );
  const rollbackVerifyCommand = normalizeOptionalString(candidate.rollback_verify_command) ?? cutoverVerifyCommand;

  return {
    tool_provider_id: providerId,
    provider_type: providerType,
    current_auth_ref: currentAuthRef,
    next_auth_ref: nextAuthRef,
    secret_binding_name: secretBindingName,
    cutover_verify_command: cutoverVerifyCommand,
    rollback_verify_command: rollbackVerifyCommand,
  };
}

function normalizePlan(plan, sourcePath) {
  if (plan === null || typeof plan !== "object" || Array.isArray(plan)) {
    throw new Error(`Rotation plan ${sourcePath} must be a JSON object`);
  }

  const tenantId = requireStringField(plan.tenant_id, "tenant_id");
  const deployEnv = requireStringField(plan.deploy_env, "deploy_env");
  const owner = requireStringField(plan.owner, "owner");
  const rotationWindow = requireStringField(plan.rotation_window, "rotation_window");
  const changeRef = normalizeOptionalString(plan.change_ref);
  const notes = typeof plan.notes === "string" ? plan.notes.trim() : "";

  if (!Array.isArray(plan.provider_updates) || plan.provider_updates.length === 0) {
    throw new Error("rotation plan must include at least one provider update");
  }

  if (!Array.isArray(plan.secret_commands) || plan.secret_commands.length === 0) {
    throw new Error("rotation plan must include at least one secret command");
  }

  const providerUpdates = plan.provider_updates.map((candidate, index) => normalizeProviderUpdate(candidate, index));

  const rollback = plan.rollback;
  if (rollback === null || typeof rollback !== "object" || Array.isArray(rollback)) {
    throw new Error("rotation plan rollback must be an object");
  }

  if (!Array.isArray(rollback.revert_auth_refs) || rollback.revert_auth_refs.length === 0) {
    throw new Error("rotation plan rollback.revert_auth_refs must contain at least one auth_ref");
  }

  return {
    tenant_id: tenantId,
    deploy_env: deployEnv,
    rotation_window: rotationWindow,
    owner,
    change_ref: changeRef,
    notes,
    provider_updates: providerUpdates,
    secret_commands: plan.secret_commands.map((value, index) =>
      requireStringField(value, `secret_commands[${index}]`),
    ),
    rollback: {
      revert_auth_refs: rollback.revert_auth_refs.map((value, index) =>
        requireStringField(value, `rollback.revert_auth_refs[${index}]`),
      ),
      rollback_verify_command: normalizeOptionalString(rollback.rollback_verify_command),
      delete_new_secret_after_revert: rollback.delete_new_secret_after_revert === true,
    },
  };
}

function buildArtifacts(targetDir) {
  const relativeArtifacts = {
    plan: "rotation-plan.json",
    checklist: "rotation-checklist.md",
    manifest: "rotation-manifest.json",
    script: "rotate.sh",
    evidenceDir: "evidence",
    previewEvidence: "evidence/preview.json",
    cutoverEvidence: "evidence/cutover.json",
    rollbackEvidence: "evidence/rollback.json",
  };

  return Object.fromEntries(
    Object.entries(relativeArtifacts).map(([name, relativePath]) => [
      name,
      {
        relative: relativePath,
        absolute: join(targetDir, relativePath),
      },
    ]),
  );
}

function buildPhaseMetadata(plan) {
  const cutoverVerifyOutputPaths = uniqueNonEmpty(
    plan.provider_updates.map((provider) => extractEnvAssignment(provider.cutover_verify_command, "VERIFY_OUTPUT_PATH")),
  );

  const rollbackVerifyCommand = plan.rollback.rollback_verify_command;
  const rollbackProviderFallbackOutputPaths = plan.provider_updates
    .filter(
      (provider) =>
        rollbackVerifyCommand === null ||
        (provider.rollback_verify_command !== provider.cutover_verify_command &&
          provider.rollback_verify_command !== rollbackVerifyCommand),
    )
    .map((provider) => extractEnvAssignment(provider.rollback_verify_command, "VERIFY_OUTPUT_PATH"));
  const rollbackVerifyOutputPaths = uniqueNonEmpty([
    extractEnvAssignment(rollbackVerifyCommand, "VERIFY_OUTPUT_PATH"),
    ...rollbackProviderFallbackOutputPaths,
  ]);

  return {
    cutover_verify_output_paths: cutoverVerifyOutputPaths,
    rollback_verify_command: rollbackVerifyCommand,
    rollback_verify_output_paths: rollbackVerifyOutputPaths,
  };
}

function buildProviderEvidenceEntries(plan) {
  return plan.provider_updates.map((provider) => ({
    tool_provider_id: provider.tool_provider_id,
    provider_type: provider.provider_type,
    current_auth_ref: provider.current_auth_ref,
    next_auth_ref: provider.next_auth_ref,
    secret_binding_name: provider.secret_binding_name,
    cutover_verify_command: provider.cutover_verify_command,
    expected_cutover_verify_output_path: extractEnvAssignment(provider.cutover_verify_command, "VERIFY_OUTPUT_PATH"),
    rollback_verify_command: provider.rollback_verify_command,
    expected_rollback_verify_output_path: extractEnvAssignment(provider.rollback_verify_command, "VERIFY_OUTPUT_PATH"),
  }));
}

function buildEvidenceTemplate(plan, phase, artifacts, phaseMetadata) {
  const baseTemplate = {
    schema_version: 1,
    phase,
    tenant_id: plan.tenant_id,
    deploy_env: plan.deploy_env,
    owner: plan.owner,
    change_ref: plan.change_ref,
    rotation_window: plan.rotation_window,
    notes: plan.notes || null,
    manifest_path: artifacts.manifest.relative,
    checklist_path: artifacts.checklist.relative,
    rotate_script_path: artifacts.script.relative,
  };

  if (phase === "preview") {
    return {
      ...baseTemplate,
      status: "planned",
      reviewed_by: null,
      reviewed_at: null,
      signoff_notes: null,
      secret_commands: plan.secret_commands,
      provider_updates: buildProviderEvidenceEntries(plan),
      expected_artifacts: {
        plan: artifacts.plan.relative,
        checklist: artifacts.checklist.relative,
        manifest: artifacts.manifest.relative,
        preview_evidence: artifacts.previewEvidence.relative,
        cutover_evidence: artifacts.cutoverEvidence.relative,
        rollback_evidence: artifacts.rollbackEvidence.relative,
      },
    };
  }

  if (phase === "cutover") {
    return {
      ...baseTemplate,
      status: "pending",
      executed_by: null,
      started_at: null,
      completed_at: null,
      summary: null,
      expected_verify_output_paths: phaseMetadata.cutover_verify_output_paths,
      secret_commands: plan.secret_commands.map((command) => ({
        command,
        completed_at: null,
      })),
      provider_updates: buildProviderEvidenceEntries(plan).map((provider) => ({
        ...provider,
        auth_ref_switched_at: null,
        verification_completed_at: null,
        verification_status: "pending",
      })),
    };
  }

  return {
    ...baseTemplate,
    status: "not_needed",
    triggered_by: null,
    started_at: null,
    completed_at: null,
    summary: null,
    revert_auth_refs: plan.rollback.revert_auth_refs.map((authRef) => ({
      auth_ref: authRef,
      reverted_at: null,
    })),
    rollback_verify_command: phaseMetadata.rollback_verify_command,
    provider_fallback_verify_commands: buildProviderEvidenceEntries(plan).map((provider) => ({
      tool_provider_id: provider.tool_provider_id,
      rollback_verify_command: provider.rollback_verify_command,
      expected_rollback_verify_output_path: provider.expected_rollback_verify_output_path,
    })),
    expected_verify_output_paths: phaseMetadata.rollback_verify_output_paths,
    delete_new_secret_after_revert: plan.rollback.delete_new_secret_after_revert,
    secret_cleanup_completed_at: null,
  };
}

function buildManifest(plan, artifacts, phaseMetadata, generatedAt) {
  return {
    schema_version: 1,
    generated_at: generatedAt,
    tenant_id: plan.tenant_id,
    deploy_env: plan.deploy_env,
    owner: plan.owner,
    change_ref: plan.change_ref,
    rotation_window: plan.rotation_window,
    notes: plan.notes || null,
    files: {
      plan: artifacts.plan.relative,
      checklist: artifacts.checklist.relative,
      manifest: artifacts.manifest.relative,
      script: artifacts.script.relative,
      preview_evidence: artifacts.previewEvidence.relative,
      cutover_evidence: artifacts.cutoverEvidence.relative,
      rollback_evidence: artifacts.rollbackEvidence.relative,
    },
    phases: {
      preview: {
        script_mode: "preview",
        evidence_file: artifacts.previewEvidence.relative,
        goals: [
          "Confirm change_ref, owner, and rotation window.",
          "Confirm every secret command maps to a provider update.",
          "Confirm every verify command has a writable VERIFY_OUTPUT_PATH if remote evidence is expected.",
        ],
      },
      cutover: {
        script_mode: "cutover",
        evidence_file: artifacts.cutoverEvidence.relative,
        secret_commands: plan.secret_commands,
        expected_verify_output_paths: phaseMetadata.cutover_verify_output_paths,
        provider_updates: buildProviderEvidenceEntries(plan),
      },
      rollback: {
        script_mode: "rollback",
        evidence_file: artifacts.rollbackEvidence.relative,
        revert_auth_refs: plan.rollback.revert_auth_refs,
        rollback_verify_command: phaseMetadata.rollback_verify_command,
        provider_fallback_verify_commands: buildProviderEvidenceEntries(plan).map((provider) => ({
          tool_provider_id: provider.tool_provider_id,
          rollback_verify_command: provider.rollback_verify_command,
          expected_rollback_verify_output_path: provider.expected_rollback_verify_output_path,
        })),
        expected_verify_output_paths: phaseMetadata.rollback_verify_output_paths,
        delete_new_secret_after_revert: plan.rollback.delete_new_secret_after_revert,
      },
    },
  };
}

function renderChecklist(plan, artifacts, phaseMetadata) {
  const providerSections = plan.provider_updates
    .map((provider) => {
      return [
        `### ${provider.tool_provider_id}`,
        `- Provider type: \`${provider.provider_type}\``,
        `- Current auth_ref: \`${provider.current_auth_ref}\``,
        `- Next auth_ref: \`${provider.next_auth_ref}\``,
        `- New secret binding: \`${provider.secret_binding_name}\``,
        `- Expected cutover verify output: \`${extractEnvAssignment(provider.cutover_verify_command, "VERIFY_OUTPUT_PATH") ?? "not set"}\``,
        `- Expected rollback verify output: \`${extractEnvAssignment(provider.rollback_verify_command, "VERIFY_OUTPUT_PATH") ?? "not set"}\``,
        "",
        "#### Step sequence",
        "1. Create the new Worker secret binding.",
        "2. Update the provider auth_ref to the next binding.",
        "3. Run verification immediately after cutover and capture evidence.",
        "4. Observe for the configured rotation window.",
        "5. Delete the old secret only after the window is stable.",
        "",
        "#### Commands",
        "```bash",
        `wrangler secret put ${provider.secret_binding_name} --env ${plan.deploy_env}`,
        provider.cutover_verify_command,
        provider.rollback_verify_command,
        "```",
      ].join("\n");
    })
    .join("\n\n");

  const rollbackVerifyCommand = phaseMetadata.rollback_verify_command ?? "Use the rollback verify command recorded inside each provider update.";

  return `# Secret Rotation Checklist

Tenant: \`${plan.tenant_id}\`
Deploy env: \`${plan.deploy_env}\`
Owner: \`${plan.owner}\`
Change ref: \`${plan.change_ref ?? "not set"}\`
Rotation window: \`${plan.rotation_window}\`

## Notes

${plan.notes ? `- ${plan.notes}` : "- No extra notes provided."}

## Generated Artifacts

- \`${artifacts.plan.relative}\`
- \`${artifacts.checklist.relative}\`
- \`${artifacts.manifest.relative}\`
- \`${artifacts.script.relative}\`
- \`${artifacts.previewEvidence.relative}\`
- \`${artifacts.cutoverEvidence.relative}\`
- \`${artifacts.rollbackEvidence.relative}\`

## Preview Evidence

- Review \`${artifacts.manifest.relative}\` before the maintenance window.
- Update \`${artifacts.previewEvidence.relative}\` with reviewer, signoff time, and notes.
- Confirm every verify command writes to the expected output path before cutover starts.

## Secret Commands

${plan.secret_commands.map((command) => `- \`${command}\``).join("\n")}

## Provider Updates

${providerSections}

## Rollback

1. Revert each \`auth_ref\` to its previous value.
2. Re-run the rollback verification command or the provider-specific fallback.
3. Update \`${artifacts.rollbackEvidence.relative}\` with trigger time, operator, and verification evidence.
4. ${plan.rollback.delete_new_secret_after_revert ? "Delete the new binding only after rollback verification is stable." : "Keep the new binding until rollback is confirmed stable."}

### Revert auth_refs

${plan.rollback.revert_auth_refs.map((authRef) => `- \`${authRef}\``).join("\n")}

### Rollback verify command

\`\`\`bash
${rollbackVerifyCommand}
\`\`\`

## Operator Checklist

- [ ] Preview evidence recorded in \`${artifacts.previewEvidence.relative}\`
- [ ] New secret bindings created
- [ ] Provider auth_ref values updated
- [ ] Cutover verification passed and recorded in \`${artifacts.cutoverEvidence.relative}\`
- [ ] Observation window complete
- [ ] Rollback evidence updated or marked not needed in \`${artifacts.rollbackEvidence.relative}\`
`;
}

function renderShellScript(plan, artifacts, phaseMetadata) {
  const secretCommandsBlock = plan.secret_commands
    .map((command) => `    printf '%s\\n' ${JSON.stringify(command)} | sed 's/^/  - /'`)
    .join("\n");

  const providerCutoverBlock = plan.provider_updates
    .map((provider, index) => {
      return [
        `    echo "Provider ${index + 1}/${plan.provider_updates.length}: ${provider.tool_provider_id}"`,
        `    echo "  Current auth_ref: ${provider.current_auth_ref}"`,
        `    echo "  Next auth_ref: ${provider.next_auth_ref}"`,
        `    echo "  New secret binding: ${provider.secret_binding_name}"`,
        `    printf '%s\\n' ${JSON.stringify(provider.cutover_verify_command)} | sed 's/^/  Cutover verify: /'`,
        "",
      ].join("\n");
    })
    .join("\n");

  const rollbackAuthRefBlock = plan.rollback.revert_auth_refs
    .map((authRef) => `    printf '%s\\n' ${JSON.stringify(authRef)} | sed 's/^/  - /'`)
    .join("\n");

  const rollbackVerifyLines =
    phaseMetadata.rollback_verify_command === null
      ? `    echo "  No global rollback verify command was provided."
    echo "  Provider fallback commands:"
${plan.provider_updates
  .map(
    (provider) =>
      `    printf '%s\\n' ${JSON.stringify(`${provider.tool_provider_id}: ${provider.rollback_verify_command}`)} | sed 's/^/    - /'`,
  )
  .join("\n")}`
      : `    printf '%s\\n' ${JSON.stringify(phaseMetadata.rollback_verify_command)} | sed 's/^/  Verify: /'`;

  return `#!/usr/bin/env bash
set -euo pipefail

MODE="\${1:-preview}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
MANIFEST_PATH="$SCRIPT_DIR/${artifacts.manifest.relative}"
PREVIEW_EVIDENCE_PATH="$SCRIPT_DIR/${artifacts.previewEvidence.relative}"
CUTOVER_EVIDENCE_PATH="$SCRIPT_DIR/${artifacts.cutoverEvidence.relative}"
ROLLBACK_EVIDENCE_PATH="$SCRIPT_DIR/${artifacts.rollbackEvidence.relative}"

print_usage() {
  echo "Usage: $0 [preview|cutover|rollback]" >&2
}

case "$MODE" in
  preview)
    echo "Secret rotation preview"
    echo ""
    echo "Manifest: $MANIFEST_PATH"
    echo "Evidence template: $PREVIEW_EVIDENCE_PATH"
    echo ""
    echo "Review goals:"
    echo "  1. Confirm change_ref, owner, and rotation window."
    echo "  2. Confirm every secret command maps to a provider update."
    echo "  3. Confirm every verify command writes to the expected output path."
    echo ""
    echo "Secret commands:"
${secretCommandsBlock}
    echo ""
    echo "Provider cutover map:"
${providerCutoverBlock}
    echo "Update preview evidence after human signoff."
    ;;
  cutover)
    echo "Secret rotation cutover"
    echo ""
    echo "Manifest: $MANIFEST_PATH"
    echo "Evidence template: $CUTOVER_EVIDENCE_PATH"
    echo ""
    echo "1. Create the new secret bindings:"
${secretCommandsBlock}
    echo ""
    echo "2. Update provider auth_ref values and verify immediately:"
${providerCutoverBlock}
    echo "3. Record operator, timestamps, and verify outputs in $CUTOVER_EVIDENCE_PATH"
    ;;
  rollback)
    echo "Secret rotation rollback"
    echo ""
    echo "Manifest: $MANIFEST_PATH"
    echo "Evidence template: $ROLLBACK_EVIDENCE_PATH"
    echo ""
    echo "1. Revert auth_ref values:"
${rollbackAuthRefBlock}
    echo ""
    echo "2. Re-run rollback verification:"
${rollbackVerifyLines}
    echo ""
    echo "3. ${plan.rollback.delete_new_secret_after_revert ? "Delete the new secret bindings after rollback verification is stable." : "Keep the new secret bindings until rollback is confirmed stable."}"
    echo "4. Record trigger time, operator, and verify evidence in $ROLLBACK_EVIDENCE_PATH"
    ;;
  *)
    print_usage
    exit 1
    ;;
esac
`;
}

async function main() {
  const planPath = resolve(readArg("--plan") ?? "docs/secret_rotation_plan.example.json");
  const outputDir = resolve(readArg("--output-dir") ?? ".secret-rotation");
  const requestedTenantId = normalizeOptionalString(readArg("--tenant-id"));
  const generatedAt = new Date().toISOString();

  const rawPlan = JSON.parse(await readFile(planPath, "utf8"));
  const plan = normalizePlan(rawPlan, planPath);
  if (requestedTenantId !== null && requestedTenantId !== plan.tenant_id) {
    throw new Error(`Rotation plan tenant_id (${plan.tenant_id}) does not match --tenant-id (${requestedTenantId})`);
  }

  const targetDir = resolve(outputDir, plan.tenant_id);
  const artifacts = buildArtifacts(targetDir);
  const phaseMetadata = buildPhaseMetadata(plan);
  const manifest = buildManifest(plan, artifacts, phaseMetadata, generatedAt);

  await Promise.all([
    mkdir(targetDir, { recursive: true }),
    mkdir(artifacts.evidenceDir.absolute, { recursive: true }),
  ]);

  await Promise.all([
    writeFile(artifacts.plan.absolute, `${JSON.stringify(plan, null, 2)}\n`, "utf8"),
    writeFile(artifacts.checklist.absolute, `${renderChecklist(plan, artifacts, phaseMetadata)}\n`, "utf8"),
    writeFile(artifacts.manifest.absolute, `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    writeFile(artifacts.script.absolute, renderShellScript(plan, artifacts, phaseMetadata), "utf8"),
    writeFile(
      artifacts.previewEvidence.absolute,
      `${JSON.stringify(buildEvidenceTemplate(plan, "preview", artifacts, phaseMetadata), null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      artifacts.cutoverEvidence.absolute,
      `${JSON.stringify(buildEvidenceTemplate(plan, "cutover", artifacts, phaseMetadata), null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      artifacts.rollbackEvidence.absolute,
      `${JSON.stringify(buildEvidenceTemplate(plan, "rollback", artifacts, phaseMetadata), null, 2)}\n`,
      "utf8",
    ),
  ]);

  await chmod(artifacts.script.absolute, 0o755);

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        tenant_id: plan.tenant_id,
        deploy_env: plan.deploy_env,
        output_dir: targetDir,
        files: {
          rotation_plan: artifacts.plan.absolute,
          rotation_checklist: artifacts.checklist.absolute,
          rotation_manifest: artifacts.manifest.absolute,
          rotate_script: artifacts.script.absolute,
          preview_evidence: artifacts.previewEvidence.absolute,
          cutover_evidence: artifacts.cutoverEvidence.absolute,
          rollback_evidence: artifacts.rollbackEvidence.absolute,
        },
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
