import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  buildDefaultPolicies,
  buildDefaultToolProviders,
  renderDefaultSeedSql,
} from "./lib/seed_bundle_data.mjs";

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function normalizeDeployEnv(rawValue) {
  const value = (rawValue ?? "staging").trim().toLowerCase();
  if (value !== "staging" && value !== "production") {
    throw new Error(`Unsupported --deploy-env: ${rawValue}`);
  }
  return value;
}

function normalizeOptionalString(rawValue) {
  if (typeof rawValue !== "string") {
    return null;
  }
  const trimmed = rawValue.trim();
  return trimmed === "" ? null : trimmed;
}

function buildBundleSummary({
  tenantId,
  deployEnv,
  createdAt,
  baseUrl,
  outputDir,
  seedSqlPath,
  metadataPath,
  handoffPath,
  verifyWriteSummaryPath,
  verifyReadonlySummaryPath,
}) {
  const providers = buildDefaultToolProviders(tenantId);
  const policies = buildDefaultPolicies(tenantId);
  const d1DatabaseName = deployEnv === "production" ? "agent-control-plane" : "agent-control-plane-staging";
  const wranglerEnvSuffix = deployEnv === "production" ? "" : " --env staging";
  const writeVerifyCommand = `BASE_URL="${baseUrl}" TENANT_ID="${tenantId}" VERIFY_OUTPUT_PATH="${verifyWriteSummaryPath}" npm run post-deploy:verify`;
  const readonlyVerifyCommand = `BASE_URL="${baseUrl}" TENANT_ID="${tenantId}" RUN_ID="<existing_run_id>" VERIFY_OUTPUT_PATH="${verifyReadonlySummaryPath}" npm run post-deploy:verify:readonly`;
  const recommendedVerifyCommand = deployEnv === "production" ? readonlyVerifyCommand : writeVerifyCommand;
  const recommendedVerifySummaryPath = deployEnv === "production" ? verifyReadonlySummaryPath : verifyWriteSummaryPath;

  return {
    ok: true,
    tenant_id: tenantId,
    deploy_env: deployEnv,
    created_at: createdAt,
    output_dir: outputDir,
    files: {
      seed_sql: seedSqlPath,
      metadata_json: metadataPath,
      handoff_markdown: handoffPath,
    },
    verification_artifacts: {
      write_summary_json: verifyWriteSummaryPath,
      readonly_summary_json: verifyReadonlySummaryPath,
      recommended_summary_json: recommendedVerifySummaryPath,
    },
    provider_ids: providers.map((provider) => provider.tool_provider_id),
    policy_ids: policies.map((policy) => policy.policy_id),
    provider_defaults: providers.map((provider) => ({
      tool_provider_id: provider.tool_provider_id,
      endpoint_url: provider.endpoint_url,
      auth_ref: provider.auth_ref,
      status: provider.status,
    })),
    policy_defaults: policies.map((policy) => ({
      policy_id: policy.policy_id,
      decision: policy.decision,
      tool_provider_id: policy.tool_provider_id,
      tool_name: policy.tool_name,
      status: policy.status,
    })),
    suggested_commands: {
      seed_import: `wrangler d1 execute ${d1DatabaseName} --remote --file ${seedSqlPath}${wranglerEnvSuffix}`,
      provider_list: `curl "${baseUrl}/api/v1/tool-providers" -H "X-Tenant-Id: ${tenantId}"`,
      policy_list: `curl "${baseUrl}/api/v1/policies" -H "X-Tenant-Id: ${tenantId}"`,
      post_deploy_verify: recommendedVerifyCommand,
      post_deploy_verify_write: writeVerifyCommand,
      post_deploy_verify_readonly: readonlyVerifyCommand,
    },
    handoff_fields: [
      "tenant_id",
      "trace_id",
      "tool_provider_id",
      "policy_id",
      "secret_binding_names",
      "run_id",
      "verification_date",
      "operator",
      "verify_summary_json",
    ],
  };
}

function renderHandoffMarkdown(summary) {
  return `# Tenant Onboarding Bundle

Tenant: \`${summary.tenant_id}\`
Deploy env: \`${summary.deploy_env}\`
Created at: \`${summary.created_at}\`

## Files

- Seed SQL: \`${summary.files.seed_sql}\`
- Metadata JSON: \`${summary.files.metadata_json}\`
- Handoff markdown: \`${summary.files.handoff_markdown}\`
- Recommended verify summary JSON: \`${summary.verification_artifacts.recommended_summary_json}\`

## Default Providers

${summary.provider_defaults
  .map(
    (provider) =>
      `- \`${provider.tool_provider_id}\`: endpoint=\`${provider.endpoint_url}\`, auth_ref=${provider.auth_ref ?? "null"}, status=\`${provider.status}\``,
  )
  .join("\n")}

## Default Policies

${summary.policy_defaults
  .map(
    (policy) =>
      `- \`${policy.policy_id}\`: decision=\`${policy.decision}\`, tool_provider_id=${policy.tool_provider_id ?? "null"}, tool_name=${policy.tool_name ?? "null"}, status=\`${policy.status}\``,
  )
  .join("\n")}

## Suggested Commands

~~~bash
${summary.suggested_commands.seed_import}
${summary.suggested_commands.provider_list}
${summary.suggested_commands.policy_list}
# Recommended post-deploy verification
${summary.suggested_commands.post_deploy_verify}
~~~

## Handoff Fields

${summary.handoff_fields.map((field) => `- \`${field}\``).join("\n")}

## Notes

- Baseline seed 只提供 MVP 啟動資料，匯入後仍需校正真實 \`endpoint_url\` 與 \`auth_ref\`。
- 建議把驗收輸出的 JSON summary 一起保存在 bundle 目錄，作為交接證據的一部分。
- 若是 production，建議先完成受控小流量驗收，再用 readonly 模式保留最終交接證據。
`;
}

async function main() {
  const tenantId = normalizeOptionalString(readArg("--tenant-id"));
  if (!tenantId) {
    throw new Error("Missing required argument: --tenant-id");
  }

  const deployEnv = normalizeDeployEnv(readArg("--deploy-env"));
  const createdAt = readArg("--created-at") ?? new Date().toISOString();
  const baseUrl = readArg("--base-url") ?? "https://<your-worker-domain>";
  const outputDir = resolve(readArg("--output-dir") ?? `.onboarding-bundles/${tenantId}`);

  await mkdir(outputDir, { recursive: true });

  const seedSqlPath = join(outputDir, "seed.sql");
  const metadataPath = join(outputDir, "bundle.json");
  const handoffPath = join(outputDir, "handoff.md");
  const verifyWriteSummaryPath = join(outputDir, "verify-write-summary.json");
  const verifyReadonlySummaryPath = join(outputDir, "verify-readonly-summary.json");

  const seedSql = renderDefaultSeedSql(tenantId, createdAt);
  const summary = buildBundleSummary({
    tenantId,
    deployEnv,
    createdAt,
    baseUrl,
    outputDir,
    seedSqlPath,
    metadataPath,
    handoffPath,
    verifyWriteSummaryPath,
    verifyReadonlySummaryPath,
  });
  const handoffMarkdown = renderHandoffMarkdown(summary);

  await Promise.all([
    writeFile(seedSqlPath, seedSql, "utf8"),
    writeFile(metadataPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
    writeFile(handoffPath, handoffMarkdown, "utf8"),
  ]);

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
