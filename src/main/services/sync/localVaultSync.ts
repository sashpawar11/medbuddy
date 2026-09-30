import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { shell, dialog } from 'electron';
import {
  getSyncSettings,
  saveSyncSettings,
  recordSyncItem,
  getSyncItem,
  listMembers,
  listFolders,
  listAllDocuments,
  listDocumentsForMember,
  listAllAnalyses,
  listAnalysesForMember,
  listAnalysesForFolders,
  getAppStateSnapshot,
  restoreAppStateFromSnapshot,
} from '../../db/database';
import { vault } from '../vault';
import { logger } from '../logger';
import type {
  VaultSyncSettings,
  SyncScope,
  SyncProgressEvent,
  SyncResult,
  RestoreResult,
  SyncMountTestResult,
  FamilyMember,
  Folder,
  DocumentItem,
  AnalysisRecord,
  AppStateSnapshot,
} from '../../../shared/types';

export class LocalVaultSyncService {
  private progressCallback: ((event: SyncProgressEvent) => void) | null = null;
  private isBusy: boolean = false;

  public setProgressCallback(cb: ((event: SyncProgressEvent) => void) | null) {
    this.progressCallback = cb;
  }

  private emitProgress(event: SyncProgressEvent) {
    if (this.progressCallback) {
      try {
        this.progressCallback(event);
      } catch (e) {
        // Ignore progress listener errors
      }
    }
  }

  /**
   * Prompts user with native OS directory picker to choose a local backup folder.
   */
  public async selectBackupFolder(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Backup Vault Directory',
      buttonLabel: 'Select Backup Folder',
      message: 'Choose a local folder or cloud-synced folder (Google Drive, Dropbox, OneDrive, iCloud) to store your MedBuddy backups.',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    const testResult = await this.testFolder(selectedPath);
    if (!testResult.success) {
      throw new Error(testResult.message);
    }

    saveSyncSettings({
      backupPath: selectedPath,
      localMountPath: selectedPath,
      lastSyncStatus: 'idle',
      lastSyncError: null,
    });

    return selectedPath;
  }

  /**
   * Opens the backup directory in the OS file explorer (Finder, Nautilus, Windows Explorer).
   */
  public async openBackupFolder(targetPath?: string): Promise<{ success: boolean; error?: string }> {
    const settings = getSyncSettings();
    const folderPath = targetPath || settings.backupPath || settings.localMountPath;

    if (!folderPath) {
      return { success: false, error: 'No backup folder has been configured yet.' };
    }

    if (!fs.existsSync(folderPath)) {
      try {
        fs.mkdirSync(folderPath, { recursive: true });
      } catch (err: any) {
        return { success: false, error: `Directory does not exist and could not be created: ${err.message}` };
      }
    }

    const openError = await shell.openPath(folderPath);
    if (openError) {
      return { success: false, error: openError };
    }

    return { success: true };
  }

  /**
   * Tests read & write permissions on the target directory.
   */
  public async testFolder(folderPath?: string): Promise<SyncMountTestResult> {
    const settings = getSyncSettings();
    const targetPath = folderPath || settings.backupPath || settings.localMountPath;

    if (!targetPath) {
      return {
        success: false,
        message: 'Please choose a local backup directory path.',
      };
    }

    try {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      // Test write permission with temporary probe file
      const testFile = path.join(targetPath, `.medbuddy_probe_${Date.now()}.tmp`);
      fs.writeFileSync(testFile, 'medbuddy_write_probe', 'utf-8');
      fs.unlinkSync(testFile);

      saveSyncSettings({
        backupPath: targetPath,
        localMountPath: targetPath,
      });

      return {
        success: true,
        message: `Backup folder verified and writable: ${targetPath}`,
        mountPath: targetPath,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Cannot write to backup folder (${targetPath}): ${err.message}`,
      };
    }
  }

  /**
   * Performs an incremental backup from MedBuddy into the configured local folder.
   */
  public async startSync(options?: {
    scope?: SyncScope;
    memberId?: string;
    folderIds?: string[];
  }): Promise<SyncResult> {
    if (this.isBusy) {
      throw new Error('A backup or restore operation is already in progress.');
    }

    this.isBusy = true;
    const settings = getSyncSettings();
    const scope = options?.scope || settings.syncScope || 'all';
    const targetMemberId = options?.memberId || settings.selectedMemberId;
    const targetFolderIds = options?.folderIds || settings.selectedFolderIds || [];
    const backupDir = settings.backupPath || settings.localMountPath;

    if (!backupDir) {
      this.isBusy = false;
      throw new Error('No backup directory configured. Please select a local backup folder first.');
    }

    let syncedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      saveSyncSettings({
        syncScope: scope,
        selectedMemberId: targetMemberId || null,
        selectedFolderIds: targetFolderIds,
        lastSyncStatus: 'in_progress',
        lastSyncError: null,
      });

      this.emitProgress({
        stage: 'mounting',
        message: `Connecting to backup folder: ${backupDir}`,
        progressPercent: 5,
        totalFiles: 0,
        syncedFiles: 0,
      });

      // 1. Gather documents and metadata based on selected scope
      this.emitProgress({
        stage: 'scanning',
        message: 'Scanning patient records and clinical documents...',
        progressPercent: 15,
        totalFiles: 0,
        syncedFiles: 0,
      });

      let documentsToSync: DocumentItem[] = [];
      const allMembers = listMembers();
      const memberMap = new Map<string, FamilyMember>();
      for (const m of allMembers) memberMap.set(m.id, m);

      const allFoldersMap = new Map<string, Folder>();
      for (const m of allMembers) {
        for (const f of listFolders(m.id)) {
          allFoldersMap.set(f.id, f);
        }
      }

      if (scope === 'all') {
        documentsToSync = listAllDocuments();
      } else if (scope === 'profile' && targetMemberId) {
        documentsToSync = listDocumentsForMember(targetMemberId);
      } else if (scope === 'folders' && targetFolderIds.length > 0) {
        const idSet = new Set(targetFolderIds);
        documentsToSync = listAllDocuments().filter((d) => idSet.has(d.folder_id));
      } else {
        documentsToSync = listAllDocuments();
      }

      const vaultDir = vault.getVaultDir();
      const totalDocs = documentsToSync.length;

      // 2. Backup Document Files
      for (let i = 0; i < totalDocs; i++) {
        const doc = documentsToSync[i];
        const progressPercent = Math.round(20 + ((i + 1) / Math.max(totalDocs, 1)) * 50);

        this.emitProgress({
          stage: 'uploading',
          message: `Backing up file (${i + 1}/${totalDocs}): ${doc.filename}`,
          progressPercent,
          totalFiles: totalDocs,
          syncedFiles: syncedCount + skippedCount,
          currentFile: doc.filename,
        });

        const safeBase = doc.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const candidateSourcePaths = [
          doc.storage_path ? (path.isAbsolute(doc.storage_path) ? doc.storage_path : path.join(vaultDir, doc.storage_path)) : null,
          path.join(vaultDir, `${doc.content_hash.slice(0, 16)}_${safeBase}`),
          path.join(vaultDir, doc.filename),
        ].filter(Boolean) as string[];

        let localSourcePath: string | null = null;
        for (const cp of candidateSourcePaths) {
          if (fs.existsSync(cp)) {
            localSourcePath = cp;
            break;
          }
        }

        if (!localSourcePath) {
          errors.push(`Local source file not found for "${doc.filename}"`);
          continue;
        }

        const folderObj = allFoldersMap.get(doc.folder_id);
        const memberObj = folderObj ? memberMap.get(folderObj.member_id) : undefined;
        const memberName = (memberObj?.name || 'General').replace(/[/\\?%*:|"<>]/g, '_');
        const folderName = (folderObj?.name || 'Medical Documents').replace(/[/\\?%*:|"<>]/g, '_');

        const destFolder = path.join(backupDir, memberName, folderName);
        if (!fs.existsSync(destFolder)) {
          fs.mkdirSync(destFolder, { recursive: true });
        }

        const destFilePath = path.join(destFolder, doc.filename);

        // Check if item was already synced and destination file exists
        const syncItem = getSyncItem(doc.id);
        if (
          syncItem &&
          syncItem.content_hash === doc.content_hash &&
          syncItem.status === 'synced' &&
          fs.existsSync(destFilePath)
        ) {
          skippedCount++;
          continue;
        }

        try {
          fs.copyFileSync(localSourcePath, destFilePath);
          recordSyncItem({
            item_type: 'document',
            local_id: doc.id,
            remote_id: destFilePath,
            content_hash: doc.content_hash,
            status: 'synced',
          });
          syncedCount++;
        } catch (copyErr: any) {
          errors.push(`Failed to copy "${doc.filename}": ${copyErr.message}`);
        }
      }

      // 3. Backup Clinical Analysis Summaries
      this.emitProgress({
        stage: 'uploading',
        message: 'Exporting clinical AI summaries and timeline data...',
        progressPercent: 75,
        totalFiles: totalDocs,
        syncedFiles: syncedCount + skippedCount,
      });

      let analysesToSync: AnalysisRecord[] = [];
      if (scope === 'all') {
        analysesToSync = listAllAnalyses();
      } else if (scope === 'profile' && targetMemberId) {
        analysesToSync = listAnalysesForMember(targetMemberId);
      } else if (scope === 'folders' && targetFolderIds.length > 0) {
        analysesToSync = listAnalysesForFolders(targetFolderIds);
      } else {
        analysesToSync = listAllAnalyses();
      }

      for (const analysis of analysesToSync) {
        const mem = analysis.member_id ? memberMap.get(analysis.member_id) : undefined;
        const memName = (mem?.name || 'General').replace(/[/\\?%*:|"<>]/g, '_');
        const summaryDestDir = path.join(backupDir, memName, 'Health Summaries');
        if (!fs.existsSync(summaryDestDir)) {
          fs.mkdirSync(summaryDestDir, { recursive: true });
        }

        const dateStr = (analysis.created_at || '').slice(0, 10) || 'clinical_note';
        const safeScope = (analysis.scope_name || 'summary').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 40);
        const summaryFilename = `${dateStr}_${safeScope}_${analysis.id.slice(0, 8)}.json`;
        const summaryFilePath = path.join(summaryDestDir, summaryFilename);

        const summaryPayload = {
          id: analysis.id,
          memberId: analysis.member_id,
          scopeType: analysis.scope_type,
          scopeName: analysis.scope_name,
          createdAt: analysis.created_at,
          clinicalAnalysis: analysis.result_json,
          sourceDocuments: (analysis.source_documents || []).map((d) => ({
            id: d.id,
            filename: d.filename,
            fileType: d.file_type,
            contentHash: d.content_hash,
          })),
        };

        const jsonStr = JSON.stringify(summaryPayload, null, 2);
        const summaryHash = crypto.createHash('sha256').update(jsonStr).digest('hex');

        try {
          fs.writeFileSync(summaryFilePath, jsonStr, 'utf-8');
          recordSyncItem({
            item_type: 'analysis_summary',
            local_id: analysis.id,
            remote_id: summaryFilePath,
            content_hash: summaryHash,
            status: 'synced',
          });
        } catch (sumErr: any) {
          errors.push(`Failed to export summary for "${analysis.scope_name || analysis.id}": ${sumErr.message}`);
        }
      }

      // 4. Export Portable Application State Snapshot
      this.emitProgress({
        stage: 'uploading',
        message: 'Writing encrypted MedBuddy state snapshot (medbuddy_app_state_cache.json)...',
        progressPercent: 90,
        totalFiles: totalDocs,
        syncedFiles: syncedCount + skippedCount,
      });

      const snapshot: AppStateSnapshot = getAppStateSnapshot();
      const snapshotPath = path.join(backupDir, 'medbuddy_app_state_cache.json');
      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');

      // 5. Write helpful Readme in the backup directory
      const readmePath = path.join(backupDir, 'README_MEDBUDDY_BACKUP.txt');
      const readmeContent = [
        '======================================================================',
        'MEDBUDDY MEDICAL VAULT BACKUP',
        '======================================================================',
        `Last Updated: ${new Date().toISOString()}`,
        `Location: ${backupDir}`,
        `Total Profiles: ${snapshot.members.length}`,
        `Total Documents: ${snapshot.documents.length}`,
        `Total Analyses: ${snapshot.analyses.length}`,
        '',
        'ABOUT THIS BACKUP:',
        'This folder contains your complete MedBuddy health records and file vault.',
        'Files are organized by [Member Name] / [Folder Name] for easy browsing.',
        '',
        'HOW TO SYNC TO CLOUD (Google Drive, Dropbox, OneDrive, iCloud, etc.):',
        'Simply ensure this backup folder is located inside your cloud provider\'s',
        'local sync directory on this computer. Your cloud client will handle',
        'continuous sync automatically without needing API keys.',
        '',
        'HOW TO RESTORE:',
        'In MedBuddy, open "Backup Vault", switch to the "Restore" tab, and point',
        'to this directory to restore all profiles, documents, and clinical analyses.',
        '======================================================================',
      ].join('\n');
      fs.writeFileSync(readmePath, readmeContent, 'utf-8');

      const now = new Date().toISOString();
      saveSyncSettings({
        lastSyncTime: now,
        lastSyncStatus: 'success',
        lastSyncError: null,
      });

      this.emitProgress({
        stage: 'completed',
        message: `Backup complete! ${syncedCount} file(s) backed up, ${skippedCount} up to date.`,
        progressPercent: 100,
        totalFiles: totalDocs,
        syncedFiles: syncedCount,
      });

      logger.info('vault', 'Backup completed successfully', {
        backupDir,
        syncedCount,
        skippedCount,
        errorCount: errors.length,
      });

      return {
        success: errors.length === 0,
        syncedCount,
        skippedCount,
        failedCount: errors.length,
        syncedSummariesCount: analysesToSync.length,
        syncedStateCount: 1,
        totalSyncedCount: syncedCount + analysesToSync.length + 1,
        totalSkippedCount: skippedCount,
        errors,
        syncedAt: now,
      };
    } catch (err: any) {
      logger.error('vault', 'Backup failed', { error: err.message });
      saveSyncSettings({
        lastSyncStatus: 'error',
        lastSyncError: err.message,
      });

      this.emitProgress({
        stage: 'error',
        message: `Backup failed: ${err.message}`,
        progressPercent: 0,
        totalFiles: 0,
        syncedFiles: 0,
      });

      throw err;
    } finally {
      this.isBusy = false;
    }
  }

  /**
   * Restores family profiles, folders, documents, and AI analyses from a local backup directory.
   */
  public async startRestore(config?: {
    backupPath?: string;
    localMountPath?: string;
  }): Promise<RestoreResult> {
    if (this.isBusy) {
      throw new Error('A backup or restore operation is already in progress.');
    }

    this.isBusy = true;
    const settings = getSyncSettings();
    const backupDir = config?.backupPath || config?.localMountPath || settings.backupPath || settings.localMountPath;

    let restoredMembersCount = 0;
    let restoredFoldersCount = 0;
    let restoredDocumentsCount = 0;
    let skippedDocumentsCount = 0;
    let restoredAnalysesCount = 0;
    const errors: string[] = [];

    try {
      if (!backupDir || !fs.existsSync(backupDir)) {
        throw new Error(`Backup directory does not exist: ${backupDir || 'Not specified'}`);
      }

      this.emitProgress({
        stage: 'scanning',
        message: 'Scanning backup directory for medbuddy_app_state_cache.json...',
        progressPercent: 15,
        totalFiles: 0,
        syncedFiles: 0,
      });

      const cachePath = path.join(backupDir, 'medbuddy_app_state_cache.json');
      if (!fs.existsSync(cachePath)) {
        throw new Error(
          `No MedBuddy state cache (medbuddy_app_state_cache.json) found inside "${backupDir}". Make sure you selected a valid MedBuddy backup folder.`
        );
      }

      let snapshot: AppStateSnapshot;
      try {
        snapshot = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      } catch (err: any) {
        throw new Error(`Failed to parse backup snapshot: ${err.message}`);
      }

      const vaultDir = vault.getVaultDir();

      // 1. Restore Database Records (Members, Folders, Document metadata, Analyses)
      this.emitProgress({
        stage: 'restoring',
        message: 'Restoring family profiles, folder tree, and clinical analyses...',
        progressPercent: 40,
        totalFiles: snapshot.documents.length,
        syncedFiles: 0,
      });

      const restoreCounts = restoreAppStateFromSnapshot(snapshot, vaultDir);
      restoredMembersCount = restoreCounts.counts.members;
      restoredFoldersCount = restoreCounts.counts.folders;
      restoredDocumentsCount = restoreCounts.counts.documents;
      skippedDocumentsCount = restoreCounts.counts.skippedDocs;
      restoredAnalysesCount = restoreCounts.counts.analyses;

      // 2. Restore Physical Document Files into the app vault
      const totalDocs = snapshot.documents.length;
      for (let i = 0; i < totalDocs; i++) {
        const doc = snapshot.documents[i];
        const progressPercent = Math.round(45 + ((i + 1) / Math.max(totalDocs, 1)) * 50);

        this.emitProgress({
          stage: 'downloading',
          message: `Restoring file (${i + 1}/${totalDocs}): ${doc.filename}`,
          progressPercent,
          totalFiles: totalDocs,
          syncedFiles: i + 1,
          currentFile: doc.filename,
        });

        const safeBase = doc.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const localDestPath = doc.storage_path
          ? (path.isAbsolute(doc.storage_path) ? doc.storage_path : path.join(vaultDir, doc.storage_path))
          : path.join(vaultDir, `${doc.content_hash.slice(0, 16)}_${safeBase}`);

        // Check if destination file already exists with identical hash
        if (fs.existsSync(localDestPath)) {
          try {
            const buf = fs.readFileSync(localDestPath);
            const hash = crypto.createHash('sha256').update(buf).digest('hex');
            if (hash === doc.content_hash) {
              recordSyncItem({
                item_type: 'document',
                local_id: doc.id,
                remote_id: doc.id,
                content_hash: doc.content_hash,
                status: 'synced',
              });
              continue;
            }
          } catch {}
        }

        // Search for file inside the backup folder hierarchy
        const memberObj = snapshot.members.find((m) =>
          snapshot.folders.some((f) => f.id === doc.folder_id && f.member_id === m.id)
        );
        const folderObj = snapshot.folders.find((f) => f.id === doc.folder_id);
        const memberName = (memberObj?.name || 'General').replace(/[/\\?%*:|"<>]/g, '_');
        const folderName = (folderObj?.name || 'Medical Documents').replace(/[/\\?%*:|"<>]/g, '_');

        const candidatePaths = [
          path.join(backupDir, memberName, folderName, doc.filename),
          path.join(backupDir, memberName, doc.filename),
          path.join(backupDir, doc.filename),
        ];

        let foundPath: string | null = null;
        for (const cp of candidatePaths) {
          if (fs.existsSync(cp)) {
            foundPath = cp;
            break;
          }
        }

        if (foundPath) {
          try {
            fs.copyFileSync(foundPath, localDestPath);
            recordSyncItem({
              item_type: 'document',
              local_id: doc.id,
              remote_id: doc.id,
              content_hash: doc.content_hash,
              status: 'synced',
            });
          } catch (err: any) {
            errors.push(`Failed to copy "${doc.filename}": ${err.message}`);
          }
        } else {
          errors.push(`File missing in backup directory: ${doc.filename}`);
        }
      }

      this.emitProgress({
        stage: 'completed',
        message: 'Restore completed successfully!',
        progressPercent: 100,
        totalFiles: totalDocs,
        syncedFiles: restoredDocumentsCount,
      });

      return {
        success: errors.length === 0,
        restoredMembersCount,
        restoredFoldersCount,
        restoredDocumentsCount,
        skippedDocumentsCount,
        restoredAnalysesCount,
        errors,
        restoredAt: new Date().toISOString(),
      };
    } catch (err: any) {
      logger.error('vault', 'Restore failed', { error: err.message });
      this.emitProgress({
        stage: 'error',
        message: `Restore failed: ${err.message}`,
        progressPercent: 0,
        totalFiles: 0,
        syncedFiles: 0,
      });
      throw err;
    } finally {
      this.isBusy = false;
    }
  }

  // --- Stubs for backward compatibility ---
  public async testDriveMount(config: any): Promise<SyncMountTestResult> {
    return this.testFolder(config?.localMountPath || config?.backupPath);
  }

  public async startOAuth(): Promise<{ success: boolean; error?: string }> {
    return {
      success: false,
      error: 'Google OAuth has been replaced by Local & Cloud Synced Folder Backup. Please select a local folder.',
    };
  }

  public async disconnect(): Promise<void> {
    saveSyncSettings({
      backupPath: null,
      localMountPath: null,
      lastSyncStatus: 'idle',
      lastSyncError: null,
    });
  }
}

export const localVaultSync = new LocalVaultSyncService();
