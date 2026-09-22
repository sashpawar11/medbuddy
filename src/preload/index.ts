import { contextBridge, ipcRenderer } from 'electron';
import type { MedBuddyAPI, AIProgressEvent, AppLogEntry, SyncProgressEvent } from '../shared/types';

const api: MedBuddyAPI = {
  // Members
  listMembers: () => ipcRenderer.invoke('members:list'),
  createMember: (member) => ipcRenderer.invoke('members:create', member),
  updateMember: (id, updates) => ipcRenderer.invoke('members:update', id, updates),
  deleteMember: (id) => ipcRenderer.invoke('members:delete', id),

  // Folders
  listFolders: (memberId) => ipcRenderer.invoke('folders:list', memberId),
  createFolder: (memberId, name, parentFolderId) => ipcRenderer.invoke('folders:create', memberId, name, parentFolderId),
  deleteFolder: (id) => ipcRenderer.invoke('folders:delete', id),

  // Documents
  listDocuments: (folderId) => ipcRenderer.invoke('documents:list', folderId),
  importDocuments: (folderId, filePaths) => ipcRenderer.invoke('documents:import', folderId, filePaths),
  readDocumentData: (documentId) => ipcRenderer.invoke('documents:read', documentId),
  deleteDocument: (documentId) => ipcRenderer.invoke('documents:delete', documentId),
  openFileDialog: () => ipcRenderer.invoke('dialog:openFiles'),

  // AI Providers
  listProviders: () => ipcRenderer.invoke('ai:listProviders'),
  saveProvider: (profile) => ipcRenderer.invoke('ai:saveProvider', profile),
  testConnection: (profile) => ipcRenderer.invoke('ai:testConnection', profile),
  deleteProvider: (id) => ipcRenderer.invoke('ai:deleteProvider', id),

  // Analysis
  runAnalysis: (params) => ipcRenderer.invoke('analysis:run', params),
  getAnalysis: (id) => ipcRenderer.invoke('analysis:getById', id),
  listAnalyses: (limit) => ipcRenderer.invoke('analysis:listRecent', limit),
  onAIProgress: (callback: (event: AIProgressEvent) => void) => {
    const handler = (_: any, event: AIProgressEvent) => callback(event);
    ipcRenderer.on('ai:progress', handler);
    return () => {
      ipcRenderer.removeListener('ai:progress', handler);
    };
  },

  // Google Drive Sync
  getSyncSettings: () => ipcRenderer.invoke('sync:getSettings'),
  saveSyncSettings: (settings) => ipcRenderer.invoke('sync:saveSettings', settings),
  startGoogleOAuth: (params) => ipcRenderer.invoke('sync:startOAuth', params),
  disconnectGoogleDrive: () => ipcRenderer.invoke('sync:disconnect'),
  testDriveMount: (config) => ipcRenderer.invoke('sync:testMount', config),
  selectLocalMountFolder: () => ipcRenderer.invoke('sync:selectLocalMount'),
  startSync: (options) => ipcRenderer.invoke('sync:start', options),
  onSyncProgress: (callback: (event: SyncProgressEvent) => void) => {
    const handler = (_: any, event: SyncProgressEvent) => callback(event);
    ipcRenderer.on('sync:progress', handler);
    return () => {
      ipcRenderer.removeListener('sync:progress', handler);
    };
  },

  // Logs
  getLogs: (limit, category) => ipcRenderer.invoke('logs:list', limit, category),
  clearLogs: () => ipcRenderer.invoke('logs:clear'),
  onLogEmitted: (callback: (entry: AppLogEntry) => void) => {
    const handler = (_: any, entry: AppLogEntry) => callback(entry);
    ipcRenderer.on('log:emitted', handler);
    return () => {
      ipcRenderer.removeListener('log:emitted', handler);
    };
  },
};

contextBridge.exposeInMainWorld('medbuddy', api);
