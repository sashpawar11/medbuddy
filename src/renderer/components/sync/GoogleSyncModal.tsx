import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertOctagon,
  Folder,
  User,
  Users,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  Check,
  LogOut,
  FolderSync,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Database,
  FileText,
  Sparkles,
  Download,
  Upload,
} from 'lucide-react';
import type {
  FamilyMember,
  Folder as FolderType,
  GoogleSyncSettings,
  SyncProgressEvent,
  SyncResult,
  RestoreResult,
  SyncScope,
  SyncMountType,
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

const GoogleGIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const GoogleSyncModal: React.FC<Props> = ({
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
  const [settings, setSettings] = useState<GoogleSyncSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isTestingMount, setIsTestingMount] = useState(false);
  const [mountTestResult, setMountTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgressEvent | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Mode: Backup (App -> Drive) vs Restore (Drive -> App)
  const [operationMode, setOperationMode] = useState<'backup' | 'restore'>('backup');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);

  // Form State
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [mountType, setMountType] = useState<SyncMountType>('cloud');
  const [driveFolderName, setDriveFolderName] = useState('MedBuddy Vault');
  const [localMountPath, setLocalMountPath] = useState('');
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
        setClientIdInput(data.clientId || '');
        setClientSecretInput(data.clientSecret || '');
        setMountType(data.mountType || 'cloud');
        setDriveFolderName(data.driveFolderName || 'MedBuddy Vault');
        setLocalMountPath(data.localMountPath || '');

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

        if (data.isSignedIn) {
          setActiveStep(2);
        } else {
          setActiveStep(1);
        }
      } catch (err: any) {
        setError('Failed to load Google Drive sync settings');
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, [isOpen, initialScope, initialMemberId, initialFolderId, members]);

  // Subscribe to sync progress events
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = window.medbuddy.onSyncProgress((event) => {
      setSyncProgress(event);
      if (event.stage === 'completed' || event.stage === 'error') {
        setIsSyncing(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Google OAuth Handlers
  const handleSignIn = async (useDemo: boolean = false) => {
    try {
      setIsAuthenticating(true);
      setError(null);
      setSuccessMsg(null);

      if (!useDemo && !clientIdInput.trim()) {
        setError('Please enter your Google OAuth 2.0 Client ID to sign in. (Or click "Use Sandbox Demo Account" for local testing).');
        setIsAuthenticating(false);
        return;
      }

      const res = await window.medbuddy.startGoogleOAuth({
        clientId: clientIdInput.trim() || undefined,
        clientSecret: clientSecretInput.trim() || undefined,
        useDemo,
      });

      if (res.success && res.user) {
        const updated = await window.medbuddy.getSyncSettings();
        setSettings(updated);
        setSuccessMsg(`Signed in as ${res.user.email}`);
        setActiveStep(2);
      } else {
        setError(res.error || 'Google authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'OAuth error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await window.medbuddy.disconnectGoogleDrive();
      const updated = await window.medbuddy.getSyncSettings();
      setSettings(updated);
      setSuccessMsg('Disconnected from Google Drive');
      setActiveStep(1);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    }
  };

  // Mount Test & Save Handler
  const handleTestMount = async () => {
    try {
      setIsTestingMount(true);
      setMountTestResult(null);
      setError(null);

      const res = await window.medbuddy.testDriveMount({
        mountType,
        driveFolderName: driveFolderName.trim() || 'MedBuddy Vault',
        localMountPath: localMountPath.trim() || undefined,
      });

      setMountTestResult(res);
      if (res.success) {
        const updated = await window.medbuddy.getSyncSettings();
        setSettings(updated);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Mount verification failed');
    } finally {
      setIsTestingMount(false);
    }
  };

  const handleSelectLocalFolder = async () => {
    try {
      const folderPath = await window.medbuddy.selectLocalMountFolder();
      if (folderPath) {
        setLocalMountPath(folderPath);
        setMountType('local_mount');
      }
    } catch (err: any) {
      setError('Could not pick local directory');
    }
  };

  const toggleFolderSelection = (folderId: string) => {
    const next = new Set(selectedFolderIds);
    if (next.has(folderId)) next.delete(folderId);
    else next.add(folderId);
    setSelectedFolderIds(next);
  };

  const toggleSelectAllFoldersForMember = (memberFolders: FolderType[]) => {
    const allSelected = memberFolders.every((f) => selectedFolderIds.has(f.id));
    const next = new Set(selectedFolderIds);
    if (allSelected) {
      memberFolders.forEach((f) => next.delete(f.id));
    } else {
      memberFolders.forEach((f) => next.add(f.id));
    }
    setSelectedFolderIds(next);
  };

  const handleStartSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      setSyncResult(null);
      setSuccessMsg(null);

      await window.medbuddy.saveSyncSettings({
        mountType,
        driveFolderName: driveFolderName.trim() || 'MedBuddy Vault',
        localMountPath: localMountPath.trim() || null,
        syncScope,
        selectedMemberId: syncScope === 'profile' ? selectedMemberId : null,
        selectedFolderIds: syncScope === 'folders' ? Array.from(selectedFolderIds) : [],
      });

      const res = await window.medbuddy.startSync({
        scope: syncScope,
        memberId: syncScope === 'profile' ? selectedMemberId : undefined,
        folderIds: syncScope === 'folders' ? Array.from(selectedFolderIds) : undefined,
      });

      setSyncResult(res);
      const updated = await window.medbuddy.getSyncSettings();
      setSettings(updated);

      if (res.success) {
        setSuccessMsg(`Sync complete! ${res.syncedCount} uploaded, ${res.skippedCount} up-to-date.`);
        if (onSyncComplete) onSyncComplete(res);
      } else {
        setError(`Sync completed with issues: ${res.errors.join(', ')}`);
      }
    } catch (err: any) {
      setError(err.message || 'Sync operation failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      setError(null);
      setSuccessMsg(null);
      setRestoreResult(null);

      const res = await window.medbuddy.startRestore({
        mountType,
        driveFolderName,
        localMountPath: mountType === 'local_mount' ? localMountPath : undefined,
      });

      setRestoreResult(res);
      const updated = await window.medbuddy.getSyncSettings();
      setSettings(updated);

      if (res.success) {
        setSuccessMsg(
          `Vault restore complete! Restored ${res.restoredMembersCount} profiles, ${res.restoredFoldersCount} folders, ${res.restoredDocumentsCount} documents, and ${res.restoredAnalysesCount} analyses.`
        );
        if (onSyncComplete) onSyncComplete();
      } else {
        setError(`Restore completed with issues: ${res.errors.join(', ')}`);
        if (onSyncComplete) onSyncComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Restore operation failed');
    } finally {
      setIsRestoring(false);
    }
  };

  const totalVaultDocs = folders.reduce((acc, f) => acc + (f.document_count || 0), 0);
  const selectedMemberObj = members.find((m) => m.id === selectedMemberId);
  const selectedMemberFolders = folders.filter((f) => f.member_id === selectedMemberId);
  const selectedMemberDocsCount = selectedMemberFolders.reduce((acc, f) => acc + (f.document_count || 0), 0);
  const selectedFoldersCount = selectedFolderIds.size;
  const selectedFoldersDocsCount = folders
    .filter((f) => selectedFolderIds.has(f.id))
    .reduce((acc, f) => acc + (f.document_count || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface border border-border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-md overflow-hidden select-none font-sans animate-modal-enter">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-vault-50 text-vault-600 flex items-center justify-center">
              <Cloud className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-h2 font-semibold text-primary">Google Drive Backup</h2>
                {settings?.isSignedIn && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-medium bg-sage-100 text-sage-600 border border-sage-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-600" />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-caption text-secondary">
                Encrypted cloud backup with granular profile &amp; folder synchronization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-surface-recessed p-0.5 rounded-sm border border-border">
              <button
                type="button"
                onClick={() => setOperationMode('backup')}
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
                onClick={() => setOperationMode('restore')}
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

        {/* Workflow Step Navigation Tabs (§9.8) / Mode Indicator */}
        {operationMode === 'backup' ? (
          <div className="px-6 pt-2 pb-1 border-b border-border bg-surface-recessed flex items-center gap-1 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-small font-medium transition-colors ${
                activeStep === 1
                  ? 'bg-surface text-primary border border-border'
                  : 'text-tertiary hover:text-primary'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                settings?.isSignedIn ? 'bg-sage-600 text-white font-bold' : 'bg-surface-recessed border border-border'
              }`}>
                {settings?.isSignedIn ? '✓' : '1'}
              </span>
              <span>1. Authentication</span>
            </button>

            <span className="text-border-strong text-caption">›</span>

            <button
              onClick={() => setActiveStep(2)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-small font-medium transition-colors ${
                activeStep === 2
                  ? 'bg-surface text-primary border border-border'
                  : 'text-tertiary hover:text-primary'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-surface-recessed border border-border flex items-center justify-center text-[10px]">
                2
              </span>
              <span>2. Destination</span>
            </button>

            <span className="text-border-strong text-caption">›</span>

            <button
              onClick={() => setActiveStep(3)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-small font-medium transition-colors ${
                activeStep === 3
                  ? 'bg-surface text-primary border border-border'
                  : 'text-tertiary hover:text-primary'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-surface-recessed border border-border flex items-center justify-center text-[10px]">
                3
              </span>
              <span>3. Scope</span>
            </button>

            <span className="text-border-strong text-caption">›</span>

            <button
              onClick={() => setActiveStep(4)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-small font-medium transition-colors ${
                activeStep === 4
                  ? 'bg-surface text-primary border border-border'
                  : 'text-tertiary hover:text-primary'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-surface-recessed border border-border flex items-center justify-center text-[10px]">
                4
              </span>
              <span>4. Sync</span>
            </button>
          </div>
        ) : (
          <div className="px-6 py-2.5 border-b border-border bg-surface-recessed flex items-center gap-2 shrink-0">
            <Download className="w-4 h-4 text-vault-600" />
            <span className="text-small font-medium text-primary">
              Restore from {mountType === 'cloud' ? 'Google Drive' : 'Local Mount'} back into MedBuddy
            </span>
          </div>
        )}

        {/* Notifications & Status Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-sm bg-clay-100 border border-clay-300 text-clay-600 text-small flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError(null)} className="text-clay-600/70 hover:text-clay-600">
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-sm bg-sage-100 border border-sage-300 text-sage-600 text-small flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div className="flex-1">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)} className="text-sage-600/70 hover:text-sage-600">
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {operationMode === 'restore' ? (
            <div className="space-y-5">
              {!settings?.isSignedIn && mountType === 'cloud' ? (
                <div className="p-6 rounded-md bg-surface border border-border text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <AlertOctagon className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-body font-semibold text-primary">Google Drive Authentication Required</h3>
                  <p className="text-small text-secondary max-w-md mx-auto">
                    To restore your vault from Google Drive, please connect your Google account in the Backup tab first.
                  </p>
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        setOperationMode('backup');
                        setActiveStep(1);
                      }}
                    >
                      Go to Authentication
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-5 rounded-md bg-surface border border-border space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-sm bg-vault-50 text-vault-600 flex items-center justify-center shrink-0">
                        <Download className="w-5 h-5" strokeWidth={1.75} />
                      </div>
                      <div>
                        <h3 className="text-body font-semibold text-primary">
                          Restore Vault from {mountType === 'cloud' ? 'Google Drive' : 'Local Mount'}
                        </h3>
                        <p className="text-small text-secondary mt-0.5">
                          Download and reconstruct your family member profiles, folder organization, medical records, and AI summaries.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                      <div className="p-3 bg-surface-recessed rounded-sm border border-border">
                        <span className="text-caption text-secondary">Target Destination</span>
                        <p className="text-small font-medium text-primary font-mono truncate mt-0.5">
                          {mountType === 'cloud' ? driveFolderName : localMountPath || 'Not configured'}
                        </p>
                      </div>
                      <div className="p-3 bg-surface-recessed rounded-sm border border-border">
                        <span className="text-caption text-secondary">Connected Account</span>
                        <p className="text-small font-medium text-primary truncate mt-0.5">
                          {settings?.userEmail || (mountType === 'local_mount' ? 'Local Directory Mount' : 'Not signed in')}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-sm bg-vault-50/50 border border-vault-200/50 space-y-2">
                      <h4 className="text-small font-semibold text-vault-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-vault-600" strokeWidth={1.75} />
                        Safe Merge &amp; Deduplication
                      </h4>
                      <ul className="text-caption text-secondary space-y-1 list-disc list-inside leading-relaxed">
                        <li>Existing profiles and folders are matched and merged without duplication.</li>
                        <li>Documents already present locally are verified with SHA-256 and skipped to save bandwidth.</li>
                        <li>All AI analysis summaries and cached states are re-imported into clinical intelligence history.</li>
                      </ul>
                    </div>

                    {isRestoring && syncProgress && (
                      <div className="p-4 rounded-sm bg-surface-recessed border border-border space-y-2 animate-fade-in">
                        <div className="flex items-center justify-between text-caption font-medium">
                          <span className="text-primary">{syncProgress.message}</span>
                          <span className="text-vault-600 font-mono">{syncProgress.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-vault-500 h-1.5 rounded-full transition-all duration-300"
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

                    {restoreResult && (
                      <div
                        className={`p-4 rounded-sm border space-y-3 animate-fade-in ${
                          restoreResult.success
                            ? 'bg-sage-50/60 border-sage-200 text-sage-900'
                            : 'bg-clay-50/60 border-clay-200 text-clay-900'
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
                        {restoreResult.skippedDocumentsCount > 0 && (
                          <p className="text-[11px] text-secondary">
                            ℹ️ {restoreResult.skippedDocumentsCount} document(s) were already present locally and skipped.
                          </p>
                        )}
                        {restoreResult.errors.length > 0 && (
                          <div className="text-[11px] text-clay-600 space-y-0.5 pt-1">
                            {restoreResult.errors.map((err, i) => (
                              <p key={i}>• {err}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleRestore}
                        loading={isRestoring}
                        icon={<Download className="w-4 h-4" strokeWidth={1.75} />}
                      >
                        {isRestoring ? 'Restoring Vault...' : 'Start Vault Restore'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* STEP 1: Google OAuth Sign-In */}
          {activeStep === 1 && (
            <div className="space-y-5">
              <div className="p-4 rounded-md bg-surface-recessed border border-border flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                <div className="text-small text-secondary space-y-1">
                  <h4 className="font-semibold text-primary">Direct End-to-End Google Drive Transfer</h4>
                  <p className="leading-relaxed">
                    MedBuddy authenticates directly via OAuth 2.0. No intermediary proxy or tracking servers are involved.
                  </p>
                </div>
              </div>

              {settings?.isSignedIn ? (
                <div className="p-5 rounded-md bg-surface border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-medium uppercase tracking-wider text-tertiary">
                      Connected Google Account
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisconnect}
                      icon={<LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />}
                    >
                      Sign Out
                    </Button>
                  </div>

                  <div className="flex items-center gap-3.5">
                    {settings.userAvatar ? (
                      <img
                        src={settings.userAvatar}
                        alt="Profile"
                        className="w-11 h-11 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-vault-50 text-vault-600 flex items-center justify-center font-bold text-body border border-border">
                        {(settings.userName || 'G').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-body font-semibold text-primary">{settings.userName || 'Google Account'}</h3>
                      <p className="text-small text-secondary font-mono">{settings.userEmail}</p>
                      <span className="inline-flex items-center gap-1 text-caption text-sage-600 mt-1">
                        <Check className="w-3.5 h-3.5" strokeWidth={2} /> OAuth 2.0 Verified
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-end">
                    <Button variant="primary" size="md" onClick={() => setActiveStep(2)}>
                      Configure Destination →
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-5 rounded-md bg-surface border border-border space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-sm bg-vault-50 text-vault-600 flex items-center justify-center shrink-0">
                        <Cloud className="w-4 h-4" strokeWidth={1.75} />
                      </div>
                      <div>
                        <h3 className="text-body font-semibold text-primary">Authenticate with Google</h3>
                        <p className="text-small text-secondary mt-0.5">
                          Enter your Google Cloud OAuth Client ID and Secret to connect to Google Drive.
                          Your default browser will open securely for Google sign-in.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-border">
                      <div>
                        <label className="block text-small font-medium text-secondary mb-1">
                          Google OAuth 2.0 Client ID
                        </label>
                        <input
                          type="text"
                          value={clientIdInput}
                          onChange={(e) => setClientIdInput(e.target.value)}
                          onBlur={() => {
                            window.medbuddy.saveSyncSettings({ clientId: clientIdInput.trim() || null });
                          }}
                          placeholder="e.g. 1234567890-xyz.apps.googleusercontent.com"
                          className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-small font-medium text-secondary mb-1">
                          Client Secret <span className="text-tertiary font-normal">(Optional for Desktop)</span>
                        </label>
                        <input
                          type="password"
                          value={clientSecretInput}
                          onChange={(e) => setClientSecretInput(e.target.value)}
                          onBlur={() => {
                            window.medbuddy.saveSyncSettings({ clientSecret: clientSecretInput.trim() || null });
                          }}
                          placeholder="GOCSPX-..."
                          className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Button
                          variant="primary"
                          size="md"
                          onClick={() => handleSignIn(false)}
                          loading={isAuthenticating}
                          icon={<GoogleGIcon />}
                        >
                          Sign in with Google
                        </Button>
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => handleSignIn(true)}
                          disabled={isAuthenticating}
                        >
                          Use Sandbox Demo Account
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-border rounded-sm p-4 bg-surface-recessed space-y-2">
                    <div className="flex items-center gap-2 text-small font-semibold text-primary">
                      <HelpCircle className="w-4 h-4 text-tertiary" strokeWidth={1.75} />
                      <span>Creating your Google Cloud OAuth Client ID:</span>
                    </div>
                    <ol className="text-caption text-secondary list-decimal list-inside space-y-1 leading-relaxed">
                      <li>Visit the Google Cloud Console (<code>console.cloud.google.com</code>).</li>
                      <li>Go to <strong>APIs &amp; Services &gt; Credentials &gt; Create Credentials &gt; OAuth client ID</strong>.</li>
                      <li>Select Application type: <strong className="text-primary">Desktop app</strong> (Recommended — requires no redirect URI configuration).</li>
                      <li>In <strong>Enabled APIs &amp; Services</strong>, ensure <strong>Google Drive API</strong> is enabled.</li>
                      <li>Under <strong>OAuth consent screen &gt; Test users</strong>, add your Gmail account.</li>
                      <li>When signing in, check the box for <strong>Google Drive</strong> on Google's permission screen.</li>
                    </ol>
                    <p className="text-[11px] text-tertiary pt-1 border-t border-border">
                      💡 <strong>Fixing Error 400 (redirect_uri_mismatch):</strong> If your credential was created as a <em>Web application</em>, add <code>http://127.0.0.1:8585/oauth2callback</code> and <code>http://localhost:8585/oauth2callback</code> to <strong>Authorized redirect URIs</strong> in Google Cloud Console, or recreate it as a <strong>Desktop app</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Mount Location Destination */}
          {activeStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-body font-semibold text-primary">
                  Destination &amp; Sync Strategy
                </h3>
                <p className="text-small text-secondary">
                  Choose between direct Google Drive Cloud API synchronization or local directory mounting.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setMountType('cloud')}
                  className={`p-4 rounded-md border cursor-pointer transition-all ${
                    mountType === 'cloud'
                      ? 'bg-surface border-vault-600 shadow-sm'
                      : 'bg-surface border-border hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Cloud className={`w-5 h-5 ${mountType === 'cloud' ? 'text-vault-600' : 'text-tertiary'}`} strokeWidth={1.75} />
                    <input
                      type="radio"
                      name="mountType"
                      checked={mountType === 'cloud'}
                      onChange={() => setMountType('cloud')}
                      className="accent-vault-600"
                    />
                  </div>
                  <h4 className="text-body font-semibold text-primary">Google Drive Cloud Vault</h4>
                  <p className="text-caption text-secondary mt-1 leading-relaxed">
                    Direct sync via Google Drive API v3 without needing Google Drive desktop software installed.
                  </p>
                </div>

                <div
                  onClick={() => setMountType('local_mount')}
                  className={`p-4 rounded-md border cursor-pointer transition-all ${
                    mountType === 'local_mount'
                      ? 'bg-surface border-vault-600 shadow-sm'
                      : 'bg-surface border-border hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <HardDrive className={`w-5 h-5 ${mountType === 'local_mount' ? 'text-vault-600' : 'text-tertiary'}`} strokeWidth={1.75} />
                    <input
                      type="radio"
                      name="mountType"
                      checked={mountType === 'local_mount'}
                      onChange={() => setMountType('local_mount')}
                      className="accent-vault-600"
                    />
                  </div>
                  <h4 className="text-body font-semibold text-primary">Local Drive Folder Mount</h4>
                  <p className="text-caption text-secondary mt-1 leading-relaxed">
                    Uses Google Drive for Desktop's synchronized local folder for instant filesystem access.
                  </p>
                </div>
              </div>

              {mountType === 'cloud' ? (
                <div className="p-4 rounded-md bg-surface-recessed border border-border space-y-3">
                  <div>
                    <label className="block text-small font-medium text-secondary mb-1">
                      Remote Google Drive Vault Folder Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={driveFolderName}
                        onChange={(e) => setDriveFolderName(e.target.value)}
                        placeholder="e.g. MedBuddy Vault"
                        className="flex-1 h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35"
                      />
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={handleTestMount}
                        loading={isTestingMount}
                        icon={<Check className="w-3.5 h-3.5 text-sage-600" strokeWidth={2} />}
                      >
                        Verify Mount
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-md bg-surface-recessed border border-border space-y-3">
                  <div>
                    <label className="block text-small font-medium text-secondary mb-1">
                      Local Directory Path
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={localMountPath}
                        onChange={(e) => setLocalMountPath(e.target.value)}
                        placeholder="/Users/name/Google Drive/MedBuddy"
                        className="flex-1 h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35"
                      />
                      <Button variant="secondary" size="md" onClick={handleSelectLocalFolder}>
                        Browse…
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={handleTestMount}
                        loading={isTestingMount}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {mountTestResult && (
                <div
                  className={`p-3 rounded-sm border text-caption flex items-center gap-2 ${
                    mountTestResult.success
                      ? 'bg-sage-100 border-sage-300 text-sage-600'
                      : 'bg-clay-100 border-clay-300 text-clay-600'
                  }`}
                >
                  {mountTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.75} /> : <AlertOctagon className="w-4 h-4 shrink-0" strokeWidth={1.75} />}
                  <span>{mountTestResult.message}</span>
                </div>
              )}

              <div className="pt-3 flex items-center justify-between border-t border-border">
                <Button variant="ghost" size="md" onClick={() => setActiveStep(1)}>
                  ← Back to Account
                </Button>
                <Button variant="primary" size="md" onClick={() => setActiveStep(3)}>
                  Select Scope →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Sync Scope */}
          {activeStep === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-body font-semibold text-primary">
                  Select Scope to Synchronize
                </h3>
                <p className="text-small text-secondary">
                  Choose whether to backup the entire family vault, a single family profile, or select folders.
                </p>
              </div>

              <div className="space-y-3">
                {/* 1. All */}
                <div
                  onClick={() => setSyncScope('all')}
                  className={`p-4 rounded-md border cursor-pointer transition-all ${
                    syncScope === 'all'
                      ? 'bg-surface border-vault-600 shadow-sm'
                      : 'bg-surface border-border hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-vault-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                      <div>
                        <h4 className="text-body font-semibold text-primary">Sync All Profiles &amp; Folders</h4>
                        <p className="text-caption text-secondary mt-0.5">
                          Entire vault: {members.length} profiles, {folders.length} folders, {totalVaultDocs} records.
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="syncScope"
                      checked={syncScope === 'all'}
                      onChange={() => setSyncScope('all')}
                      className="accent-vault-600"
                    />
                  </div>
                </div>

                {/* 2. Specific Profile */}
                <div
                  onClick={() => setSyncScope('profile')}
                  className={`p-4 rounded-md border cursor-pointer transition-all ${
                    syncScope === 'profile'
                      ? 'bg-surface border-vault-600 shadow-sm'
                      : 'bg-surface border-border hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-vault-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                      <div>
                        <h4 className="text-body font-semibold text-primary">Sync Specific Family Profile</h4>
                        <p className="text-caption text-secondary mt-0.5">
                          Only folders and records belonging to a chosen family member.
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="syncScope"
                      checked={syncScope === 'profile'}
                      onChange={() => setSyncScope('profile')}
                      className="accent-vault-600"
                    />
                  </div>

                  {syncScope === 'profile' && (
                    <div className="pt-3 border-t border-border mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {members.map((m, idx) => {
                        const isChosen = selectedMemberId === m.id;
                        const mFolders = folders.filter((f) => f.member_id === m.id);
                        const mDocs = mFolders.reduce((acc, f) => acc + (f.document_count || 0), 0);
                        return (
                          <div
                            key={m.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMemberId(m.id);
                            }}
                            className={`p-2.5 rounded-sm border flex items-center gap-2.5 transition-colors ${
                              isChosen
                                ? 'bg-vault-50 border-vault-600 text-vault-600 font-semibold'
                                : 'bg-surface-recessed border-border text-secondary hover:text-primary'
                            }`}
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: m.avatar_color || MEMBER_AVATAR_COLORS[idx % MEMBER_AVATAR_COLORS.length] }}
                            >
                              {m.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-small truncate text-primary">{m.name}</div>
                              <div className="text-caption text-tertiary tabular-nums">{mDocs} records</div>
                            </div>
                            {isChosen && <Check className="w-3.5 h-3.5 text-vault-600 shrink-0" strokeWidth={2} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Specific Folders */}
                <div
                  onClick={() => setSyncScope('folders')}
                  className={`p-4 rounded-md border cursor-pointer transition-all ${
                    syncScope === 'folders'
                      ? 'bg-surface border-vault-600 shadow-sm'
                      : 'bg-surface border-border hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <FolderSync className="w-5 h-5 text-vault-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                      <div>
                        <h4 className="text-body font-semibold text-primary">Sync Specific Folders</h4>
                        <p className="text-caption text-secondary mt-0.5">
                          Pick individual categories (e.g. Bloodwork, Cardiology, Prescriptions).
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="syncScope"
                      checked={syncScope === 'folders'}
                      onChange={() => setSyncScope('folders')}
                      className="accent-vault-600"
                    />
                  </div>

                  {syncScope === 'folders' && (
                    <div className="pt-3 border-t border-border mt-3 space-y-3">
                      <div className="flex items-center justify-between text-caption text-secondary">
                        <span>Select folders to synchronize:</span>
                        <span className="font-mono text-primary font-medium tabular-nums">
                          {selectedFoldersCount} selected ({selectedFoldersDocsCount} records)
                        </span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {members.map((m) => {
                          const mFolders = folders.filter((f) => f.member_id === m.id);
                          if (mFolders.length === 0) return null;
                          return (
                            <div key={m.id} className="p-2.5 rounded-sm bg-surface-recessed border border-border space-y-2">
                              <div className="flex items-center justify-between border-b border-border pb-1.5">
                                <span className="text-small font-semibold text-primary">{m.name}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectAllFoldersForMember(mFolders);
                                  }}
                                  className="text-caption text-brand hover:underline"
                                >
                                  Toggle All
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {mFolders.map((f) => {
                                  const isChecked = selectedFolderIds.has(f.id);
                                  return (
                                    <label
                                      key={f.id}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`flex items-center justify-between p-2 rounded-sm border text-small cursor-pointer transition-colors ${
                                        isChecked
                                          ? 'bg-surface border-vault-500 text-primary font-medium'
                                          : 'bg-surface/50 border-border text-secondary hover:bg-surface hover:text-primary'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleFolderSelection(f.id)}
                                          className="accent-vault-600 rounded-sm"
                                        />
                                        <Folder className="w-3.5 h-3.5 text-tertiary shrink-0" strokeWidth={1.75} />
                                        <span className="truncate">{f.name}</span>
                                      </div>
                                      <span className="text-caption font-mono text-tertiary tabular-nums">
                                        {f.document_count || 0}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-border">
                <Button variant="ghost" size="md" onClick={() => setActiveStep(2)}>
                  ← Back to Destination
                </Button>
                <Button variant="primary" size="md" onClick={() => setActiveStep(4)}>
                  Review &amp; Execute →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Execution */}
          {activeStep === 4 && (
            <div className="space-y-5">
              <div className="p-4 rounded-md bg-surface-recessed border border-border space-y-3">
                <div className="flex items-center justify-between text-caption text-tertiary">
                  <span className="uppercase font-medium tracking-wider">Sync Scope Ready</span>
                  <span className="font-mono">{mountType === 'cloud' ? 'Direct Cloud API' : 'Local Directory Mount'}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 bg-surface rounded-sm border border-border">
                    <span className="text-caption text-tertiary block">Scope</span>
                    <span className="text-small font-semibold text-primary block capitalize">
                      {syncScope === 'all'
                        ? 'All Profiles'
                        : syncScope === 'profile'
                        ? `Profile: ${selectedMemberObj?.name || 'Selected'}`
                        : `${selectedFoldersCount} Folder(s)`}
                    </span>
                  </div>
                  <div className="p-2.5 bg-surface rounded-sm border border-border">
                    <span className="text-caption text-tertiary block">Target</span>
                    <span className="text-small font-semibold text-primary block truncate">
                      {mountType === 'cloud' ? driveFolderName : 'Local Drive'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-surface rounded-sm border border-border">
                    <span className="text-caption text-tertiary block">Payload</span>
                    <span className="text-small font-semibold text-vault-600 block tabular-nums">
                      {syncScope === 'all'
                        ? totalVaultDocs
                        : syncScope === 'profile'
                        ? selectedMemberDocsCount
                        : selectedFoldersDocsCount}{' '}
                      records
                    </span>
                  </div>
                </div>
              </div>

              {isSyncing && (
                <div className="p-4 rounded-md bg-surface border border-border space-y-3">
                  <div className="flex items-center justify-between text-small">
                    <span className="flex items-center gap-2 font-medium text-primary">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-vault-600" strokeWidth={1.75} />
                      {syncProgress?.message || 'Syncing records with Google Drive…'}
                    </span>
                    <span className="font-mono text-tertiary font-semibold tabular-nums">
                      {syncProgress?.progressPercent || 0}%
                    </span>
                  </div>

                  <div className="w-full bg-ink-200 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-vault-600 h-full transition-[width] duration-300 ease-out"
                      style={{ width: `${syncProgress?.progressPercent || 5}%` }}
                    />
                  </div>

                  {syncProgress?.currentFile && (
                    <p className="text-caption text-tertiary font-mono truncate">
                      Uploading: <span className="text-primary">{syncProgress.currentFile}</span>
                    </p>
                  )}
                </div>
              )}

              {syncResult && !isSyncing && (
                <div
                  className={`p-4 rounded-md border space-y-2 ${
                    syncResult.success
                      ? 'bg-sage-100 border-sage-300 text-primary'
                      : 'bg-clay-100 border-clay-300 text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {syncResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-sage-600" strokeWidth={1.75} />
                    ) : (
                      <AlertOctagon className="w-4 h-4 text-clay-600" strokeWidth={1.75} />
                    )}
                    <h4 className="text-body font-semibold">
                      {syncResult.success ? 'Google Drive Synchronized Successfully' : 'Sync Completed With Warnings'}
                    </h4>
                  </div>
                  <div className="text-caption text-secondary space-y-1.5 font-mono tabular-nums pt-1">
                    <div className="flex items-center justify-between py-0.5 border-b border-border/40">
                      <span>• Medical documents uploaded:</span>
                      <span className="text-primary font-semibold">{syncResult.syncedCount}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5 border-b border-border/40">
                      <span>• Health summaries (JSON) synced:</span>
                      <span className="text-teal-600 font-semibold">{syncResult.syncedSummariesCount ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5 border-b border-border/40">
                      <span>• App state & metadata cache:</span>
                      <span className="text-sage-600 font-semibold">{syncResult.syncedStateCount ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span>• Already up-to-date (deduplicated):</span>
                      <span className="text-primary font-semibold">
                        {syncResult.skippedCount + (syncResult.skippedSummariesCount || 0) + (syncResult.skippedStateCount || 0)}
                      </span>
                    </div>
                    {syncResult.failedCount > 0 && (
                      <div className="text-clay-600 font-semibold pt-1">• Failed items: {syncResult.failedCount}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-between border-t border-border">
                <Button variant="ghost" size="md" onClick={() => setActiveStep(3)} disabled={isSyncing}>
                  ← Back to Scope
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartSync}
                  loading={isSyncing}
                  icon={<Cloud className="w-4 h-4" strokeWidth={1.75} />}
                >
                  Sync to Drive Now
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
      </div>
    </div>
  );
};
