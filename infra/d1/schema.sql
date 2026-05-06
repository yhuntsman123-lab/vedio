-- D1 Schema (Frozen Billing + Job Orchestration)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS points_wallet (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT,
  type TEXT NOT NULL, -- credit|debit_hold|debit_settle|refund
  points INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_idem ON points_ledger(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON points_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL, -- paste|txt|md|url
  source_uri TEXT,
  source_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  profile_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'READY',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS actor_assets (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  view_type TEXT NOT NULL, -- front|side|back|face_ref
  r2_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(actor_id) REFERENCES actors(id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  estimated_points INTEGER NOT NULL DEFAULT 0,
  settled_points INTEGER,
  output_r2_key TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs(user_id, status);

CREATE TABLE IF NOT EXISTS job_shots (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  shot_index INTEGER NOT NULL,
  prompt_en TEXT NOT NULL,
  outfit_state TEXT,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  image_r2_key TEXT,
  audio_r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(job_id) REFERENCES jobs(id)
);
CREATE INDEX IF NOT EXISTS idx_job_shots_job ON job_shots(job_id, shot_index);
