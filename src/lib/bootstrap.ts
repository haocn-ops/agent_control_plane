import { nowIso } from "./ids.js";

export interface SeedToolProvider {
  tool_provider_id: string;
  tenant_id: string;
  name: string;
  provider_type: string;
  endpoint_url: string;
  auth_ref: string | null;
  visibility_policy_ref: string | null;
  execution_policy_ref: string | null;
  status: string;
}

export interface SeedPolicy {
  policy_id: string;
  tenant_id: string;
  channel: string;
  tool_provider_id: string | null;
  tool_name: string | null;
  decision: "allow" | "deny" | "approval_required";
  approver_roles_json: string;
  priority: number;
  status: "active" | "disabled";
  conditions_json: string;
  approval_config_json: string;
}

export function buildDefaultToolProviders(tenantId: string): SeedToolProvider[] {
  return [
    {
      tool_provider_id: "tp_email",
      tenant_id: tenantId,
      name: "Email Gateway",
      provider_type: "mcp_server",
      endpoint_url: "mock://email",
      auth_ref: null,
      visibility_policy_ref: null,
      execution_policy_ref: null,
      status: "active",
    },
    {
      tool_provider_id: "tp_data",
      tenant_id: tenantId,
      name: "ERP Reader",
      provider_type: "mcp_server",
      endpoint_url: "mock://erp",
      auth_ref: null,
      visibility_policy_ref: null,
      execution_policy_ref: null,
      status: "active",
    },
  ];
}

export function buildDefaultPolicies(tenantId: string): SeedPolicy[] {
  return [
    {
      policy_id: "pol_mcp_email_external_approval_v1",
      tenant_id: tenantId,
      channel: "mcp_tool_call",
      tool_provider_id: "tp_email",
      tool_name: "send_email",
      decision: "approval_required",
      approver_roles_json: JSON.stringify(["legal_approver"]),
      priority: 100,
      status: "active",
      conditions_json: JSON.stringify({
        target_classification: "external",
        risk_level: "high",
      }),
      approval_config_json: JSON.stringify({
        approver_roles: ["legal_approver"],
        timeout_seconds: 86400,
      }),
    },
    {
      policy_id: "pol_mcp_data_read_approval_v1",
      tenant_id: tenantId,
      channel: "mcp_tool_call",
      tool_provider_id: "tp_data",
      tool_name: "read_erp",
      decision: "approval_required",
      approver_roles_json: JSON.stringify(["ops_approver"]),
      priority: 90,
      status: "active",
      conditions_json: JSON.stringify({
        risk_level: "low",
      }),
      approval_config_json: JSON.stringify({
        approver_roles: ["ops_approver"],
        timeout_seconds: 43200,
      }),
    },
    {
      policy_id: "pol_mcp_data_delete_deny_v1",
      tenant_id: tenantId,
      channel: "mcp_tool_call",
      tool_provider_id: "tp_data",
      tool_name: "delete_record",
      decision: "deny",
      approver_roles_json: JSON.stringify([]),
      priority: 100,
      status: "active",
      conditions_json: JSON.stringify({}),
      approval_config_json: JSON.stringify({}),
    },
  ];
}

export async function seedDefaultCatalog(
  db: D1Database,
  tenantId: string,
  createdAt = nowIso(),
): Promise<void> {
  const toolProviderStatements = buildDefaultToolProviders(tenantId).map((provider) =>
    db
      .prepare(
        `INSERT INTO tool_providers (
            tool_provider_id, tenant_id, name, provider_type, endpoint_url, auth_ref,
            visibility_policy_ref, execution_policy_ref, status, created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)
          ON CONFLICT(tool_provider_id) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            name = excluded.name,
            provider_type = excluded.provider_type,
            endpoint_url = excluded.endpoint_url,
            auth_ref = excluded.auth_ref,
            visibility_policy_ref = excluded.visibility_policy_ref,
            execution_policy_ref = excluded.execution_policy_ref,
            status = excluded.status,
            updated_at = excluded.updated_at`,
      )
      .bind(
        provider.tool_provider_id,
        provider.tenant_id,
        provider.name,
        provider.provider_type,
        provider.endpoint_url,
        provider.auth_ref,
        provider.visibility_policy_ref,
        provider.execution_policy_ref,
        provider.status,
        createdAt,
      ),
  );

  const policyStatements = buildDefaultPolicies(tenantId).map((policy) =>
    db
      .prepare(
        `INSERT INTO policies (
            policy_id, tenant_id, channel, tool_provider_id, tool_name, decision, approver_roles_json,
            priority, status, conditions_json, approval_config_json, created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)
          ON CONFLICT(policy_id) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            channel = excluded.channel,
            tool_provider_id = excluded.tool_provider_id,
            tool_name = excluded.tool_name,
            decision = excluded.decision,
            approver_roles_json = excluded.approver_roles_json,
            priority = excluded.priority,
            status = excluded.status,
            conditions_json = excluded.conditions_json,
            approval_config_json = excluded.approval_config_json,
            updated_at = excluded.updated_at`,
      )
      .bind(
        policy.policy_id,
        policy.tenant_id,
        policy.channel,
        policy.tool_provider_id,
        policy.tool_name,
        policy.decision,
        policy.approver_roles_json,
        policy.priority,
        policy.status,
        policy.conditions_json,
        policy.approval_config_json,
        createdAt,
      ),
  );

  await db.batch([...toolProviderStatements, ...policyStatements]);
}

function quoteSql(value: string | number | null): string {
  if (value === null) {
    return "NULL";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return `'${value.replaceAll("'", "''")}'`;
}

export function renderDefaultSeedSql(tenantId: string, createdAt = nowIso()): string {
  const statements: string[] = ["BEGIN TRANSACTION;"];

  for (const provider of buildDefaultToolProviders(tenantId)) {
    statements.push(
      `INSERT INTO tool_providers (
  tool_provider_id, tenant_id, name, provider_type, endpoint_url, auth_ref,
  visibility_policy_ref, execution_policy_ref, status, created_at, updated_at
) VALUES (
  ${quoteSql(provider.tool_provider_id)},
  ${quoteSql(provider.tenant_id)},
  ${quoteSql(provider.name)},
  ${quoteSql(provider.provider_type)},
  ${quoteSql(provider.endpoint_url)},
  ${quoteSql(provider.auth_ref)},
  ${quoteSql(provider.visibility_policy_ref)},
  ${quoteSql(provider.execution_policy_ref)},
  ${quoteSql(provider.status)},
  ${quoteSql(createdAt)},
  ${quoteSql(createdAt)}
)
ON CONFLICT(tool_provider_id) DO UPDATE SET
  tenant_id = excluded.tenant_id,
  name = excluded.name,
  provider_type = excluded.provider_type,
  endpoint_url = excluded.endpoint_url,
  auth_ref = excluded.auth_ref,
  visibility_policy_ref = excluded.visibility_policy_ref,
  execution_policy_ref = excluded.execution_policy_ref,
  status = excluded.status,
  updated_at = excluded.updated_at;`,
    );
  }

  for (const policy of buildDefaultPolicies(tenantId)) {
    statements.push(
      `INSERT INTO policies (
  policy_id, tenant_id, channel, tool_provider_id, tool_name, decision, approver_roles_json,
  priority, status, conditions_json, approval_config_json, created_at, updated_at
) VALUES (
  ${quoteSql(policy.policy_id)},
  ${quoteSql(policy.tenant_id)},
  ${quoteSql(policy.channel)},
  ${quoteSql(policy.tool_provider_id)},
  ${quoteSql(policy.tool_name)},
  ${quoteSql(policy.decision)},
  ${quoteSql(policy.approver_roles_json)},
  ${quoteSql(policy.priority)},
  ${quoteSql(policy.status)},
  ${quoteSql(policy.conditions_json)},
  ${quoteSql(policy.approval_config_json)},
  ${quoteSql(createdAt)},
  ${quoteSql(createdAt)}
)
ON CONFLICT(policy_id) DO UPDATE SET
  tenant_id = excluded.tenant_id,
  channel = excluded.channel,
  tool_provider_id = excluded.tool_provider_id,
  tool_name = excluded.tool_name,
  decision = excluded.decision,
  approver_roles_json = excluded.approver_roles_json,
  priority = excluded.priority,
  status = excluded.status,
  conditions_json = excluded.conditions_json,
  approval_config_json = excluded.approval_config_json,
  updated_at = excluded.updated_at;`,
    );
  }

  statements.push("COMMIT;");
  return `${statements.join("\n\n")}\n`;
}
