CREATE TABLE IF NOT EXISTS workspace_enterprise_feature_configs (
  config_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'configured',
  config_json TEXT NOT NULL DEFAULT '{}',
  configured_by_user_id TEXT,
  configured_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_enterprise_feature_configs_workspace_feature
  ON workspace_enterprise_feature_configs (workspace_id, feature_key);

CREATE INDEX IF NOT EXISTS idx_workspace_enterprise_feature_configs_org_feature_status
  ON workspace_enterprise_feature_configs (organization_id, feature_key, status, updated_at DESC);
