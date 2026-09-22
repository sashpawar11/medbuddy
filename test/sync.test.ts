import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  initDatabase,
  getSyncSettings,
  saveSyncSettings,
  createMember,
  createFolder,
  insertDocument,
  getSyncItem,
} from '../src/main/db/database';
import { googleDriveSync } from '../src/main/services/sync/googleDrive';
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

  // 11. Disconnect Flow
  await googleDriveSync.disconnect();
  const finalSettings = getSyncSettings();
  assert.strictEqual(finalSettings.isSignedIn, false);
  console.log('✅ Google Drive disconnect flow verified');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('🎉 ALL GOOGLE DRIVE SYNC INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runSyncTests().catch((err) => {
  console.error('❌ Sync tests failed:', err);
  process.exit(1);
});
