CREATE TABLE IF NOT EXISTS queue_dedupe_records (
  record_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  queue_name TEXT NOT NULL,
  message_type TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  run_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_dedupe_unique
  ON queue_dedupe_records (queue_name, dedupe_key);

CREATE INDEX IF NOT EXISTS idx_queue_dedupe_tenant_processed_at
  ON queue_dedupe_records (tenant_id, processed_at DESC);
