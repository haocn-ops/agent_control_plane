CREATE TABLE IF NOT EXISTS policies (
  policy_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  tool_provider_id TEXT,
  tool_name TEXT,
  decision TEXT NOT NULL,
  approver_roles_json TEXT NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  conditions_json TEXT NOT NULL DEFAULT '{}',
  approval_config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_policies_tenant_channel_status_priority
  ON policies (tenant_id, channel, status, priority DESC);

CREATE INDEX IF NOT EXISTS idx_policies_scope
  ON policies (tenant_id, channel, tool_provider_id, tool_name, status);
