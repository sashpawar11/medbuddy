// SQLite DDL Schema for MedBuddy
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  dob TEXT,
  avatar_color TEXT NOT NULL DEFAULT '#57c1ff',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  parent_folder_id TEXT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  FOREIGN KEY (parent_folder_id) REFERENCES folders (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  extracted_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL, -- 'local' | 'cloud'
  provider_type TEXT NOT NULL, -- 'lm-studio' | 'ollama' | 'openai-compatible' | 'openai'
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  api_key TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  scope_type TEXT NOT NULL, -- 'file' | 'selection' | 'folder'
  scope_id TEXT NOT NULL,
  provider_profile_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (provider_profile_id) REFERENCES provider_profiles (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS analysis_sources (
  analysis_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  PRIMARY KEY (analysis_id, document_id),
  FOREIGN KEY (analysis_id) REFERENCES analysis_results (id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL, -- 'info' | 'warn' | 'error' | 'debug'
  category TEXT NOT NULL, -- 'ai' | 'extract' | 'db' | 'vault' | 'ipc' | 'app'
  message TEXT NOT NULL,
  details TEXT,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_settings (
  id TEXT PRIMARY KEY DEFAULT 'google_drive',
  provider TEXT NOT NULL DEFAULT 'google_drive',
  is_signed_in INTEGER NOT NULL DEFAULT 0,
  user_email TEXT,
  user_name TEXT,
  user_avatar TEXT,
  client_id TEXT,
  client_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TEXT,
  mount_type TEXT NOT NULL DEFAULT 'cloud',
  drive_folder_id TEXT,
  drive_folder_name TEXT NOT NULL DEFAULT 'MedBuddy Vault',
  local_mount_path TEXT,
  sync_scope TEXT NOT NULL DEFAULT 'all',
  selected_member_id TEXT,
  selected_folder_ids TEXT NOT NULL DEFAULT '[]',
  auto_sync INTEGER NOT NULL DEFAULT 0,
  last_sync_time TEXT,
  last_sync_status TEXT NOT NULL DEFAULT 'idle',
  last_sync_error TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_items (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL,
  local_id TEXT NOT NULL,
  remote_id TEXT NOT NULL,
  content_hash TEXT,
  last_synced_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'synced',
  error_message TEXT
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_folders_member_id ON folders(member_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_cache_key ON analysis_results(cache_key);
CREATE INDEX IF NOT EXISTS idx_analysis_sources_analysis ON analysis_sources(analysis_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_category ON app_logs(category);
CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_items_local_id ON sync_items(local_id);
`;
