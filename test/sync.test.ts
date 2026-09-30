import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  initDatabase,
  closeDatabase,
  getSyncSettings,
  saveSyncSettings,
  createMember,
  createFolder,
  insertDocument,
  getSyncItem,
  storeAnalysisResult,
} from '../src/main/db/database';
import { localVaultSync } from '../src/main/services/sync/localVaultSync';
import { vault } from '../src/main/services/vault';
import type { SyncProgressEvent } from '../src/shared/types';

async function runSyncTests() {
  console.log('🧪 Starting MedBuddy Vault Backup & Sync Automated Tests...');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medbuddy-vault-test-'));
  const testDbPath = path.join(tempDir, 'test-medbuddy-sync.db');
  const tempVaultDir = path.join(tempDir, 'vault', 'documents');
  const backupVaultDir = path.join(tempDir, 'CloudVaultBackup');
  fs.mkdirSync(tempVaultDir, { recursive: true });
  fs.mkdirSync(backupVaultDir, { recursive: true });

  // Initialize DB
  initDatabase(testDbPath);
  (vault as any).vaultDir = tempVaultDir;

  console.log(`📁 Test environment created at: ${tempDir}`);

  // 1. Initial Sync Settings
  const initialSettings = getSyncSettings();
  assert.strictEqual(initialSettings.provider, 'local_folder');
  assert.strictEqual(initialSettings.mountType, 'local_folder');
  assert.strictEqual(initialSettings.syncScope, 'all');
  console.log('✅ Default Vault Backup settings verified');

  // 2. Configure Backup Vault Directory
  const mountTest = await localVaultSync.testFolder(backupVaultDir);
  assert.strictEqual(mountTest.success, true);
  assert(fs.existsSync(backupVaultDir));

  const updatedSettings = saveSyncSettings({
    backupPath: backupVaultDir,
    syncScope: 'all',
    autoSync: true,
  });
  assert.strictEqual(updatedSettings.backupPath, backupVaultDir);
  assert.strictEqual(updatedSettings.localMountPath, backupVaultDir);
  assert.strictEqual(updatedSettings.autoSync, true);
  console.log('✅ Backup Vault directory configuration & persistence verified');

  // 3. Seed Test Patient Data (2 Family Members, 3 Folders, 4 Documents)
  const mem1 = createMember({
    name: 'Eleanor Vance',
    relationship: 'Self',
    dob: '1984-06-12',
    avatar_color: '#57c1ff',
  });
  const mem2 = createMember({
    name: 'Arthur Dent',
    relationship: 'Spouse',
    dob: '1982-03-11',
    avatar_color: '#ffc533',
  });

  const folderBloodwork = createFolder(mem1.id, 'Bloodwork Panels', null);
  const folderCardiology = createFolder(mem1.id, 'Cardiology Notes', null);
  const folderDental = createFolder(mem2.id, 'Dental Records', null);

  // Helper to create dummy file in test vault
  const createTestDoc = (folderId: string, filename: string, content: string) => {
    const storageName = `test_${Date.now()}_${filename}`;
    fs.writeFileSync(path.join(tempVaultDir, storageName), content);
    return insertDocument({
      folder_id: folderId,
      filename,
      file_type: 'application/pdf',
      file_size: Buffer.byteLength(content),
      storage_path: storageName,
      content_hash: 'hash_' + filename,
      extracted_text: content,
    });
  };

  const doc1 = createTestDoc(folderBloodwork.id, 'lipid_panel.pdf', 'Cholesterol: 180');
  const doc2 = createTestDoc(folderBloodwork.id, 'metabolic_panel.pdf', 'Glucose: 90');
  const doc3 = createTestDoc(folderCardiology.id, 'ecg_summary.pdf', 'Normal sinus rhythm');
  const doc4 = createTestDoc(folderDental.id, 'cleaning_xray.pdf', 'Clean bite-wing');

  console.log('✅ Test patient records, folders, and mock physical files generated');

  // Track progress events
  const progressLog: SyncProgressEvent[] = [];
  localVaultSync.setProgressCallback((event) => {
    progressLog.push(event);
  });

  // 4. Test Scope: "Specific Folders" (Sync ONLY Bloodwork folder)
  console.log('🔄 Executing backup with scope: specific folders (Bloodwork)...');
  const folderSyncRes = await localVaultSync.startSync({
    scope: 'folders',
    folderIds: [folderBloodwork.id],
  });

  assert.strictEqual(folderSyncRes.success, true);
  assert.strictEqual(folderSyncRes.syncedCount, 2, 'Should back up exactly 2 bloodwork documents');
  assert.strictEqual(folderSyncRes.failedCount, 0);

  // Verify backup items recorded in SQLite
  const item1 = getSyncItem(doc1.id);
  assert.strictEqual(item1?.status, 'synced');
  assert.strictEqual(item1?.content_hash, 'hash_lipid_panel.pdf');

  const item2 = getSyncItem(doc2.id);
  assert.strictEqual(item2?.status, 'synced');

  // Ensure other documents were NOT backed up in this scope
  const item3Pre = getSyncItem(doc3.id);
  assert.strictEqual(item3Pre, null, 'Cardiology document should not be backed up in bloodwork folder scope');
  console.log('✅ Specific Folders scope backup verified');

  // 5. Test Incremental Backup Deduplication
  console.log('🔄 Re-running backup on same folder to verify incremental deduplication...');
  const dedupeSyncRes = await localVaultSync.startSync({
    scope: 'folders',
    folderIds: [folderBloodwork.id],
  });
  assert.strictEqual(dedupeSyncRes.success, true);
  assert.strictEqual(dedupeSyncRes.syncedCount, 0, 'No new files should be copied');
  assert.strictEqual(dedupeSyncRes.skippedCount, 2, 'Both files should be skipped as up-to-date');
  console.log('✅ Incremental hash-based deduplication verified');

  // 6. Test Scope: "Specific Profile" (Backup Arthur Dent)
  console.log('🔄 Executing backup with scope: specific profile (Arthur Dent)...');
  const profileSyncRes = await localVaultSync.startSync({
    scope: 'profile',
    memberId: mem2.id,
  });
  assert.strictEqual(profileSyncRes.success, true);
  assert.strictEqual(profileSyncRes.syncedCount, 1, 'Should back up Arthur Dent dental record');
  const item4 = getSyncItem(doc4.id);
  assert.strictEqual(item4?.status, 'synced');
  console.log('✅ Specific Profile scope backup verified');

  // 7. Test Scope: "All Profiles at Once" (Backup Entire Vault)
  console.log('🔄 Executing backup with scope: all profiles (entire vault)...');
  const allSyncRes = await localVaultSync.startSync({
    scope: 'all',
  });
  assert.strictEqual(allSyncRes.success, true);
  // doc1, doc2, and doc4 are already backed up, so only doc3 (Cardiology) is newly copied
  assert.strictEqual(allSyncRes.syncedCount, 1, 'Only remaining un-synced document (ECG) should be copied');
  assert.strictEqual(allSyncRes.skippedCount, 3, '3 previously backed up documents should be skipped');
  console.log('✅ All Profiles (Entire Vault) scope backup verified');

  // 8. Test Backup Folder Hierarchy Mirroring
  console.log('🔄 Verifying backup folder structure on disk...');
  const expectedCopiedFile = path.join(backupVaultDir, 'Eleanor Vance', 'Cardiology Notes', 'ecg_summary.pdf');
  assert(fs.existsSync(expectedCopiedFile), `Expected backup file to exist at: ${expectedCopiedFile}`);
  const content = fs.readFileSync(expectedCopiedFile, 'utf8');
  assert.strictEqual(content, 'Normal sinus rhythm');
  console.log('✅ Backup folder hierarchy mirroring ([Member]/[Folder]/[File]) verified');

  // 9. Test Health Summaries and Portable State Snapshot
  console.log('🔄 Testing Clinical Summaries & Application State Cache Backup...');
  const mockAnalysis = {
    schemaVersion: '1.0' as const,
    summary: 'Lipid panel indicates total cholesterol is well-controlled with normal fasting glucose.',
    metrics: [
      {
        name: 'Total Cholesterol',
        value: 180,
        unit: 'mg/dL',
        status: 'normal' as const,
        range: '125-200',
        interpretation: 'Optimal level',
      },
    ],
    flags: [],
    recommendations: ['Maintain current balanced diet and exercise regimen.'],
    extractedEntities: { medications: ['Atorvastatin 10mg'] },
    sourceDocuments: [{ id: doc1.id, filename: 'lipid_panel.pdf' }],
    confidence: 'high' as const,
  };

  const storedRecord = storeAnalysisResult(
    'test_bloodwork_analysis_cache_key',
    'folder',
    folderBloodwork.id,
    'profile_lm_studio',
    '1.0',
    mockAnalysis,
    [doc1.id, doc2.id]
  );
  assert(storedRecord.id, 'Stored analysis should have an ID');

  const summarySyncRes = await localVaultSync.startSync({
    scope: 'all',
  });
  assert.strictEqual(summarySyncRes.success, true);
  assert.strictEqual(summarySyncRes.syncedSummariesCount, 1);
  assert.strictEqual(summarySyncRes.syncedStateCount, 1);

  // Verify health summary JSON file created on disk in backup directory
  const summariesDir = path.join(backupVaultDir, 'Eleanor Vance', 'Health Summaries');
  assert(fs.existsSync(summariesDir), `Expected Health Summaries directory at: ${summariesDir}`);
  const summaryFiles = fs.readdirSync(summariesDir);
  assert(summaryFiles.length >= 1, 'Should have at least 1 summary JSON file');

  // Verify medbuddy_app_state_cache.json on disk
  const stateCachePath = path.join(backupVaultDir, 'medbuddy_app_state_cache.json');
  assert(fs.existsSync(stateCachePath), `Expected app state cache file at: ${stateCachePath}`);
  const parsedState = JSON.parse(fs.readFileSync(stateCachePath, 'utf-8'));
  assert(parsedState.members.length >= 2);
  assert(parsedState.documents.length >= 4);
  console.log('✅ Application state cache and health summaries verified');

  // Verify README_MEDBUDDY_BACKUP.txt
  const readmePath = path.join(backupVaultDir, 'README_MEDBUDDY_BACKUP.txt');
  assert(fs.existsSync(readmePath), 'Expected README_MEDBUDDY_BACKUP.txt to be generated');
  console.log('✅ Backup README text file verified');

  // 10. Fresh Install / Device Migration: Restore Vault from Backup
  console.log('🔄 Testing Fresh Install / Device Migration Restore from Vault Folder...');
  const freshDbPath = path.join(tempDir, 'fresh-install.db');
  const freshVaultDir = path.join(tempDir, 'fresh_vault_docs');
  fs.mkdirSync(freshVaultDir, { recursive: true });

  // Switch database and vault storage to simulated fresh install
  closeDatabase();
  initDatabase(freshDbPath);
  (vault as any).vaultDir = freshVaultDir;

  const restoreRes = await localVaultSync.startRestore({
    backupPath: backupVaultDir,
  });

  assert.strictEqual(restoreRes.success, true, 'Restore operation should succeed');
  assert(restoreRes.restoredMembersCount >= 2, `Expected >= 2 members, got ${restoreRes.restoredMembersCount}`);
  assert(restoreRes.restoredFoldersCount >= 2, `Expected >= 2 folders, got ${restoreRes.restoredFoldersCount}`);
  assert(restoreRes.restoredDocumentsCount >= 4, `Expected >= 4 documents, got ${restoreRes.restoredDocumentsCount}`);
  assert(restoreRes.restoredAnalysesCount >= 1, `Expected >= 1 analyses, got ${restoreRes.restoredAnalysesCount}`);
  console.log('✅ Fresh install metadata restored successfully into SQLite');

  // Check physical files in the fresh vault directory
  const restoredVaultFiles = fs.readdirSync(freshVaultDir);
  assert(restoredVaultFiles.length >= 4, `Expected >= 4 physical files in vault, found ${restoredVaultFiles.length}`);
  console.log('✅ Physical document files restored and verified in fresh vault directory');

  // Test repeat restore deduplication
  const repeatRestoreRes = await localVaultSync.startRestore({
    backupPath: backupVaultDir,
  });
  assert.strictEqual(repeatRestoreRes.success, true);
  assert.strictEqual(repeatRestoreRes.restoredDocumentsCount, 0, 'No new documents should be inserted');
  assert(repeatRestoreRes.skippedDocumentsCount >= 4, 'Existing documents should be skipped as up-to-date');
  console.log('✅ Incremental deduplication on repeated restore verified');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('🎉 ALL VAULT BACKUP & RESTORE INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runSyncTests().catch((err) => {
  console.error('❌ Sync tests failed:', err);
  process.exit(1);
});
