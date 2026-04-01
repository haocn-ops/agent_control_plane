CREATE TABLE IF NOT EXISTS audit_events (
  event_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  step_id TEXT,
  trace_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_ref TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_events_run_created_at
  ON audit_events (tenant_id, run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_event_type_created_at
  ON audit_events (tenant_id, event_type, created_at DESC);
