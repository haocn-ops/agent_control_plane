CREATE TABLE IF NOT EXISTS billing_checkout_sessions (
  checkout_session_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  current_plan_id TEXT NOT NULL,
  target_plan_id TEXT NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  billing_provider TEXT NOT NULL DEFAULT 'mock_checkout',
  status TEXT NOT NULL DEFAULT 'open',
  expires_at TEXT NOT NULL,
  completed_at TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_checkout_sessions_workspace_status
  ON billing_checkout_sessions (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_checkout_sessions_org_status
  ON billing_checkout_sessions (organization_id, status, created_at DESC);
