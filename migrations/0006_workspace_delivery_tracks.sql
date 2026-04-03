CREATE TABLE IF NOT EXISTS workspace_delivery_tracks (
  track_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  track_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  owner_user_id TEXT,
  notes_text TEXT NOT NULL DEFAULT '',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_delivery_tracks_workspace_key
  ON workspace_delivery_tracks (workspace_id, track_key);

CREATE INDEX IF NOT EXISTS idx_workspace_delivery_tracks_org_key_status
  ON workspace_delivery_tracks (organization_id, track_key, status, updated_at DESC);
