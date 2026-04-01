CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  framework TEXT NOT NULL,
  endpoint_url TEXT,
  auth_type TEXT NOT NULL DEFAULT 'none',
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_tenant_status
  ON agents (tenant_id, status);

CREATE TABLE IF NOT EXISTS tool_providers (
  tool_provider_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  auth_ref TEXT,
  visibility_policy_ref TEXT,
  execution_policy_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tool_providers_tenant_status
  ON tool_providers (tenant_id, status);

CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  parent_run_id TEXT,
  replay_source_run_id TEXT,
  entry_agent_id TEXT,
  status TEXT NOT NULL,
  workflow_instance_id TEXT NOT NULL,
  current_step_id TEXT,
  pending_approval_id TEXT,
  input_blob_key TEXT NOT NULL,
  context_json TEXT NOT NULL DEFAULT '{}',
  error_code TEXT,
  error_message TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_tenant_created_at
  ON runs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runs_tenant_status_updated_at
  ON runs (tenant_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_runs_trace_id
  ON runs (trace_id);

CREATE TABLE IF NOT EXISTS run_steps (
  step_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  parent_step_id TEXT,
  sequence_no INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_ref TEXT,
  status TEXT NOT NULL,
  input_blob_key TEXT,
  output_blob_key TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  error_code TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_run_steps_run_sequence
  ON run_steps (run_id, sequence_no);

CREATE INDEX IF NOT EXISTS idx_run_steps_tenant_run_status
  ON run_steps (tenant_id, run_id, status);

CREATE TABLE IF NOT EXISTS approvals (
  approval_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_ref TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  approver_scope_json TEXT NOT NULL DEFAULT '{}',
  decision_by TEXT,
  decision_comment TEXT,
  decision_reason_code TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_approvals_tenant_status_created_at
  ON approvals (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approvals_run_status
  ON approvals (run_id, status);

CREATE TABLE IF NOT EXISTS artifacts (
  artifact_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  step_id TEXT,
  artifact_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  sha256 TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artifacts_run_created_at
  ON artifacts (run_id, created_at);

CREATE TABLE IF NOT EXISTS a2a_tasks (
  task_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  remote_task_id TEXT NOT NULL,
  remote_agent_id TEXT NOT NULL,
  remote_endpoint_url TEXT,
  last_remote_message_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_a2a_tasks_run_id
  ON a2a_tasks (run_id);

CREATE INDEX IF NOT EXISTS idx_a2a_tasks_tenant_remote_task
  ON a2a_tasks (tenant_id, remote_task_id);

CREATE TABLE IF NOT EXISTS mcp_calls (
  call_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  tool_provider_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  policy_decision TEXT NOT NULL,
  approval_id TEXT,
  request_blob_key TEXT NOT NULL,
  response_blob_key TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL,
  error_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_mcp_calls_run_started_at
  ON mcp_calls (run_id, started_at);

CREATE TABLE IF NOT EXISTS idempotency_records (
  record_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  route_key TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_unique
  ON idempotency_records (tenant_id, route_key, idempotency_key);
