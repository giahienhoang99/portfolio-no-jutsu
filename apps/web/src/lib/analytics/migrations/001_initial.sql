CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY NOT NULL,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurred_at INTEGER NOT NULL,
  utc_day TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('visit', 'resume_view', 'resume_download')),
  route TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  session_hash TEXT
);

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_hash TEXT PRIMARY KEY NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_rate_limits (
  visitor_hash TEXT NOT NULL,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (visitor_hash, window_started_at)
);

CREATE INDEX IF NOT EXISTS analytics_events_day_type_idx ON analytics_events (utc_day, type);
CREATE INDEX IF NOT EXISTS analytics_events_day_visitor_idx ON analytics_events (utc_day, visitor_hash);
CREATE INDEX IF NOT EXISTS analytics_events_retention_idx ON analytics_events (occurred_at);
CREATE INDEX IF NOT EXISTS analytics_sessions_expiry_idx ON analytics_sessions (expires_at);
CREATE INDEX IF NOT EXISTS analytics_rate_limits_window_idx ON analytics_rate_limits (window_started_at);
