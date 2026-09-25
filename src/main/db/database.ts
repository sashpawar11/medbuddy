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
  AppStateSnapshot,
  CitedChunk,
  ChatMessageItem,
  ChatSessionItem,
} from '../../shared/types';
import { logger } from '../services/logger';

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    throw new Error('Database has not been initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
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

  // OCR & Tags column migrations
  const docMigrations = [
    `ALTER TABLE documents ADD COLUMN ocr_status TEXT NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE documents ADD COLUMN ocr_stage TEXT`,
    `ALTER TABLE documents ADD COLUMN ocr_error TEXT`,
    `ALTER TABLE documents ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`,
  ];
  for (const sql of docMigrations) {
    try { dbInstance.exec(sql); } catch { /* column already exists */ }
  }

  // Rename legacy "General Records" default folder to "Medical Documents"
  try {
    dbInstance.exec("UPDATE folders SET name = 'Medical Documents' WHERE name = 'General Records'");
  } catch {
    // ignore
  }

  // Schema migration for analysis_results.title
  try {
    dbInstance.exec("ALTER TABLE analysis_results ADD COLUMN title TEXT");
  } catch {
    // column already exists
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

  // Automatically create a default "Medical Documents" root folder for new member
  createFolder(id, 'Medical Documents', null);

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

export function getMemberById(id: string): FamilyMember | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as FamilyMember | undefined;
  return row || null;
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

function mapDocumentRow(row: any): DocumentItem {
  if (!row) return row;
  let tags: string[] = [];
  if (row.tags) {
    try {
      tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
      if (!Array.isArray(tags)) tags = [];
    } catch {
      tags = [];
    }
  }
  return {
    ...row,
    tags,
  };
}

export function listDocuments(folderId: string): DocumentItem[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM documents WHERE folder_id = ? ORDER BY created_at DESC').all(folderId);
  return rows.map(mapDocumentRow);
}

export function getDocumentById(id: string): DocumentItem | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  return row ? mapDocumentRow(row) : null;
}

export function getDocumentsByIds(ids: string[]): DocumentItem[] {
  if (ids.length === 0) return [];
  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM documents WHERE id IN (${placeholders})`).all(...ids);
  return rows.map(mapDocumentRow);
}

export function insertDocument(doc: Omit<DocumentItem, 'id' | 'created_at' | 'updated_at'>): DocumentItem {
  const db = getDatabase();
  const id = 'doc_' + crypto.randomUUID().slice(0, 12);
  const now = new Date().toISOString();
  const tagsJson = JSON.stringify(doc.tags || []);

  db.prepare(`
    INSERT INTO documents (id, folder_id, filename, file_type, file_size, storage_path, content_hash, extracted_text, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    doc.folder_id,
    doc.filename,
    doc.file_type,
    doc.file_size,
    doc.storage_path,
    doc.content_hash,
    doc.extracted_text || null,
    tagsJson,
    now,
    now
  );

  return {
    ...doc,
    id,
    tags: doc.tags || [],
    created_at: now,
    updated_at: now,
  };
}

export function updateDocumentMetadata(
  id: string,
  updates: { filename?: string; tags?: string[] }
): DocumentItem | null {
  const db = getDatabase();
  const doc = getDocumentById(id);
  if (!doc) return null;

  const now = new Date().toISOString();
  const newFilename = updates.filename !== undefined ? updates.filename : doc.filename;
  const newTags = updates.tags !== undefined ? updates.tags : (doc.tags || []);
  const tagsJson = JSON.stringify(newTags);

  db.prepare(`
    UPDATE documents
    SET filename = ?, tags = ?, updated_at = ?
    WHERE id = ?
  `).run(newFilename, tagsJson, now, id);

  return {
    ...doc,
    filename: newFilename,
    tags: newTags,
    updated_at: now,
  };
}

export function updateDocumentsMetadata(
  updates: Array<{ id: string; filename?: string; tags?: string[] }>
): boolean {
  if (updates.length === 0) return true;
  const db = getDatabase();
  const updateStmt = db.prepare(`
    UPDATE documents
    SET filename = COALESCE(?, filename),
        tags = COALESCE(?, tags),
        updated_at = ?
    WHERE id = ?
  `);

  const now = new Date().toISOString();
  const transaction = db.transaction((items: Array<{ id: string; filename?: string; tags?: string[] }>) => {
    for (const item of items) {
      const tagsJson = item.tags !== undefined ? JSON.stringify(item.tags) : null;
      updateStmt.run(item.filename ?? null, tagsJson, now, item.id);
    }
  });

  transaction(updates);
  return true;
}

export function updateDocumentExtractedText(id: string, text: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare('UPDATE documents SET extracted_text = ?, updated_at = ? WHERE id = ?').run(text, now, id);
}

export function updateDocumentOcrStatus(
  id: string,
  status: string,
  stage?: string | null,
  error?: string | null
): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE documents SET ocr_status = ?, ocr_stage = ?, ocr_error = ?, updated_at = ? WHERE id = ?'
  ).run(status, stage ?? null, error ?? null, now, id);
}

export function getPendingOcrDocuments(): DocumentItem[] {
  const db = getDatabase();
  return db
    .prepare(`SELECT * FROM documents WHERE ocr_status IN ('pending', 'processing') ORDER BY created_at ASC`)
    .all() as DocumentItem[];
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

export function listAllAnalyses(): AnalysisRecord[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT a.*, p.name as provider_name, p.model as model_name
    FROM analysis_results a
    LEFT JOIN provider_profiles p ON a.provider_profile_id = p.id
    ORDER BY a.created_at DESC
  `).all() as any[];

  return rows.map(hydrateAnalysisRecord);
}

export function listAnalysesForMember(memberId: string): AnalysisRecord[] {
  const all = listAllAnalyses();
  return all.filter((a) => a.member_id === memberId);
}

export function listAnalysesForFolders(folderIds: string[]): AnalysisRecord[] {
  const set = new Set(folderIds);
  const all = listAllAnalyses();
  return all.filter((a) => {
    if (a.scope_type === 'folder' && set.has(a.scope_id)) return true;
    if (a.source_documents.some((d) => set.has(d.folder_id))) return true;
    return false;
  });
}

export function getAppStateSnapshot(
  scope: SyncScope = 'all',
  targetMemberId?: string | null,
  targetFolderIds?: string[]
): AppStateSnapshot {
  const allMembers = listMembers();
  let members = allMembers;
  let folders: Folder[] = [];
  let documents: DocumentItem[] = [];
  let analyses: AnalysisRecord[] = [];

  if (scope === 'all') {
    members = allMembers;
    for (const m of members) {
      folders.push(...listFolders(m.id));
    }
    documents = listAllDocuments();
    analyses = listAllAnalyses();
  } else if (scope === 'profile') {
    members = allMembers.filter((m) => m.id === targetMemberId);
    if (targetMemberId) {
      folders = listFolders(targetMemberId);
      documents = listDocumentsForMember(targetMemberId);
      analyses = listAnalysesForMember(targetMemberId);
    }
  } else if (scope === 'folders') {
    const fIds = targetFolderIds || [];
    const fSet = new Set(fIds);
    for (const m of allMembers) {
      const mFolders = listFolders(m.id);
      const matched = mFolders.filter((f) => fSet.has(f.id));
      if (matched.length > 0) {
        folders.push(...matched);
      }
    }
    const memberIdSet = new Set(folders.map((f) => f.member_id));
    members = allMembers.filter((m) => memberIdSet.has(m.id));
    for (const fid of fIds) {
      documents.push(...listDocuments(fid));
    }
    analyses = listAnalysesForFolders(fIds);
  }

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    scope,
    vaultSummary: {
      membersCount: members.length,
      foldersCount: folders.length,
      documentsCount: documents.length,
      analysesCount: analyses.length,
    },
    members,
    folders,
    documents: documents.map((doc) => ({
      id: doc.id,
      folder_id: doc.folder_id,
      filename: doc.filename,
      file_type: doc.file_type,
      file_size: doc.file_size,
      content_hash: doc.content_hash,
      ocr_status: doc.ocr_status,
      ocr_stage: doc.ocr_stage,
      tags: doc.tags ? (typeof doc.tags === 'string' ? JSON.parse(doc.tags) : doc.tags) : [],
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    })),
    analyses: analyses.map((a) => ({
      id: a.id,
      scope_type: a.scope_type,
      scope_id: a.scope_id,
      scope_name: a.scope_name || '',
      member_id: a.member_id || null,
      member_name: a.member_name || null,
      provider_name: a.provider_name || null,
      model_name: a.model_name || null,
      created_at: a.created_at,
      result: a.result_json,
    })),
  };
}

export function formatSummaryName(memberName: string | null | undefined, createdAt: string): string {
  const d = new Date(createdAt);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const namePart = (memberName || 'Profile').trim().replace(/\s+/g, '_');
  if (isNaN(d.getTime())) {
    return `${namePart}_generated_summary`;
  }
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const timeStr = (hours !== 0 || minutes !== 0) ? `_${pad(hours)}${pad(minutes)}` : '';
  return `${namePart}_${dateStr}${timeStr}_generated_summary`;
}

function hydrateAnalysisRecord(row: any): AnalysisRecord {
  const db = getDatabase();
  const docRows = db.prepare(`
    SELECT d.* FROM documents d
    JOIN analysis_sources s ON d.id = s.document_id
    WHERE s.analysis_id = ?
  `).all(row.id) as DocumentItem[];

  let scopeName = row.title;
  let memberId: string | null = null;
  let memberName: string | null = null;
  let memberColor: string | null = null;

  if (row.scope_type === 'folder') {
    const f = db.prepare(`
      SELECT f.name as folder_name, m.id as member_id, m.name as member_name, m.avatar_color as member_color
      FROM folders f
      LEFT JOIN members m ON f.member_id = m.id
      WHERE f.id = ?
    `).get(row.scope_id) as { folder_name: string; member_id?: string; member_name?: string; member_color?: string } | undefined;
    if (f) {
      if (!scopeName) scopeName = f.folder_name;
      if (f.member_id) {
        memberId = f.member_id;
        memberName = f.member_name || null;
        memberColor = f.member_color || null;
      }
    }
  } else if (row.scope_type === 'file') {
    const d = db.prepare(`
      SELECT d.filename, m.id as member_id, m.name as member_name, m.avatar_color as member_color
      FROM documents d
      JOIN folders f ON d.folder_id = f.id
      LEFT JOIN members m ON f.member_id = m.id
      WHERE d.id = ?
    `).get(row.scope_id) as { filename: string; member_id?: string; member_name?: string; member_color?: string } | undefined;
    if (d) {
      if (!scopeName) scopeName = d.filename;
      if (d.member_id) {
        memberId = d.member_id;
        memberName = d.member_name || null;
        memberColor = d.member_color || null;
      }
    }
  }

  // Fallback: If member is not yet resolved, inspect source documents
  if (!memberId && docRows.length > 0) {
    const firstDoc = docRows[0];
    const m = db.prepare(`
      SELECT m.id, m.name, m.avatar_color
      FROM folders f
      JOIN members m ON f.member_id = m.id
      WHERE f.id = ?
    `).get(firstDoc.folder_id) as { id: string; name: string; avatar_color: string } | undefined;
    if (m) {
      memberId = m.id;
      memberName = m.name;
      memberColor = m.avatar_color;
    }
  }

  // Enforce automatic naming requirement with timestamp and profile name + generated_summary
  if (!scopeName || scopeName === 'General Records' || scopeName === 'Medical Documents' || row.scope_type === 'folder' || row.scope_type === 'selection') {
    scopeName = formatSummaryName(memberName, row.created_at);
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
    member_id: memberId,
    member_name: memberName,
    member_color: memberColor,
    provider_profile_id: row.provider_profile_id,
    provider_name: row.provider_name,
    model_name: row.model_name,
    prompt_version: row.prompt_version,
    result_json: parsedJson,
    source_documents: docRows,
    created_at: row.created_at,
  };
}

export function deleteAnalysisById(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM analysis_results WHERE id = ?').run(id);
  return res.changes > 0;
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

  let memberName: string | null = null;
  if (scopeType === 'folder') {
    const f = db.prepare(`
      SELECT m.name FROM folders f
      JOIN members m ON f.member_id = m.id
      WHERE f.id = ?
    `).get(scopeId) as { name: string } | undefined;
    if (f) memberName = f.name;
  } else if (documentIds.length > 0) {
    const m = db.prepare(`
      SELECT m.name FROM documents d
      JOIN folders f ON d.folder_id = f.id
      JOIN members m ON f.member_id = m.id
      WHERE d.id = ?
    `).get(documentIds[0]) as { name: string } | undefined;
    if (m) memberName = m.name;
  }

  const title = formatSummaryName(memberName, now);

  const insertAnalysis = db.prepare(`
    INSERT INTO analysis_results (id, cache_key, scope_type, scope_id, provider_profile_id, prompt_version, result_json, created_at, title)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSource = db.prepare(`
    INSERT INTO analysis_sources (analysis_id, document_id)
    VALUES (?, ?)
  `);

  const transaction = db.transaction(() => {
    insertAnalysis.run(id, cacheKey, scopeType, scopeId, providerProfileId, promptVersion, jsonStr, now, title);
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
  item_type: 'document' | 'folder' | 'member' | 'analysis_summary' | 'app_state';
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
  const rows = db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all();
  return rows.map(mapDocumentRow);
}

export function listDocumentsForMember(memberId: string): DocumentItem[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT d.* FROM documents d
    JOIN folders f ON d.folder_id = f.id
    WHERE f.member_id = ?
    ORDER BY d.created_at DESC
  `).all(memberId);
  return rows.map(mapDocumentRow);
}

export interface RestoreAppSnapshotResult {
  counts: {
    members: number;
    folders: number;
    documents: number;
    skippedDocs: number;
    analyses: number;
  };
  memberIdMap: Map<string, string>;
  folderIdMap: Map<string, string>;
  docIdMap: Map<string, string>;
}

export function restoreAppStateFromSnapshot(
  snapshot: AppStateSnapshot,
  vaultDir: string
): RestoreAppSnapshotResult {
  const db = getDatabase();
  const now = new Date().toISOString();

  const counts = {
    members: 0,
    folders: 0,
    documents: 0,
    skippedDocs: 0,
    analyses: 0,
  };

  const memberIdMap = new Map<string, string>();
  const folderIdMap = new Map<string, string>();
  const docIdMap = new Map<string, string>();

  const tx = db.transaction(() => {
    // 1. Members
    for (const mem of snapshot.members || []) {
      const existingById = db.prepare('SELECT id FROM members WHERE id = ?').get(mem.id) as any;
      if (existingById) {
        memberIdMap.set(mem.id, existingById.id);
        continue;
      }
      const existingByName = db.prepare('SELECT id FROM members WHERE LOWER(name) = LOWER(?)').get(mem.name) as any;
      if (existingByName) {
        memberIdMap.set(mem.id, existingByName.id);
        continue;
      }

      const memId = mem.id || 'mem_' + crypto.randomUUID().slice(0, 12);
      db.prepare(`
        INSERT INTO members (id, name, relationship, dob, avatar_color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        memId,
        mem.name,
        mem.relationship || 'Self',
        mem.dob || null,
        mem.avatar_color || '#57c1ff',
        mem.created_at || now,
        now
      );
      memberIdMap.set(mem.id, memId);
      counts.members++;
    }

    // 2. Folders
    for (const f of snapshot.folders || []) {
      const targetMemberId = memberIdMap.get(f.member_id) || f.member_id;
      const memCheck = db.prepare('SELECT id FROM members WHERE id = ?').get(targetMemberId);
      if (!memCheck) continue;

      const existingById = db.prepare('SELECT id FROM folders WHERE id = ?').get(f.id) as any;
      if (existingById) {
        folderIdMap.set(f.id, existingById.id);
        continue;
      }
      const existingByName = db.prepare('SELECT id FROM folders WHERE member_id = ? AND LOWER(name) = LOWER(?)').get(targetMemberId, f.name) as any;
      if (existingByName) {
        folderIdMap.set(f.id, existingByName.id);
        continue;
      }

      const folderId = f.id || 'fld_' + crypto.randomUUID().slice(0, 12);
      db.prepare(`
        INSERT INTO folders (id, member_id, parent_folder_id, name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        folderId,
        targetMemberId,
        f.parent_folder_id || null,
        f.name,
        f.created_at || now
      );
      folderIdMap.set(f.id, folderId);
      counts.folders++;
    }

    // 3. Documents
    for (const doc of snapshot.documents || []) {
      const targetFolderId = folderIdMap.get(doc.folder_id) || doc.folder_id;
      const folderCheck = db.prepare('SELECT id FROM folders WHERE id = ?').get(targetFolderId);
      if (!folderCheck) continue;

      const existingById = db.prepare('SELECT id FROM documents WHERE id = ?').get(doc.id) as any;
      if (existingById) {
        docIdMap.set(doc.id, existingById.id);
        counts.skippedDocs++;
        continue;
      }

      const existingByNameOrHash = db.prepare(`
        SELECT id FROM documents WHERE folder_id = ? AND (filename = ? OR content_hash = ?)
      `).get(targetFolderId, doc.filename, doc.content_hash) as any;

      if (existingByNameOrHash) {
        docIdMap.set(doc.id, existingByNameOrHash.id);
        counts.skippedDocs++;
        continue;
      }

      const docId = doc.id || 'doc_' + crypto.randomUUID().slice(0, 12);
      const safeBase = doc.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageFilename = `${doc.content_hash.slice(0, 16)}_${safeBase}`;
      const storagePath = path.join(vaultDir, storageFilename);

      db.prepare(`
        INSERT INTO documents (
          id, folder_id, filename, file_type, file_size, storage_path, content_hash,
          extracted_text, ocr_status, ocr_stage, tags, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        docId,
        targetFolderId,
        doc.filename,
        doc.file_type || 'application/octet-stream',
        doc.file_size || 0,
        storagePath,
        doc.content_hash,
        null,
        doc.ocr_status || 'completed',
        doc.ocr_stage || null,
        JSON.stringify(doc.tags || []),
        doc.created_at || now,
        now
      );
      docIdMap.set(doc.id, docId);
      counts.documents++;
    }

    // 4. Analyses
    const defaultProvider = db.prepare('SELECT id FROM provider_profiles WHERE is_default = 1 LIMIT 1').get() as any;
    const fallbackProvider = db.prepare('SELECT id FROM provider_profiles LIMIT 1').get() as any;
    const activeProviderId = defaultProvider?.id || fallbackProvider?.id || 'profile_lm_studio';

    for (const a of snapshot.analyses || []) {
      const existing = db.prepare('SELECT id FROM analysis_results WHERE id = ?').get(a.id) as any;
      if (existing) continue;

      let targetScopeId = a.scope_id;
      if (a.scope_type === 'profile') {
        targetScopeId = memberIdMap.get(a.scope_id) || a.scope_id;
      } else if (a.scope_type === 'folders') {
        targetScopeId = folderIdMap.get(a.scope_id) || a.scope_id;
      } else if (a.scope_type === 'file') {
        targetScopeId = docIdMap.get(a.scope_id) || a.scope_id;
      }

      const resultJsonStr = JSON.stringify(a.result || {});
      const cacheKey = `restored:${a.id}`;

      db.prepare(`
        INSERT INTO analysis_results (
          id, cache_key, scope_type, scope_id, provider_profile_id, prompt_version, result_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        a.id,
        cacheKey,
        a.scope_type,
        targetScopeId,
        activeProviderId,
        1,
        resultJsonStr,
        a.created_at || now
      );
      counts.analyses++;
    }
  });

  tx();

  return {
    counts,
    memberIdMap,
    folderIdMap,
    docIdMap,
  };
}

// ──────────────────────────────────────────────────────────────
// Document Chunks & FTS5 Repository for Profile RAG
// ──────────────────────────────────────────────────────────────

export function insertDocumentChunk(chunk: {
  id: string;
  documentId: string;
  memberId: string;
  chunkIndex: number;
  chunkText: string;
  pageNumber: number;
  documentDate?: string | null;
  embeddingModel?: string | null;
  embedding?: Buffer | null;
}): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO document_chunks (
      id, document_id, member_id, chunk_index, chunk_text, page_number, document_date, embedding_model, embedding, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    chunk.id,
    chunk.documentId,
    chunk.memberId,
    chunk.chunkIndex,
    chunk.chunkText,
    chunk.pageNumber,
    chunk.documentDate || null,
    chunk.embeddingModel || null,
    chunk.embedding || null,
    now
  );
}

export function deleteDocumentChunks(documentId: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(documentId);
}

export function getChunksCountForDocument(documentId: string): number {
  const db = getDatabase();
  const res = db.prepare('SELECT COUNT(*) as cnt FROM document_chunks WHERE document_id = ?').get(documentId) as { cnt: number } | undefined;
  return res ? res.cnt : 0;
}

export function getChunksCountForMember(memberId: string): number {
  const db = getDatabase();
  const res = db.prepare('SELECT COUNT(*) as cnt FROM document_chunks WHERE member_id = ?').get(memberId) as { cnt: number } | undefined;
  return res ? res.cnt : 0;
}

export function sanitizeFtsQuery(raw: string): string {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
    'will', 'with', 'what', 'when', 'where', 'who', 'how', 'why', 'can', 'could',
    'did', 'do', 'does', 'tell', 'show', 'give', 'me', 'my', 'his', 'her', 'their'
  ]);
  const tokens = raw
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 1 && !stopWords.has(t));
  
  if (tokens.length === 0) {
    const rawTokens = raw.replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(t => t.length > 1);
    if (rawTokens.length === 0) return '';
    return rawTokens.map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
  }
  return tokens.map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
}

export function searchChunksFts(
  memberId: string,
  query: string,
  limit: number = 16,
  documentIds?: string[]
): CitedChunk[] {
  const db = getDatabase();
  const cleanMatch = sanitizeFtsQuery(query);
  const hasDocFilter = documentIds && documentIds.length > 0;
  if (!cleanMatch) {
    return getRecentChunksForMember(memberId, limit, documentIds);
  }

  try {
    let sql = `
      SELECT 
        dc.id as chunk_id,
        dc.document_id,
        d.filename,
        dc.page_number,
        dc.document_date,
        dc.chunk_text,
        fts.rank
      FROM document_chunks dc
      JOIN document_chunks_fts fts ON dc.rowid = fts.rowid
      JOIN documents d ON dc.document_id = d.id
      WHERE dc.member_id = ?
    `;
    const params: any[] = [memberId];
    if (hasDocFilter) {
      const placeholders = documentIds.map(() => '?').join(',');
      sql += ` AND dc.document_id IN (${placeholders}) `;
      params.push(...documentIds);
    }
    sql += ` AND document_chunks_fts MATCH ? ORDER BY fts.rank ASC LIMIT 60`;
    params.push(cleanMatch);

    const candidateRows = db.prepare(sql).all(...params) as any[];

    if (candidateRows.length === 0) {
      return getRecentChunksForMember(memberId, limit, documentIds);
    }

    // Ensure document diversity: don't let 1 document monopolize all slots.
    // Allow up to maxPerDoc (e.g. 3 chunks per document) in the first pass.
    const maxPerDoc = 3;
    const docChunkCounts = new Map<string, number>();
    const selectedRows: any[] = [];
    const remainingRows: any[] = [];

    for (const row of candidateRows) {
      const currentCount = docChunkCounts.get(row.document_id) || 0;
      if (currentCount < maxPerDoc && selectedRows.length < limit) {
        selectedRows.push(row);
        docChunkCounts.set(row.document_id, currentCount + 1);
      } else {
        remainingRows.push(row);
      }
    }

    // If budget remains, backfill from remaining candidate rows
    for (const row of remainingRows) {
      if (selectedRows.length >= limit) break;
      selectedRows.push(row);
    }

    // Ensure target documents with zero matches have at least their initial overview chunk included
    let targetDocs = listDocumentsForMember(memberId);
    if (hasDocFilter) {
      targetDocs = targetDocs.filter((d) => documentIds.includes(d.id));
    }
    if (targetDocs.length > 0 && targetDocs.length <= 15) {
      const coveredDocIds = new Set(selectedRows.map((r) => r.document_id));
      for (const doc of targetDocs) {
        if (!coveredDocIds.has(doc.id)) {
          const firstChunk = db.prepare(`
            SELECT 
              dc.id as chunk_id,
              dc.document_id,
              d.filename,
              dc.page_number,
              dc.document_date,
              dc.chunk_text,
              0.5 as rank
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.document_id = ?
            ORDER BY dc.chunk_index ASC
            LIMIT 1
          `).get(doc.id) as any;
          if (firstChunk) {
            selectedRows.push(firstChunk);
          }
        }
      }
    }

    return selectedRows.map(r => ({
      chunkId: r.chunk_id,
      documentId: r.document_id,
      filename: r.filename,
      pageNumber: r.page_number || 1,
      documentDate: r.document_date || undefined,
      snippet: r.chunk_text,
      similarityScore: typeof r.rank === 'number' ? Math.max(0.1, Math.min(1.0, 1.0 / (1.0 + Math.abs(r.rank)))) : 0.8,
    }));
  } catch (err: any) {
    logger.warn('db', `FTS search failed for member ${memberId}: ${err.message}`);
    return getRecentChunksForMember(memberId, limit, documentIds);
  }
}

export function getRecentChunksForMember(
  memberId: string,
  limit: number = 16,
  documentIds?: string[]
): CitedChunk[] {
  const db = getDatabase();
  let allDocs = listDocumentsForMember(memberId);
  const hasDocFilter = documentIds && documentIds.length > 0;
  if (hasDocFilter) {
    allDocs = allDocs.filter((d) => documentIds.includes(d.id));
  }
  const selectedRows: any[] = [];
  const coveredDocIds = new Set<string>();

  // First pass: pull the first/overview chunk from each document for broad coverage
  for (const doc of allDocs) {
    const chunk = db.prepare(`
      SELECT 
        dc.id as chunk_id,
        dc.document_id,
        d.filename,
        dc.page_number,
        dc.document_date,
        dc.chunk_text
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE dc.document_id = ?
      ORDER BY dc.chunk_index ASC
      LIMIT 1
    `).get(doc.id) as any;

    if (chunk) {
      selectedRows.push(chunk);
      coveredDocIds.add(doc.id);
    }
    if (selectedRows.length >= limit) break;
  }

  // Second pass: if slots remaining, add more chunks from documents
  if (selectedRows.length < limit) {
    const remainingLimit = limit - selectedRows.length;
    const existingChunkIds = new Set(selectedRows.map((r) => r.chunk_id));
    let sql = `
      SELECT 
        dc.id as chunk_id,
        dc.document_id,
        d.filename,
        dc.page_number,
        dc.document_date,
        dc.chunk_text
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE dc.member_id = ?
    `;
    const params: any[] = [memberId];
    if (hasDocFilter) {
      const placeholders = documentIds.map(() => '?').join(',');
      sql += ` AND dc.document_id IN (${placeholders}) `;
      params.push(...documentIds);
    }
    sql += ` ORDER BY dc.created_at DESC, dc.chunk_index ASC LIMIT ?`;
    params.push(remainingLimit * 2);

    const extraRows = db.prepare(sql).all(...params) as any[];

    for (const r of extraRows) {
      if (selectedRows.length >= limit) break;
      if (!existingChunkIds.has(r.chunk_id)) {
        selectedRows.push(r);
        existingChunkIds.add(r.chunk_id);
      }
    }
  }

  return selectedRows.map(r => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    filename: r.filename,
    pageNumber: r.page_number || 1,
    documentDate: r.document_date || undefined,
    snippet: r.chunk_text,
    similarityScore: 0.5,
  }));
}

// ──────────────────────────────────────────────────────────────
// Chat Sessions & Messages Repository
// ──────────────────────────────────────────────────────────────

export function createChatSession(params: {
  id?: string;
  memberId?: string | null;
  title?: string;
  providerProfileId?: string;
  modelName?: string;
}): ChatSessionItem {
  const db = getDatabase();
  const id = params.id || 'cs_' + crypto.randomUUID().slice(0, 12);
  const now = new Date().toISOString();
  const title = params.title || 'New Chat';

  db.prepare(`
    INSERT INTO chat_sessions (id, member_id, title, provider_profile_id, model_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.memberId || null,
    title,
    params.providerProfileId || null,
    params.modelName || null,
    now,
    now
  );

  let memberName: string | null = null;
  let memberColor: string | null = null;
  if (params.memberId) {
    const mem = getMemberById(params.memberId);
    if (mem) {
      memberName = mem.name;
      memberColor = mem.avatar_color;
    }
  }

  return {
    id,
    memberId: params.memberId || null,
    memberName,
    memberColor,
    title,
    providerProfileId: params.providerProfileId || null,
    modelName: params.modelName || null,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
}

export function listChatSessions(memberId?: string): ChatSessionItem[] {
  const db = getDatabase();
  let query = `
    SELECT 
      cs.*,
      m.name as member_name,
      m.avatar_color as member_color,
      (SELECT COUNT(*) FROM chat_messages cm WHERE cm.session_id = cs.id) as message_count
    FROM chat_sessions cs
    LEFT JOIN members m ON cs.member_id = m.id
  `;
  const params: any[] = [];
  if (memberId) {
    query += ` WHERE cs.member_id = ? `;
    params.push(memberId);
  }
  query += ` ORDER BY cs.updated_at DESC`;

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(r => ({
    id: r.id,
    memberId: r.member_id,
    memberName: r.member_name || null,
    memberColor: r.member_color || null,
    title: r.title,
    providerProfileId: r.provider_profile_id,
    modelName: r.model_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    messageCount: r.message_count || 0,
  }));
}

export function getChatSessionById(sessionId: string): ChatSessionItem | null {
  const db = getDatabase();
  const r = db.prepare(`
    SELECT 
      cs.*,
      m.name as member_name,
      m.avatar_color as member_color,
      (SELECT COUNT(*) FROM chat_messages cm WHERE cm.session_id = cs.id) as message_count
    FROM chat_sessions cs
    LEFT JOIN members m ON cs.member_id = m.id
    WHERE cs.id = ?
  `).get(sessionId) as any;

  if (!r) return null;
  return {
    id: r.id,
    memberId: r.member_id,
    memberName: r.member_name || null,
    memberColor: r.member_color || null,
    title: r.title,
    providerProfileId: r.provider_profile_id,
    modelName: r.model_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    messageCount: r.message_count || 0,
  };
}

export function updateChatSessionTitle(sessionId: string, title: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?`).run(title, now, sessionId);
}

export function touchChatSession(sessionId: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`UPDATE chat_sessions SET updated_at = ? WHERE id = ?`).run(now, sessionId);
}

export function deleteChatSession(sessionId: string): void {
  const db = getDatabase();
  db.prepare(`DELETE FROM chat_sessions WHERE id = ?`).run(sessionId);
}

export function createChatMessage(params: {
  id?: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoningContent?: string;
  scopedMemberId?: string;
  citedChunks?: CitedChunk[];
  latencyMs?: number;
  tokenCount?: number;
}): ChatMessageItem {
  const db = getDatabase();
  const id = params.id || 'cm_' + crypto.randomUUID().slice(0, 12);
  const now = new Date().toISOString();
  const citedJson = JSON.stringify(params.citedChunks || []);

  db.prepare(`
    INSERT INTO chat_messages (
      id, session_id, role, content, reasoning_content, scoped_member_id, cited_chunks_json, latency_ms, token_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.sessionId,
    params.role,
    params.content,
    params.reasoningContent || null,
    params.scopedMemberId || null,
    citedJson,
    params.latencyMs || null,
    params.tokenCount || null,
    now
  );

  touchChatSession(params.sessionId);

  return {
    id,
    sessionId: params.sessionId,
    role: params.role,
    content: params.content,
    reasoningContent: params.reasoningContent,
    scopedMemberId: params.scopedMemberId,
    citedChunks: params.citedChunks || [],
    latencyMs: params.latencyMs,
    tokenCount: params.tokenCount,
    createdAt: now,
  };
}

export function getChatMessages(sessionId: string): ChatMessageItem[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM chat_messages
    WHERE session_id = ?
    ORDER BY created_at ASC
  `).all(sessionId) as any[];

  return rows.map(r => {
    let citedChunks: CitedChunk[] = [];
    try {
      citedChunks = JSON.parse(r.cited_chunks_json || '[]');
    } catch {
      citedChunks = [];
    }
    return {
      id: r.id,
      sessionId: r.session_id,
      role: r.role,
      content: r.content,
      reasoningContent: r.reasoning_content || undefined,
      scopedMemberId: r.scoped_member_id || undefined,
      citedChunks,
      latencyMs: r.latency_ms || undefined,
      tokenCount: r.token_count || undefined,
      createdAt: r.created_at,
    };
  });
}

export function deleteChatMessage(messageId: string): void {
  const db = getDatabase();
  db.prepare(`DELETE FROM chat_messages WHERE id = ?`).run(messageId);
}

