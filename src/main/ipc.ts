import { ipcMain, dialog, BrowserWindow } from 'electron';
import {
  listMembers,
  createMember,
  updateMember,
  deleteMember,
  listFolders,
  createFolder,
  deleteFolder,
  listDocuments,
  listProviders,
  saveProvider,
  deleteProvider,
  getAnalysisById,
  listRecentAnalyses,
  deleteAnalysisById,
  listAppLogs,
  clearAppLogs,
  getSyncSettings,
  saveSyncSettings,
  updateDocumentOcrStatus,
  updateDocumentsMetadata,
} from './db/database';
import { vault } from './services/vault';
import { aiProvider } from './services/ai/provider';
import { orchestrator } from './services/ai/orchestrator';
import { documentOrganizer } from './services/ai/organizer';
import { logger } from './services/logger';
import { googleDriveSync } from './services/sync/googleDrive';
import { ocrQueue } from './services/ocrQueue';

export function registerIpcHandlers() {
  // --- Members ---
  ipcMain.handle('members:list', async () => {
    return listMembers();
  });

  ipcMain.handle('members:create', async (_, member) => {
    return createMember(member);
  });

  ipcMain.handle('members:update', async (_, id, updates) => {
    return updateMember(id, updates);
  });

  ipcMain.handle('members:delete', async (_, id) => {
    deleteMember(id);
    return true;
  });

  // --- Folders ---
  ipcMain.handle('folders:list', async (_, memberId) => {
    return listFolders(memberId);
  });

  ipcMain.handle('folders:create', async (_, memberId, name, parentFolderId) => {
    return createFolder(memberId, name, parentFolderId);
  });

  ipcMain.handle('folders:delete', async (_, id) => {
    deleteFolder(id);
    return true;
  });

  // --- Documents ---
  ipcMain.handle('documents:list', async (_, folderId) => {
    return listDocuments(folderId);
  });

  ipcMain.handle('documents:import', async (_, folderId, filePaths: string[]) => {
    const imported = [];
    for (const fp of filePaths) {
      try {
        const doc = await vault.importFile(fp, folderId);
        imported.push(doc);
        // Kick off background OCR immediately after the file is saved
        ocrQueue.enqueue(doc.id);
      } catch (err: any) {
        logger.error('vault', `Failed to import file: ${fp}`, { error: err.message });
      }
    }
    return imported;
  });

  // Re-run OCR on demand (right-click → "Re-run OCR")
  ipcMain.handle('documents:reRunOcr', async (_, documentId: string) => {
    updateDocumentOcrStatus(documentId, 'pending', null, null);
    ocrQueue.enqueue(documentId);
    return true;
  });

  ipcMain.handle('documents:read', async (_, documentId) => {
    return vault.readDocumentData(documentId);
  });

  ipcMain.handle('documents:delete', async (_, documentId) => {
    vault.deleteFile(documentId);
    return true;
  });

  ipcMain.handle('documents:organizePreview', async (_, documentIds: string[], providerProfileId?: string) => {
    return documentOrganizer.preview(documentIds, providerProfileId);
  });

  ipcMain.handle('documents:organizeApply', async (_, updates: Array<{ documentId: string; filename: string; tags: string[] }>) => {
    const dbUpdates = updates.map((u) => ({
      id: u.documentId,
      filename: u.filename,
      tags: u.tags,
    }));
    return updateDocumentsMetadata(dbUpdates);
  });

  ipcMain.handle('dialog:openFiles', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Medical Documents', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'txt'] },
        { name: 'PDF Reports', extensions: ['pdf'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled) return [];
    return result.filePaths;
  });

  // --- AI Providers ---
  ipcMain.handle('ai:listProviders', async () => {
    return listProviders();
  });

  ipcMain.handle('ai:saveProvider', async (_, profile) => {
    return saveProvider(profile);
  });

  ipcMain.handle('ai:testConnection', async (_, profile) => {
    return aiProvider.testConnection(profile);
  });

  ipcMain.handle('ai:deleteProvider', async (_, id) => {
    deleteProvider(id);
    return true;
  });

  // --- Analysis ---
  ipcMain.handle('analysis:run', async (_, params) => {
    return orchestrator.analyze(params);
  });

  ipcMain.handle('analysis:getById', async (_, id) => {
    return getAnalysisById(id);
  });

  ipcMain.handle('analysis:listRecent', async (_, limit) => {
    return listRecentAnalyses(limit);
  });

  ipcMain.handle('analysis:delete', async (_, id) => {
    return deleteAnalysisById(id);
  });

  // --- Logs ---
  ipcMain.handle('logs:list', async (_, limit, category) => {
    return listAppLogs(limit, category);
  });

  ipcMain.handle('logs:clear', async () => {
    clearAppLogs();
    return true;
  });

  // --- Google Drive Sync ---
  ipcMain.handle('sync:getSettings', async () => {
    return getSyncSettings();
  });

  ipcMain.handle('sync:saveSettings', async (_, settings) => {
    return saveSyncSettings(settings);
  });

  ipcMain.handle('sync:startOAuth', async (_, params) => {
    return googleDriveSync.startOAuth(params);
  });

  ipcMain.handle('sync:disconnect', async () => {
    await googleDriveSync.disconnect();
    return true;
  });

  ipcMain.handle('sync:testMount', async (_, config) => {
    return googleDriveSync.testDriveMount(config);
  });

  ipcMain.handle('sync:selectLocalMount', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Google Drive Sync Directory',
      buttonLabel: 'Mount Folder',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('sync:start', async (_, options) => {
    return googleDriveSync.startSync(options);
  });

  // Forward sync progress events to all browser windows
  googleDriveSync.setProgressCallback((event) => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('sync:progress', event);
      }
    }
  });

  // Forward OCR progress events to all browser windows
  ocrQueue.setProgressCallback((event) => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('ocr:progress', event);
      }
    }
  });

  logger.info('ipc', 'Registered all IPC channels successfully');
}
