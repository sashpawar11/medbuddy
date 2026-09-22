import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import crypto from 'crypto';
import { SCHEMA_SQL } from './schema';
import type {
  FamilyMember,
  Folder,
  DocumentItem,
  ProviderProfile,
  AnalysisRecord,
  AppLogEntry,
  StructuredAnalysisResult,
  GoogleSyncSettings,
  SyncScope,
  SyncMountType,
} from '../../shared/types';
import { logger } from '../services/logger';

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    throw new Error('Database has not been initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

export function initDatabase(dbPath?: string): Database.Database {
  if (dbInstance) return dbInstance;

  const resolvedPath = dbPath || path.join(app.getPath('userData'), 'medbuddy.db');
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(resolvedPath);

  // Performance & Integrity Pragmas
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('synchronous = NORMAL');

  // Execute schema
  dbInstance.exec(SCHEMA_SQL);

  // Schema migrations
  try {
    dbInstance.exec('ALTER TABLE provider_profiles ADD COLUMN timeout_seconds INTEGER DEFAULT 900');
  } catch {
    // Column already exists
  }

  // Seed default profiles if none exist
  seedDefaultProfiles(dbInstance);

  return dbInstance;
}

function seedDefaultProfiles(db: Database.Database) {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM provider_profiles');
  const { count } = countStmt.get() as { count: number };

  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO provider_profiles (id, name, kind, provider_type, base_url, model, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    insert.run(
      'profile_lm_studio',
      'LM Studio (Local)',
      'local',
      'lm-studio',
      'http://localhost:1234/v1',
      'llama-3.2-3b-instruct',
      1,
      now
    );

    insert.run(
      'profile_ollama',
      'Ollama (Local)',
      'local',
      'ollama',
      'http://localhost:11434/v1',
      'llama3.2:latest',
      0,
      now
    );

    logger.info('db', 'Seeded default provider profiles for LM Studio and Ollama');
  }
}

// ---------------- Members Repository ---------------- //

export function listMembers(): FamilyMember[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM members ORDER BY created_at ASC').all() as FamilyMember[];
}

export function createMember(member: Omit<FamilyMember, 'id' | 'created_at' | 'updated_at'>): FamilyMember {
  const db = getDatabase();
  const id = 'mem_' + crypto.randomUUID().slice(0, 12);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO members (id, name, relationship, dob, avatar_color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, member.name, member.relationship, member.dob || null, member.avatar_color || '#57c1ff', now, now);

  // Automatically create a default "General Records" root folder for new member
  createFolder(id, 'General Records', null);

  return {
    id,
    name: member.name,
    relationship: member.relationship,
    dob: member.dob,
    avatar_color: member.avatar_color || '#57c1ff',
    created_at: now,
    updated_at: now,
  };
}

export function updateMember(id: string, updates: Partial<FamilyMember>): FamilyMember {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as FamilyMember;
  if (!existing) throw new Error(`Member with id ${id} not found`);

  const now = new Date().toISOString();
  const updated = { ...existing, ...updates, updated_at: now };

  db.prepare(`
    UPDATE members
    SET name = ?, relationship = ?, dob = ?, avatar_color = ?, updated_at = ?
    WHERE id = ?
  `).run(updated.name, updated.relationship, updated.dob || null, updated.avatar_color, now, id);

  return updated;
}

export function deleteMember(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM members WHERE id = ?').run(id);
}

// ---------------- Folders Repository ---------------- //

export function listFolders(memberId: string): Folder[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT f.*, COUNT(d.id) as document_count
    FROM folders f
    LEFT JOIN documents d ON f.id = d.folder_id
    WHERE f.member_id = ?
    GROUP BY f.id
    ORDER BY f.created_at ASC
  `).all(memberId) as (Folder & { document_count: number })[];
  return rows;
}

export function createFolder(memberId: string, name: string, parentFolderId?: string | null): Folder {
  const db = getDatabase();
  const id = 'fld_' + crypto.randomUUID().slice(0, 12);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO folders (id, member_id, parent_folder_id, name, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, memberId, parentFolderId || null, name, now);

  return {
    id,
    member_id: memberId,
    parent_folder_id: parentFolderId || null,
    name,
    created_at: now,
    document_count: 0,
  };
}

export function deleteFolder(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM folders WHERE id = ?').run(id);
}

// ---------------- Documents Repository ---------------- //

export function listDocuments(folderId: string): DocumentItem[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM documents WHERE folder_id = ? ORDER BY created_at DESC').all(folderId) as DocumentItem[];
}

export function getDocumentById(id: string): DocumentItem | null {
  const db = getDatabase();
  return (db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentItem) || null;
}

export function getDocumentsByIds(ids: string[]): DocumentItem[] {
  if (ids.length === 0) return [];
  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  return db.prepare(`SELECT * FROM documents WHERE id IN (${placeholders})`).all(...ids) as DocumentItem[];
}

export function insertDocument(doc: Omit<DocumentItem, 'id' | 'created_at' | 'updated_at'>): DocumentItem {
  const db = getDatabase();
  const id = 'doc_' + crypto.randomUUID().slice(0, 12);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO documents (id, folder_id, filename, file_type, file_size, storage_path, content_hash, extracted_text, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    doc.folder_id,
    doc.filename,
    doc.file_type,
    doc.file_size,
    doc.storage_path,
    doc.content_hash,
    doc.extracted_text || null,
    now,
    now
  );

  return {
    ...doc,
    id,
    created_at: now,
    updated_at: now,
  };
}

export function updateDocumentExtractedText(id: string, text: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare('UPDATE documents SET extracted_text = ?, updated_at = ? WHERE id = ?').run(text, now, id);
}

export function deleteDocument(id: string): DocumentItem | null {
  const db = getDatabase();
  const doc = getDocumentById(id);
  if (doc) {
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  }
  return doc;
}

// ---------------- Provider Profiles Repository ---------------- //

export function listProviders(): ProviderProfile[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM provider_profiles ORDER BY created_at ASC').all() as ProviderProfile[];
}

export function getProviderById(id: string): ProviderProfile | null {
  const db = getDatabase();
  return (db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(id) as ProviderProfile) || null;
}

export function saveProvider(profile: Omit<ProviderProfile, 'id' | 'created_at'> & { id?: string }): ProviderProfile {
  const db = getDatabase();
  const id = profile.id || 'prof_' + crypto.randomUUID().slice(0, 12);
  const now = new Date().toISOString();

  // If setting this profile as default, unset existing default
  if (profile.is_default) {
    db.prepare('UPDATE provider_profiles SET is_default = 0').run();
  }

  const existing = db.prepare('SELECT id FROM provider_profiles WHERE id = ?').get(id);

  if (existing) {
    db.prepare(`
      UPDATE provider_profiles
      SET name = ?, kind = ?, provider_type = ?, base_url = ?, model = ?, api_key = ?, timeout_seconds = ?, is_default = ?
      WHERE id = ?
    `).run(
      profile.name,
      profile.kind,
      profile.provider_type,
      profile.base_url,
      profile.model,
      profile.api_key || null,
      profile.timeout_seconds || 900,
      profile.is_default ? 1 : 0,
      id
    );
  } else {
    db.prepare(`
      INSERT INTO provider_profiles (id, name, kind, provider_type, base_url, model, api_key, timeout_seconds, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      profile.name,
      profile.kind,
      profile.provider_type,
      profile.base_url,
      profile.model,
      profile.api_key || null,
      profile.timeout_seconds || 900,
      profile.is_default ? 1 : 0,
      now
    );
  }

  return getProviderById(id)!;
}

export function deleteProvider(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM provider_profiles WHERE id = ?').run(id);
}

// ---------------- Analysis Results Repository ---------------- //

export function getAnalysisByCacheKey(cacheKey: string): AnalysisRecord | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT a.*, p.name as provider_name, p.model as model_name
    FROM analysis_results a
    LEFT JOIN provider_profiles p ON a.provider_profile_id = p.id
    WHERE a.cache_key = ?
  `).get(cacheKey) as any;

  if (!row) return null;
  return hydrateAnalysisRecord(row);
}

export function getAnalysisById(id: string): AnalysisRecord | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT a.*, p.name as provider_name, p.model as model_name
    FROM analysis_results a
    LEFT JOIN provider_profiles p ON a.provider_profile_id = p.id
    WHERE a.id = ?
  `).get(id) as any;

  if (!row) return null;
  return hydrateAnalysisRecord(row);
}

export function listRecentAnalyses(limit: number = 20): AnalysisRecord[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT a.*, p.name as provider_name, p.model as model_name
    FROM analysis_results a
    LEFT JOIN provider_profiles p ON a.provider_profile_id = p.id
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map(hydrateAnalysisRecord);
}

function hydrateAnalysisRecord(row: any): AnalysisRecord {
  const db = getDatabase();
  const docRows = db.prepare(`
    SELECT d.* FROM documents d
    JOIN analysis_sources s ON d.id = s.document_id
    WHERE s.analysis_id = ?
  `).all(row.id) as DocumentItem[];

  let scopeName = row.scope_id;
  if (row.scope_type === 'folder') {
    const f = db.prepare('SELECT name FROM folders WHERE id = ?').get(row.scope_id) as { name: string } | undefined;
    if (f) scopeName = f.name;
  } else if (row.scope_type === 'file') {
    const d = db.prepare('SELECT filename FROM documents WHERE id = ?').get(row.scope_id) as { filename: string } | undefined;
    if (d) scopeName = d.filename;
  }

  let parsedJson: StructuredAnalysisResult;
  try {
    parsedJson = JSON.parse(row.result_json);
  } catch {
    parsedJson = {
      schemaVersion: '1.0',
      summary: 'Error parsing analysis json',
      metrics: [],
      flags: [],
      recommendations: [],
      extractedEntities: {},
      sourceDocuments: [],
      confidence: 'low',
    };
  }

  return {
    id: row.id,
    cache_key: row.cache_key,
    scope_type: row.scope_type,
    scope_id: row.scope_id,
    scope_name: scopeName,
    provider_profile_id: row.provider_profile_id,
    provider_name: row.provider_name,
    model_name: row.model_name,
    prompt_version: row.prompt_version,
    result_json: parsedJson,
    source_documents: docRows,
    created_at: row.created_at,
  };
}

export function storeAnalysisResult(
  cacheKey: string,
  scopeType: 'file' | 'selection' | 'folder',
  scopeId: string,
  providerProfileId: string,
  promptVersion: string,
  result: StructuredAnalysisResult,
  documentIds: string[]
): AnalysisRecord {
  const db = getDatabase();
  const id = 'anl_' + crypto.randomUUID().slice(0, 12);
  const now = new Date().toISOString();
  const jsonStr = JSON.stringify(result);

  const insertAnalysis = db.prepare(`
    INSERT INTO analysis_results (id, cache_key, scope_type, scope_id, provider_profile_id, prompt_version, result_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSource = db.prepare(`
    INSERT INTO analysis_sources (analysis_id, document_id)
    VALUES (?, ?)
  `);

  const transaction = db.transaction(() => {
    insertAnalysis.run(id, cacheKey, scopeType, scopeId, providerProfileId, promptVersion, jsonStr, now);
    for (const docId of documentIds) {
      insertSource.run(id, docId);
    }
  });

  transaction();

  return getAnalysisById(id)!;
}

// ---------------- Logs Repository ---------------- //

export function listAppLogs(limit: number = 100, category?: string): AppLogEntry[] {
  const db = getDatabase();
  if (category) {
    return db.prepare('SELECT * FROM app_logs WHERE category = ? ORDER BY timestamp DESC LIMIT ?').all(category, limit) as AppLogEntry[];
  }
  return db.prepare('SELECT * FROM app_logs ORDER BY timestamp DESC LIMIT ?').all(limit) as AppLogEntry[];
}

export function clearAppLogs(): void {
  const db = getDatabase();
  db.prepare('DELETE FROM app_logs').run();
}

// ---------------- Google Drive Sync Repository ---------------- //

export function getSyncSettings(): GoogleSyncSettings {
  const db = getDatabase();
  let row = db.prepare('SELECT * FROM sync_settings WHERE id = ?').get('google_drive') as any;

  if (!row) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO sync_settings (
        id, provider, is_signed_in, user_email, user_name, user_avatar,
        client_id, client_secret, mount_type, drive_folder_id, drive_folder_name,
        local_mount_path, sync_scope, selected_member_id, selected_folder_ids,
        auto_sync, last_sync_time, last_sync_status, last_sync_error, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'google_drive',
      'google_drive',
      0,
      null,
      null,
      null,
      null,
      null,
      'cloud',
      null,
      'MedBuddy Vault',
      null,
      'all',
      null,
      '[]',
      0,
      null,
      'idle',
      null,
      now
    );
    row = db.prepare('SELECT * FROM sync_settings WHERE id = ?').get('google_drive') as any;
  }

  let folderIds: string[] = [];
  try {
    folderIds = JSON.parse(row.selected_folder_ids || '[]');
  } catch {
    folderIds = [];
  }

  return {
    provider: 'google_drive',
    isSignedIn: Boolean(row.is_signed_in),
    userEmail: row.user_email || null,
    userName: row.user_name || null,
    userAvatar: row.user_avatar || null,
    clientId: row.client_id || null,
    clientSecret: row.client_secret || null,
    mountType: (row.mount_type as SyncMountType) || 'cloud',
    driveFolderId: row.drive_folder_id || null,
    driveFolderName: row.drive_folder_name || 'MedBuddy Vault',
    localMountPath: row.local_mount_path || null,
    syncScope: (row.sync_scope as SyncScope) || 'all',
    selectedMemberId: row.selected_member_id || null,
    selectedFolderIds: folderIds,
    autoSync: Boolean(row.auto_sync),
    lastSyncTime: row.last_sync_time || null,
    lastSyncStatus: row.last_sync_status || 'idle',
    lastSyncError: row.last_sync_error || null,
  };
}

export function saveSyncSettings(updates: Partial<GoogleSyncSettings>): GoogleSyncSettings {
  const db = getDatabase();
  const current = getSyncSettings();
  const now = new Date().toISOString();

  const merged = {
    ...current,
    ...updates,
  };

  db.prepare(`
    UPDATE sync_settings
    SET
      is_signed_in = ?,
      user_email = ?,
      user_name = ?,
      user_avatar = ?,
      client_id = ?,
      client_secret = ?,
      mount_type = ?,
      drive_folder_id = ?,
      drive_folder_name = ?,
      local_mount_path = ?,
      sync_scope = ?,
      selected_member_id = ?,
      selected_folder_ids = ?,
      auto_sync = ?,
      last_sync_time = ?,
      last_sync_status = ?,
      last_sync_error = ?,
      updated_at = ?
    WHERE id = 'google_drive'
  `).run(
    merged.isSignedIn ? 1 : 0,
    merged.userEmail,
    merged.userName,
    merged.userAvatar,
    merged.clientId || null,
    merged.clientSecret || null,
    merged.mountType,
    merged.driveFolderId || null,
    merged.driveFolderName || 'MedBuddy Vault',
    merged.localMountPath || null,
    merged.syncScope,
    merged.selectedMemberId || null,
    JSON.stringify(merged.selectedFolderIds || []),
    merged.autoSync ? 1 : 0,
    merged.lastSyncTime || null,
    merged.lastSyncStatus,
    merged.lastSyncError || null,
    now
  );

  return getSyncSettings();
}

export function getSyncTokens(): { accessToken: string | null; refreshToken: string | null; tokenExpiry: string | null } {
  const db = getDatabase();
  const row = db.prepare('SELECT access_token, refresh_token, token_expiry FROM sync_settings WHERE id = ?').get('google_drive') as any;
  if (!row) return { accessToken: null, refreshToken: null, tokenExpiry: null };
  return {
    accessToken: row.access_token || null,
    refreshToken: row.refresh_token || null,
    tokenExpiry: row.token_expiry || null,
  };
}

export function saveSyncTokens(tokens: { accessToken?: string | null; refreshToken?: string | null; tokenExpiry?: string | null }): void {
  const db = getDatabase();
  const current = getSyncTokens();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE sync_settings
    SET
      access_token = ?,
      refresh_token = ?,
      token_expiry = ?,
      updated_at = ?
    WHERE id = 'google_drive'
  `).run(
    tokens.accessToken !== undefined ? tokens.accessToken : current.accessToken,
    tokens.refreshToken !== undefined ? tokens.refreshToken : current.refreshToken,
    tokens.tokenExpiry !== undefined ? tokens.tokenExpiry : current.tokenExpiry,
    now
  );
}

export function recordSyncItem(item: {
  item_type: 'document' | 'folder' | 'member';
  local_id: string;
  remote_id: string;
  content_hash?: string;
  status?: string;
  error_message?: string;
}): void {
  const db = getDatabase();
  const id = 'sitem_' + crypto.randomUUID().slice(0, 12);
  const now = new Date().toISOString();

  // If item already recorded, update it
  const existing = db.prepare('SELECT id FROM sync_items WHERE local_id = ?').get(item.local_id) as any;
  if (existing) {
    db.prepare(`
      UPDATE sync_items
      SET remote_id = ?, content_hash = ?, last_synced_at = ?, status = ?, error_message = ?
      WHERE local_id = ?
    `).run(
      item.remote_id,
      item.content_hash || null,
      now,
      item.status || 'synced',
      item.error_message || null,
      item.local_id
    );
  } else {
    db.prepare(`
      INSERT INTO sync_items (id, item_type, local_id, remote_id, content_hash, last_synced_at, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      item.item_type,
      item.local_id,
      item.remote_id,
      item.content_hash || null,
      now,
      item.status || 'synced',
      item.error_message || null
    );
  }
}

export function getSyncItem(localId: string): { id: string; item_type: string; local_id: string; remote_id: string; content_hash: string | null; last_synced_at: string; status: string } | null {
  const db = getDatabase();
  return (db.prepare('SELECT * FROM sync_items WHERE local_id = ?').get(localId) as any) || null;
}

export function listAllDocuments(): DocumentItem[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all() as DocumentItem[];
}

export function listDocumentsForMember(memberId: string): DocumentItem[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT d.* FROM documents d
    JOIN folders f ON d.folder_id = f.id
    WHERE f.member_id = ?
    ORDER BY d.created_at DESC
  `).all(memberId) as DocumentItem[];
}
