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
  getAppStateSnapshot,
} from '../src/main/db/database';
import { googleDriveSync, DEFAULT_GOOGLE_CLIENT_ID } from '../src/main/services/sync/googleDrive';
import { vault } from '../src/main/services/vault';
import type { SyncProgressEvent } from '../src/shared/types';

async function runSyncTests() {
  console.log('🧪 Starting MedBuddy Google Drive Sync Automated Tests...');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medbuddy-sync-test-'));
  const testDbPath = path.join(tempDir, 'test-medbuddy-sync.db');
  const tempVaultDir = path.join(tempDir, 'vault', 'documents');
  fs.mkdirSync(tempVaultDir, { recursive: true });

  // Initialize DB
  initDatabase(testDbPath);
  (vault as any).vaultDir = tempVaultDir;

  console.log(`📁 Test environment created at: ${tempDir}`);

  // 1. Initial Sync Settings
  const initialSettings = getSyncSettings();
  assert.strictEqual(initialSettings.provider, 'google_drive');
  assert.strictEqual(initialSettings.isSignedIn, false);
  assert.strictEqual(initialSettings.mountType, 'cloud');
  assert.strictEqual(initialSettings.syncScope, 'all');
  assert.strictEqual(initialSettings.driveFolderName, 'MedBuddy Vault');
  console.log('✅ Default Google Drive sync settings verified');

  // 2. Save & Retrieve Custom Settings
  const updatedSettings = saveSyncSettings({
    driveFolderName: 'Family Health Backup',
    syncScope: 'profile',
    autoSync: true,
  });
  assert.strictEqual(updatedSettings.driveFolderName, 'Family Health Backup');
  assert.strictEqual(updatedSettings.syncScope, 'profile');
  assert.strictEqual(updatedSettings.autoSync, true);
  console.log('✅ Sync settings persistence verified');

  // 3. OAuth Authentication (Demo Mode for Offline / Sandbox testing)
  const authRes = await googleDriveSync.startOAuth({ useDemo: true });
  assert.strictEqual(authRes.success, true);
  assert(authRes.user?.name.includes('Eleanor Vance'));
  const postAuthSettings = getSyncSettings();
  assert.strictEqual(postAuthSettings.isSignedIn, true);
  assert(postAuthSettings.userName?.includes('Eleanor Vance'));
  console.log('✅ Google OAuth sign-in flow verified');

  // 4. Drive Mounting Workflow
  // 4a. Cloud Mount Testing
  const cloudMountRes = await googleDriveSync.testDriveMount({
    mountType: 'cloud',
    driveFolderName: 'Family Health Backup',
  });
  assert.strictEqual(cloudMountRes.success, true);
  assert(cloudMountRes.folderId !== undefined);
  console.log('✅ Google Drive Cloud Vault mounting workflow verified');

  // 4b. Local Mount Testing
  const localMountDir = path.join(tempDir, 'GoogleDriveMount');
  const localMountRes = await googleDriveSync.testDriveMount({
    mountType: 'local_mount',
    localMountPath: localMountDir,
  });
  assert.strictEqual(localMountRes.success, true);
  assert(fs.existsSync(localMountDir), 'Local mount directory should be created');
  console.log('✅ Google Drive Local Directory mounting workflow verified');

  // 5. Seed Test Data (2 Family Members, 3 Folders, 4 Documents)
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
  googleDriveSync.setProgressCallback((event) => {
    progressLog.push(event);
  });

  // 6. Test Scope: "Specific Folders" (Sync ONLY Bloodwork folder)
  console.log('🔄 Executing sync with scope: specific folders (Bloodwork)...');
  const folderSyncRes = await googleDriveSync.startSync({
    scope: 'folders',
    folderIds: [folderBloodwork.id],
  });

  assert.strictEqual(folderSyncRes.success, true);
  assert.strictEqual(folderSyncRes.syncedCount, 2, 'Should sync exactly 2 bloodwork documents');
  assert.strictEqual(folderSyncRes.failedCount, 0);

  // Verify sync items recorded in SQLite
  const item1 = getSyncItem(doc1.id);
  assert.strictEqual(item1?.status, 'synced');
  assert.strictEqual(item1?.content_hash, 'hash_lipid_panel.pdf');

  const item2 = getSyncItem(doc2.id);
  assert.strictEqual(item2?.status, 'synced');

  // Ensure other documents were NOT synced
  const item3Pre = getSyncItem(doc3.id);
  assert.strictEqual(item3Pre, null, 'Cardiology document should not be synced in bloodwork folder scope');
  console.log('✅ Specific Folders scope sync verified');

  // 7. Test Incremental Sync Deduplication
  console.log('🔄 Re-running sync on same folder to verify incremental deduplication...');
  const dedupeSyncRes = await googleDriveSync.startSync({
    scope: 'folders',
    folderIds: [folderBloodwork.id],
  });
  assert.strictEqual(dedupeSyncRes.success, true);
  assert.strictEqual(dedupeSyncRes.syncedCount, 0, 'No new files should be uploaded');
  assert.strictEqual(dedupeSyncRes.skippedCount, 2, 'Both files should be skipped as up-to-date');
  console.log('✅ Incremental hash-based deduplication verified');

  // 8. Test Scope: "Specific Profile" (Sync Arthur Dent)
  console.log('🔄 Executing sync with scope: specific profile (Arthur Dent)...');
  const profileSyncRes = await googleDriveSync.startSync({
    scope: 'profile',
    memberId: mem2.id,
  });
  assert.strictEqual(profileSyncRes.success, true);
  assert.strictEqual(profileSyncRes.syncedCount, 1, 'Should sync Arthur Dent dental record');
  const item4 = getSyncItem(doc4.id);
  assert.strictEqual(item4?.status, 'synced');
  console.log('✅ Specific Profile scope sync verified');

  // 9. Test Scope: "All Profiles at Once" (Sync Entire Vault)
  console.log('🔄 Executing sync with scope: all profiles (entire vault)...');
  const allSyncRes = await googleDriveSync.startSync({
    scope: 'all',
  });
  assert.strictEqual(allSyncRes.success, true);
  // doc1, doc2, and doc4 are already synced, so only doc3 (Cardiology) is newly synced!
  assert.strictEqual(allSyncRes.syncedCount, 1, 'Only remaining un-synced document (ECG) should be uploaded');
  assert.strictEqual(allSyncRes.skippedCount, 3, '3 previously synced documents should be skipped');
  console.log('✅ All Profiles (Entire Vault) scope sync verified');

  // 10. Test Local Mount File Mirroring
  console.log('🔄 Testing Local Mount sync file structure mirroring...');
  saveSyncSettings({
    mountType: 'local_mount',
    localMountPath: localMountDir,
  });
  // Clear sync item for doc3 to force copy to local mount
  const localSyncRes = await googleDriveSync.startSync({
    scope: 'all',
  });
  assert.strictEqual(localSyncRes.success, true);
  // Check that files were created on disk in local mount folder: [localMountDir]/[Member]/[Folder]/[File]
  const expectedCopiedFile = path.join(localMountDir, 'Eleanor Vance', 'Cardiology Notes', 'ecg_summary.pdf');
  assert(fs.existsSync(expectedCopiedFile), `Expected local mount file to exist at: ${expectedCopiedFile}`);
  const content = fs.readFileSync(expectedCopiedFile, 'utf8');
  assert.strictEqual(content, 'Normal sinus rhythm');
  console.log('✅ Local Mount folder hierarchy mirroring verified');

  // 11. Test Health Summaries (JSON) and Application Cached State Sync
  console.log('🔄 Testing Generated Health Summaries (JSON) & Application State Cache Sync...');
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
    sourceDocuments: ['lipid_panel.pdf'],
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
  console.log('✅ Stored mock clinical analysis summary in SQLite');

  const summarySyncRes = await googleDriveSync.startSync({
    scope: 'all',
  });
  assert.strictEqual(summarySyncRes.success, true);
  assert.strictEqual(summarySyncRes.syncedSummariesCount, 1, 'Should sync 1 newly generated health summary');
  assert.strictEqual(summarySyncRes.syncedStateCount, 1, 'Should sync 1 updated app state cache');

  // Verify health summary JSON file created on disk in local mount
  const summariesDir = path.join(localMountDir, 'Eleanor Vance', 'Health Summaries');
  assert(fs.existsSync(summariesDir), `Expected Health Summaries directory to exist at: ${summariesDir}`);
  const summaryFiles = fs.readdirSync(summariesDir);
  assert(summaryFiles.length >= 1, 'Should have at least 1 summary JSON file');
  const summaryJsonPath = path.join(summariesDir, summaryFiles[0]);
  const parsedSummary = JSON.parse(fs.readFileSync(summaryJsonPath, 'utf-8'));
  assert.strictEqual(parsedSummary.type, 'health_summary');
  assert.strictEqual(parsedSummary.patient.name, 'Eleanor Vance');
  assert.strictEqual(parsedSummary.clinicalAnalysis.summary, mockAnalysis.summary);
  console.log('✅ Health summary JSON file structure and content verified');

  // Verify application state cache JSON on disk
  const stateCachePath = path.join(localMountDir, 'medbuddy_app_state_cache.json');
  assert(fs.existsSync(stateCachePath), `Expected app state cache file at: ${stateCachePath}`);
  const parsedState = JSON.parse(fs.readFileSync(stateCachePath, 'utf-8'));
  assert.strictEqual(parsedState.scope, 'all');
  assert(parsedState.vaultSummary.membersCount >= 2);
  assert(parsedState.vaultSummary.documentsCount >= 4);
  assert(parsedState.vaultSummary.analysesCount >= 1);
  console.log('✅ Application state and metadata cache JSON verified');

  // Verify deduplication on re-sync (both summary and state should be skipped)
  const dedupeSummariesRes = await googleDriveSync.startSync({
    scope: 'all',
  });
  assert.strictEqual(dedupeSummariesRes.syncedSummariesCount, 0, 'No new summaries should be synced');
  assert.strictEqual(dedupeSummariesRes.skippedSummariesCount, 1, 'Summary should be skipped as up-to-date');
  assert.strictEqual(dedupeSummariesRes.syncedStateCount, 0, 'No state cache changes should be re-synced');
  assert.strictEqual(dedupeSummariesRes.skippedStateCount, 1, 'App state should be skipped as up-to-date');
  console.log('✅ Incremental deduplication for health summaries and app state cache verified');

  // 12. Verify Pre-configured Google OAuth Configuration
  assert(typeof DEFAULT_GOOGLE_CLIENT_ID === 'string');
  assert(DEFAULT_GOOGLE_CLIENT_ID.includes('apps.googleusercontent.com'));
  console.log('✅ Pre-configured app OAuth Client ID verified');

  // 13. Disconnect Flow
  await googleDriveSync.disconnect();
  const finalSettings = getSyncSettings();
  assert.strictEqual(finalSettings.isSignedIn, false);
  console.log('✅ Google Drive disconnect flow verified');

  // 14. Fresh Install / Device Migration: Restore Vault from Backup
  console.log('🔄 Testing Fresh Install / Device Migration Restore from Vault...');
  const freshDbPath = path.join(tempDir, 'fresh-install.db');
  const freshVaultDir = path.join(tempDir, 'fresh_vault_docs');
  fs.mkdirSync(freshVaultDir, { recursive: true });

  // Switch database and vault storage to simulated fresh install
  closeDatabase();
  initDatabase(freshDbPath);
  (vault as any).vaultDir = freshVaultDir;

  const restoreRes = await googleDriveSync.startRestore({
    mountType: 'local_mount',
    localMountPath: localMountDir,
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
  console.log('✅ Physical document files downloaded and verified in new vault directory');

  // Test repeat restore deduplication
  const repeatRestoreRes = await googleDriveSync.startRestore({
    mountType: 'local_mount',
    localMountPath: localMountDir,
  });
  assert.strictEqual(repeatRestoreRes.success, true);
  assert.strictEqual(repeatRestoreRes.restoredDocumentsCount, 0, 'No new documents should be inserted');
  assert(repeatRestoreRes.skippedDocumentsCount >= 4, 'Existing documents should be skipped as up-to-date');
  console.log('✅ Incremental deduplication on repeated restore verified');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('🎉 ALL GOOGLE DRIVE SYNC & RESTORE INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runSyncTests().catch((err) => {
  console.error('❌ Sync tests failed:', err);
  process.exit(1);
});
