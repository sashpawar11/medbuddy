import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertOctagon,
  Folder,
  FolderOpen,
  User,
  Users,
  HardDrive,
  ShieldCheck,
  Check,
  FolderSync,
  HelpCircle,
  Database,
  FileText,
  Download,
  Upload,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type {
  FamilyMember,
  Folder as FolderType,
  VaultSyncSettings,
  SyncProgressEvent,
  SyncResult,
  RestoreResult,
  SyncScope,
} from '../../../shared/types';
import { Button } from '../common/Button';
import { MEMBER_AVATAR_COLORS } from '../sidebar/MemberModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  folders: FolderType[];
  initialScope?: SyncScope;
  initialMemberId?: string;
  initialFolderId?: string;
  onSyncComplete?: (result?: SyncResult | RestoreResult) => void;
}

export const BackupVaultModal: React.FC<Props> = ({
  isOpen,
  onClose,
  members,
  folders,
  initialScope,
  initialMemberId,
  initialFolderId,
  onSyncComplete,
}) => {
  // Settings & Status State
  const [settings, setSettings] = useState<VaultSyncSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgressEvent | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Mode: Backup (App -> Folder) vs Restore (Folder -> App)
  const [operationMode, setOperationMode] = useState<'backup' | 'restore'>('backup');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);

  // Form State
  const [backupPath, setBackupPath] = useState('');
  const [syncScope, setSyncScope] = useState<SyncScope>('all');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  // Load sync settings on modal open
  useEffect(() => {
    if (!isOpen) return;

    const loadSettings = async () => {
      try {
        setLoadingSettings(true);
        const data = await window.medbuddy.getSyncSettings();
        setSettings(data);
        const currentPath = data.backupPath || data.localMountPath || '';
        setBackupPath(currentPath);

        if (initialScope) {
          setSyncScope(initialScope);
        } else {
          setSyncScope(data.syncScope || 'all');
        }

        if (initialMemberId) {
          setSelectedMemberId(initialMemberId);
        } else if (data.selectedMemberId) {
          setSelectedMemberId(data.selectedMemberId);
        } else if (members.length > 0) {
          setSelectedMemberId(members[0].id);
        }

        if (initialFolderId) {
          setSelectedFolderIds(new Set([initialFolderId]));
        } else if (data.selectedFolderIds && data.selectedFolderIds.length > 0) {
          setSelectedFolderIds(new Set(data.selectedFolderIds));
        }
      } catch (err: any) {
        setError('Failed to load backup vault settings');
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, [isOpen, initialScope, initialMemberId, initialFolderId, members]);

  // Subscribe to sync progress events
  useEffect(() => {
    if (!isOpen) return;

    const cleanup = window.medbuddy.onSyncProgress((event) => {
      setSyncProgress(event);
      if (event.stage === 'completed') {
        setIsSyncing(false);
        setIsRestoring(false);
      } else if (event.stage === 'error') {
        setIsSyncing(false);
        setIsRestoring(false);
        setError(event.message || 'Operation failed');
      }
    });

    return () => {
      cleanup();
    };
  }, [isOpen]);

  // Handlers
  const handleSelectFolder = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const selected = await (window.medbuddy.selectBackupFolder
        ? window.medbuddy.selectBackupFolder()
        : window.medbuddy.selectLocalMountFolder?.());

      if (selected) {
        setBackupPath(selected);
        const updated = await window.medbuddy.getSyncSettings();
        setSettings(updated);
        setSuccessMsg(`Backup folder set to: ${selected}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to select backup directory');
    }
  };

  const handleOpenFolder = async () => {
    if (!backupPath) return;
    try {
      if (window.medbuddy.openBackupFolder) {
        const res = await window.medbuddy.openBackupFolder(backupPath);
        if (!res.success && res.error) {
          setError(`Could not open folder: ${res.error}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Could not open folder in file manager');
    }
  };

  const handleToggleFolder = (folderId: string) => {
    const next = new Set(selectedFolderIds);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    setSelectedFolderIds(next);
  };

  const handleStartBackup = async () => {
    if (!backupPath) {
      setError('Please select a local backup folder first.');
      return;
    }

    if (syncScope === 'folders' && selectedFolderIds.size === 0) {
      setError('Please select at least one folder to backup.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setSyncResult(null);
    setIsSyncing(true);

    try {
      const result = await window.medbuddy.startSync({
        scope: syncScope,
        memberId: syncScope === 'profile' ? selectedMemberId : undefined,
        folderIds: syncScope === 'folders' ? Array.from(selectedFolderIds) : undefined,
      });

      setSyncResult(result);
      if (result.success) {
        setSuccessMsg(
          `Backup successful! ${result.syncedCount} file(s) backed up, ${result.skippedCount} already up to date.`
        );
        onSyncComplete?.(result);
      } else if (result.errors && result.errors.length > 0) {
        setError(`Backup completed with warnings: ${result.errors[0]}`);
      }
    } catch (err: any) {
      setError(err.message || 'Backup failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!backupPath) {
      setError('Please select a backup folder to restore from.');
      return;
    }

    if (!confirm('Restore health records, folder structures, and documents from this backup folder? Existing matching items will be safely preserved.')) {
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setRestoreResult(null);
    setIsRestoring(true);

    try {
      const result = await window.medbuddy.startRestore({
        backupPath,
        localMountPath: backupPath,
      });

      setRestoreResult(result);
      if (result.success) {
        setSuccessMsg(
          `Vault restored successfully! ${result.restoredMembersCount} profile(s), ${result.restoredFoldersCount} folder(s), and ${result.restoredDocumentsCount} document(s) imported.`
        );
        onSyncComplete?.(result);
      } else {
        setError('Restore completed with warnings. Check the details below.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to restore vault from backup folder');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-vault-50 dark:bg-vault-950/60 text-vault-600 dark:text-vault-400 flex items-center justify-center border border-vault-200/50 dark:border-vault-800/60 shrink-0">
              <FolderSync className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-h2 font-semibold text-primary">Vault Backup &amp; Sync</h2>
                {backupPath && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-medium bg-sage-100 dark:bg-sage-950/60 text-sage-600 dark:text-sage-400 border border-sage-300 dark:border-sage-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-600" />
                    Folder Configured
                  </span>
                )}
              </div>
              <p className="text-caption text-secondary">
                Continuous local backup with zero third-party cloud setup or OAuth required
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher: Backup vs Restore */}
            <div className="flex items-center bg-surface-recessed p-0.5 rounded-sm border border-border">
              <button
                type="button"
                onClick={() => {
                  setOperationMode('backup');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xs text-small font-medium transition-colors ${
                  operationMode === 'backup'
                    ? 'bg-surface text-primary shadow-xs font-semibold'
                    : 'text-tertiary hover:text-primary'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Backup</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOperationMode('restore');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xs text-small font-medium transition-colors ${
                  operationMode === 'restore'
                    ? 'bg-surface text-primary shadow-xs font-semibold'
                    : 'text-tertiary hover:text-primary'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-sm text-tertiary hover:text-primary hover:bg-surface-hover transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Notifications */}
          {error && (
            <div className="p-3 rounded-md bg-clay-50/70 dark:bg-clay-950/50 border border-clay-200 dark:border-clay-800 text-clay-700 dark:text-clay-300 text-small flex items-start gap-2.5 animate-fade-in">
              <AlertOctagon className="w-4 h-4 text-clay-600 dark:text-clay-400 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="flex-1 leading-snug">{error}</div>
              <button onClick={() => setError(null)} className="text-clay-500 hover:text-clay-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-md bg-sage-50/70 dark:bg-sage-950/50 border border-sage-200 dark:border-sage-800 text-sage-800 dark:text-sage-200 text-small flex items-start gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-sage-600 dark:text-sage-400 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="flex-1 leading-snug">{successMsg}</div>
              <button onClick={() => setSuccessMsg(null)} className="text-sage-500 hover:text-sage-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Section: Explanatory Banner */}
          <div className="p-4 rounded-md bg-surface-recessed border border-border flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-vault-600 dark:text-vault-400 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div className="text-small text-secondary space-y-1">
              <h4 className="font-semibold text-primary">Private, Local-First Data Storage</h4>
              <p className="leading-relaxed">
                MedBuddy writes your health files, profile hierarchies, and AI analyses directly into any folder you choose on your computer.
              </p>
              <p className="text-caption text-tertiary">
                <strong>Syncing to Cloud?</strong> Simply pick a folder inside your cloud provider&apos;s local sync folder (e.g. <em>Google Drive</em>, <em>Dropbox</em>, <em>OneDrive</em>, <em>iCloud Drive</em>, or <em>Nextcloud</em>). Your cloud desktop client automatically keeps it backed up and in sync across devices—no API keys or developer setup needed.
              </p>
            </div>
          </div>

          {/* Section: Backup Folder Location Picker */}
          <div className="p-5 rounded-md bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" strokeWidth={1.75} />
                <h3 className="text-body font-semibold text-primary">Backup Vault Location</h3>
              </div>
              <span className="text-caption text-tertiary">
                {backupPath ? 'Active Directory' : 'Action Required'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="flex-1 min-w-0 bg-surface-recessed px-3 py-2 rounded-sm border border-border flex items-center gap-2">
                <Folder className="w-4 h-4 text-tertiary shrink-0" strokeWidth={1.75} />
                <span className="text-small font-mono text-primary truncate select-all">
                  {backupPath || 'No backup folder selected yet'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSelectFolder}
                  icon={<FolderOpen className="w-3.5 h-3.5" strokeWidth={1.75} />}
                >
                  {backupPath ? 'Change Folder' : 'Choose Folder'}
                </Button>
                {backupPath && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleOpenFolder}
                    icon={<ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />}
                    title="Open in OS file manager"
                  >
                    Open Folder
                  </Button>
                )}
              </div>
            </div>

            {settings?.lastSyncTime && (
              <p className="text-[11px] text-tertiary pt-1 border-t border-border flex items-center gap-1.5">
                <span>Last successful backup:</span>
                <span className="font-medium text-secondary">
                  {new Date(settings.lastSyncTime).toLocaleString()}
                </span>
              </p>
            )}
          </div>

          {/* MODE 1: BACKUP WORKFLOW */}
          {operationMode === 'backup' && (
            <div className="space-y-4">
              {/* Scope Selection */}
              <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-body font-semibold text-primary">Backup Scope</h3>
                  <span className="text-caption text-secondary">Select what to synchronize</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSyncScope('all')}
                    className={`p-3 rounded-md border text-left transition-all ${
                      syncScope === 'all'
                        ? 'bg-vault-50/70 dark:bg-vault-950/60 border-vault-400 dark:border-vault-600 shadow-2xs'
                        : 'bg-surface border-border hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="w-4 h-4 text-vault-600 dark:text-vault-400" strokeWidth={1.75} />
                      <span className="text-small font-semibold text-primary">All Profiles</span>
                    </div>
                    <p className="text-[11px] text-secondary leading-snug">
                      Complete backup of all patients, folders, documents, and notes.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSyncScope('profile')}
                    className={`p-3 rounded-md border text-left transition-all ${
                      syncScope === 'profile'
                        ? 'bg-vault-50/70 dark:bg-vault-950/60 border-vault-400 dark:border-vault-600 shadow-2xs'
                        : 'bg-surface border-border hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-vault-600 dark:text-vault-400" strokeWidth={1.75} />
                      <span className="text-small font-semibold text-primary">Single Profile</span>
                    </div>
                    <p className="text-[11px] text-secondary leading-snug">
                      Back up one specific patient profile and their records.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSyncScope('folders')}
                    className={`p-3 rounded-md border text-left transition-all ${
                      syncScope === 'folders'
                        ? 'bg-vault-50/70 dark:bg-vault-950/60 border-vault-400 dark:border-vault-600 shadow-2xs'
                        : 'bg-surface border-border hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Folder className="w-4 h-4 text-vault-600 dark:text-vault-400" strokeWidth={1.75} />
                      <span className="text-small font-semibold text-primary">Select Folders</span>
                    </div>
                    <p className="text-[11px] text-secondary leading-snug">
                      Choose specific medical document folders to synchronize.
                    </p>
                  </button>
                </div>

                {/* Sub-selectors for profile or folders */}
                {syncScope === 'profile' && (
                  <div className="pt-2 border-t border-border space-y-2">
                    <label className="block text-small font-medium text-secondary">
                      Choose Patient Profile
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {members.map((mem) => {
                        const isSelected = selectedMemberId === mem.id;
                        return (
                          <button
                            key={mem.id}
                            type="button"
                            onClick={() => setSelectedMemberId(mem.id)}
                            className={`flex items-center gap-2.5 p-2 rounded-sm border text-left transition-colors ${
                              isSelected
                                ? 'bg-vault-50 dark:bg-vault-950/70 border-vault-500 text-primary font-medium'
                                : 'bg-surface-recessed border-border text-secondary hover:text-primary'
                            }`}
                          >
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: MEMBER_AVATAR_COLORS[0] }}
                            >
                              {mem.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="truncate text-small">{mem.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {syncScope === 'folders' && (
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-small font-medium text-secondary">Select Folders</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedFolderIds.size === folders.length) {
                            setSelectedFolderIds(new Set());
                          } else {
                            setSelectedFolderIds(new Set(folders.map((f) => f.id)));
                          }
                        }}
                        className="text-caption text-vault-600 dark:text-vault-400 hover:underline font-medium"
                      >
                        {selectedFolderIds.size === folders.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {folders.map((f) => {
                        const isChecked = selectedFolderIds.has(f.id);
                        return (
                          <label
                            key={f.id}
                            className={`flex items-center gap-2 p-2 rounded-xs border cursor-pointer text-small transition-colors ${
                              isChecked
                                ? 'bg-vault-50 dark:bg-vault-950/60 border-vault-400 text-primary font-medium'
                                : 'bg-surface-recessed border-border text-secondary hover:bg-surface-hover'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleFolder(f.id)}
                              className="rounded-xs border-border-strong text-vault-600 focus:ring-vault-500/30"
                            />
                            <Folder className="w-3.5 h-3.5 text-tertiary shrink-0" strokeWidth={1.75} />
                            <span className="truncate">{f.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time Progress Bar */}
              {isSyncing && syncProgress && (
                <div className="p-4 rounded-md bg-surface-recessed border border-border space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between text-caption">
                    <span className="font-semibold text-primary flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-vault-600 animate-spin" />
                      {syncProgress.message}
                    </span>
                    <span className="font-mono text-tertiary">{syncProgress.progressPercent}%</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-vault-600 rounded-full transition-all duration-200 ease-out"
                      style={{ width: `${syncProgress.progressPercent}%` }}
                    />
                  </div>

                  {syncProgress.currentFile && (
                    <p className="text-[11px] text-tertiary font-mono truncate">
                      File: {syncProgress.currentFile}
                    </p>
                  )}
                </div>
              )}

              {/* Backup Result Card */}
              {syncResult && (
                <div
                  className={`p-4 rounded-md border space-y-3 animate-fade-in ${
                    syncResult.success
                      ? 'bg-sage-50/60 dark:bg-sage-950/40 border-sage-200 dark:border-sage-800 text-sage-900 dark:text-sage-200'
                      : 'bg-clay-50/60 dark:bg-clay-950/40 border-clay-200 dark:border-clay-800 text-clay-900 dark:text-clay-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {syncResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-sage-600" strokeWidth={1.75} />
                    ) : (
                      <AlertOctagon className="w-4 h-4 text-clay-600" strokeWidth={1.75} />
                    )}
                    <span className="text-small font-semibold">
                      {syncResult.success ? 'Backup Completed Successfully' : 'Backup Finished with Warnings'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-caption">
                    <div className="bg-surface p-2 rounded-xs border border-border text-center">
                      <span className="text-secondary block text-[10px]">Files Copied</span>
                      <span className="font-bold font-mono text-small text-primary">
                        {syncResult.syncedCount}
                      </span>
                    </div>
                    <div className="bg-surface p-2 rounded-xs border border-border text-center">
                      <span className="text-secondary block text-[10px]">Up to Date</span>
                      <span className="font-bold font-mono text-small text-primary">
                        {syncResult.skippedCount}
                      </span>
                    </div>
                    <div className="bg-surface p-2 rounded-xs border border-border text-center">
                      <span className="text-secondary block text-[10px]">Clinical Summaries</span>
                      <span className="font-bold font-mono text-small text-primary">
                        {syncResult.syncedSummariesCount || 0}
                      </span>
                    </div>
                  </div>

                  {syncResult.errors.length > 0 && (
                    <div className="text-[11px] text-clay-600 dark:text-clay-400 space-y-0.5 pt-1">
                      {syncResult.errors.map((err, i) => (
                        <p key={i}>• {err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-2.5">
                <Button variant="secondary" size="md" onClick={onClose} disabled={isSyncing}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStartBackup}
                  loading={isSyncing}
                  disabled={!backupPath}
                  icon={<Upload className="w-4 h-4" strokeWidth={1.75} />}
                >
                  {isSyncing ? 'Backing Up Records...' : 'Back Up Now'}
                </Button>
              </div>
            </div>
          )}

          {/* MODE 2: RESTORE WORKFLOW */}
          {operationMode === 'restore' && (
            <div className="space-y-4">
              <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                <h3 className="text-body font-semibold text-primary">Restore from Backup Vault</h3>
                <p className="text-small text-secondary leading-relaxed">
                  MedBuddy will scan the selected folder for your backup snapshot (<code>medbuddy_app_state_cache.json</code>) and restore all profiles, folder hierarchies, clinical notes, and physical documents into your local app vault.
                </p>

                <div className="p-3 bg-surface-recessed rounded-sm border border-border text-caption text-secondary space-y-1">
                  <div className="font-semibold text-primary">What happens during restore:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-tertiary">
                    <li>Profiles and folder trees are safely merged or created.</li>
                    <li>Existing local files matching backup signatures are preserved without re-copying.</li>
                    <li>Missing or new documents from the backup are restored to your vault.</li>
                  </ul>
                </div>
              </div>

              {/* Real-time Progress Bar for Restore */}
              {isRestoring && syncProgress && (
                <div className="p-4 rounded-md bg-surface-recessed border border-border space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between text-caption">
                    <span className="font-semibold text-primary flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-vault-600 animate-spin" />
                      {syncProgress.message}
                    </span>
                    <span className="font-mono text-tertiary">{syncProgress.progressPercent}%</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-vault-600 rounded-full transition-all duration-200 ease-out"
                      style={{ width: `${syncProgress.progressPercent}%` }}
                    />
                  </div>

                  {syncProgress.currentFile && (
                    <p className="text-[11px] text-tertiary font-mono truncate">
                      File: {syncProgress.currentFile}
                    </p>
                  )}
                </div>
              )}

              {/* Restore Result Card */}
              {restoreResult && (
                <div
                  className={`p-4 rounded-md border space-y-3 animate-fade-in ${
                    restoreResult.success
                      ? 'bg-sage-50/60 dark:bg-sage-950/40 border-sage-200 dark:border-sage-800 text-sage-900 dark:text-sage-200'
                      : 'bg-clay-50/60 dark:bg-clay-950/40 border-clay-200 dark:border-clay-800 text-clay-900 dark:text-clay-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {restoreResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-sage-600" strokeWidth={1.75} />
                    ) : (
                      <AlertOctagon className="w-4 h-4 text-clay-600" strokeWidth={1.75} />
                    )}
                    <span className="text-small font-semibold">
                      {restoreResult.success ? 'Vault Restored Successfully' : 'Restore Completed with Warnings'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-caption">
                    <div className="bg-surface p-2 rounded-xs border border-border text-center">
                      <span className="text-secondary block text-[10px]">Profiles</span>
                      <span className="font-bold font-mono text-small text-primary">
                        {restoreResult.restoredMembersCount}
                      </span>
                    </div>
                    <div className="bg-surface p-2 rounded-xs border border-border text-center">
                      <span className="text-secondary block text-[10px]">Folders</span>
                      <span className="font-bold font-mono text-small text-primary">
                        {restoreResult.restoredFoldersCount}
                      </span>
                    </div>
                    <div className="bg-surface p-2 rounded-xs border border-border text-center">
                      <span className="text-secondary block text-[10px]">Documents</span>
                      <span className="font-bold font-mono text-small text-primary">
                        {restoreResult.restoredDocumentsCount}
                      </span>
                    </div>
                    <div className="bg-surface p-2 rounded-xs border border-border text-center">
                      <span className="text-secondary block text-[10px]">Analyses</span>
                      <span className="font-bold font-mono text-small text-primary">
                        {restoreResult.restoredAnalysesCount}
                      </span>
                    </div>
                  </div>

                  {restoreResult.errors.length > 0 && (
                    <div className="text-[11px] text-clay-600 dark:text-clay-400 space-y-0.5 pt-1">
                      {restoreResult.errors.map((err, i) => (
                        <p key={i}>• {err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Restore Action Buttons */}
              <div className="pt-2 flex justify-end gap-2.5">
                <Button variant="secondary" size="md" onClick={onClose} disabled={isRestoring}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleRestore}
                  loading={isRestoring}
                  disabled={!backupPath}
                  icon={<Download className="w-4 h-4" strokeWidth={1.75} />}
                >
                  {isRestoring ? 'Restoring Vault...' : 'Start Vault Restore'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
