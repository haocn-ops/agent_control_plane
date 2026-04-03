CREATE TABLE IF NOT EXISTS organizations (
  organization_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug
  ON organizations (slug);

CREATE INDEX IF NOT EXISTS idx_organizations_status_created_at
  ON organizations (status, created_at DESC);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  display_name TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'passwordless',
  auth_subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_normalized
  ON users (email_normalized);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_provider_subject
  ON users (auth_provider, auth_subject);

CREATE INDEX IF NOT EXISTS idx_users_status_created_at
  ON users (status, created_at DESC);

CREATE TABLE IF NOT EXISTS organization_memberships (
  membership_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TEXT,
  invited_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_memberships_org_user
  ON organization_memberships (organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user_status
  ON organization_memberships (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_memberships_org_role_status
  ON organization_memberships (organization_id, role, status);

CREATE TABLE IF NOT EXISTS pricing_plans (
  plan_id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  yearly_price_cents INTEGER,
  limits_json TEXT NOT NULL DEFAULT '{}',
  features_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_plans_code
  ON pricing_plans (code);

CREATE INDEX IF NOT EXISTS idx_pricing_plans_status_tier
  ON pricing_plans (status, tier);

CREATE TABLE IF NOT EXISTS workspaces (
  workspace_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  plan_id TEXT NOT NULL DEFAULT 'plan_free',
  data_region TEXT NOT NULL DEFAULT 'global',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_tenant_id
  ON workspaces (tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_org_slug
  ON workspaces (organization_id, slug);

CREATE INDEX IF NOT EXISTS idx_workspaces_org_status_created_at
  ON workspaces (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspaces_plan_status
  ON workspaces (plan_id, status);

CREATE TABLE IF NOT EXISTS workspace_memberships (
  workspace_membership_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TEXT,
  invited_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_memberships_workspace_user
  ON workspace_memberships (workspace_id, user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user_status
  ON workspace_memberships (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_workspace_role_status
  ON workspace_memberships (workspace_id, role, status);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  invitation_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  workspace_id TEXT,
  email_normalized TEXT NOT NULL,
  role TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by_user_id TEXT,
  expires_at TEXT NOT NULL,
  accepted_by_user_id TEXT,
  accepted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_invitations_token_hash
  ON workspace_invitations (token_hash);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_org_email_status
  ON workspace_invitations (organization_id, email_normalized, status);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_status
  ON workspace_invitations (workspace_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS service_accounts (
  service_account_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  role TEXT NOT NULL DEFAULT 'workspace_service',
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_accounts_workspace_name
  ON service_accounts (workspace_id, name);

CREATE INDEX IF NOT EXISTS idx_service_accounts_workspace_status
  ON service_accounts (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_accounts_tenant_status
  ON service_accounts (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS api_keys (
  api_key_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  service_account_id TEXT,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scope_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT,
  last_used_at TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_prefix
  ON api_keys (key_prefix);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_hash
  ON api_keys (key_hash);

CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_status
  ON api_keys (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_keys_service_account_status
  ON api_keys (service_account_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_plan_subscriptions (
  subscription_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  billing_provider TEXT NOT NULL DEFAULT 'manual',
  external_customer_ref TEXT,
  external_subscription_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_plan_subscriptions_workspace
  ON workspace_plan_subscriptions (workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_plan_subscriptions_org_status
  ON workspace_plan_subscriptions (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_plan_subscriptions_provider_ref
  ON workspace_plan_subscriptions (billing_provider, external_subscription_ref);

CREATE TABLE IF NOT EXISTS usage_ledger (
  usage_event_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  meter_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_workspace_meter_period
  ON usage_ledger (workspace_id, meter_name, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_tenant_meter_created_at
  ON usage_ledger (tenant_id, meter_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_source
  ON usage_ledger (source_type, source_id);

INSERT OR IGNORE INTO pricing_plans (
  plan_id,
  code,
  display_name,
  tier,
  status,
  monthly_price_cents,
  yearly_price_cents,
  limits_json,
  features_json,
  created_at,
  updated_at
) VALUES
  (
    'plan_free',
    'free',
    'Free',
    'free',
    'active',
    0,
    0,
    '{"runs_per_month":1000,"tool_providers":3,"member_seats":3,"artifact_retention_days":7}',
    '{"sso":false,"audit_export":false,"dedicated_environment":false}',
    '2026-04-02T00:00:00.000Z',
    '2026-04-02T00:00:00.000Z'
  ),
  (
    'plan_pro',
    'pro',
    'Pro',
    'paid',
    'active',
    9900,
    99000,
    '{"runs_per_month":20000,"tool_providers":20,"member_seats":20,"artifact_retention_days":30}',
    '{"sso":false,"audit_export":true,"dedicated_environment":false}',
    '2026-04-02T00:00:00.000Z',
    '2026-04-02T00:00:00.000Z'
  ),
  (
    'plan_enterprise',
    'enterprise',
    'Enterprise',
    'enterprise',
    'active',
    0,
    0,
    '{"runs_per_month":-1,"tool_providers":-1,"member_seats":-1,"artifact_retention_days":180}',
    '{"sso":true,"audit_export":true,"dedicated_environment":true}',
    '2026-04-02T00:00:00.000Z',
    '2026-04-02T00:00:00.000Z'
  );
