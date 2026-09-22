import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Folder,
  User,
  Users,
  RefreshCw,
  FolderCheck,
  HardDrive,
  Key,
  ShieldCheck,
  Check,
  LogOut,
  FolderSync,
  HelpCircle,
} from 'lucide-react';
import type {
  FamilyMember,
  Folder as FolderType,
  GoogleSyncSettings,
  SyncProgressEvent,
  SyncResult,
  SyncScope,
  SyncMountType,
} from '../../../shared/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  folders: FolderType[];
  initialScope?: SyncScope;
  initialMemberId?: string;
  initialFolderId?: string;
  onSyncComplete?: (result: SyncResult) => void;
}

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

  // Form State
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [showAdvancedOAuth, setShowAdvancedOAuth] = useState(false);
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

        // Scope initialization
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

        // Auto-navigate to appropriate step
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
        setError('Please enter your Google OAuth 2.0 Client ID to sign in to your personal Google account. (Or click "Use Sandbox Demo Account" to test offline).');
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
      setError(err.message || 'Mount test failed');
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

  // Folder selection toggle
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

  // Start Sync Handler
  const handleStartSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      setSyncResult(null);
      setSuccessMsg(null);

      // Save sync settings before running
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

  // Statistics calculation for scope overview
  const totalVaultDocs = folders.reduce((acc, f) => acc + (f.document_count || 0), 0);
  const selectedMemberObj = members.find((m) => m.id === selectedMemberId);
  const selectedMemberFolders = folders.filter((f) => f.member_id === selectedMemberId);
  const selectedMemberDocsCount = selectedMemberFolders.reduce((acc, f) => acc + (f.document_count || 0), 0);
  const selectedFoldersCount = selectedFolderIds.size;
  const selectedFoldersDocsCount = folders
    .filter((f) => selectedFolderIds.has(f.id))
    .reduce((acc, f) => acc + (f.document_count || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-hairline rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Signature Red Hero Stripe Accent (Design.md) */}
        <div className="h-1 w-full hero-stripe-accent shrink-0" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-hairline flex items-center justify-center text-accent-blue">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-ink">Sync to Google Drive</h2>
                {settings?.isSignedIn && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-accent-green-soft text-accent-green border border-accent-green/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-[11px] text-mute">
                Encrypted cloud backup with granular profile & folder sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-mute hover:text-ink hover:bg-surface-elevated transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workflow Step Navigation Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-hairline bg-surface-elevated/30 flex items-center gap-1 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeStep === 1
                ? 'bg-surface-card text-ink border border-hairline shadow-sm'
                : 'text-mute hover:text-ink hover:bg-surface-elevated'
            }`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              settings?.isSignedIn ? 'bg-accent-green text-black font-bold' : 'bg-surface-elevated border border-hairline'
            }`}>
              {settings?.isSignedIn ? '✓' : '1'}
            </span>
            <span>1. Google Sign-In</span>
          </button>

          <span className="text-stone">›</span>

          <button
            onClick={() => setActiveStep(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeStep === 2
                ? 'bg-surface-card text-ink border border-hairline shadow-sm'
                : 'text-mute hover:text-ink hover:bg-surface-elevated'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-surface-elevated border border-hairline flex items-center justify-center text-[10px]">
              2
            </span>
            <span>2. Drive Mount Location</span>
          </button>

          <span className="text-stone">›</span>

          <button
            onClick={() => setActiveStep(3)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeStep === 3
                ? 'bg-surface-card text-ink border border-hairline shadow-sm'
                : 'text-mute hover:text-ink hover:bg-surface-elevated'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-surface-elevated border border-hairline flex items-center justify-center text-[10px]">
              3
            </span>
            <span>3. Sync Scope</span>
          </button>

          <span className="text-stone">›</span>

          <button
            onClick={() => setActiveStep(4)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeStep === 4
                ? 'bg-surface-card text-ink border border-hairline shadow-sm'
                : 'text-mute hover:text-ink hover:bg-surface-elevated'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-surface-elevated border border-hairline flex items-center justify-center text-[10px]">
              4
            </span>
            <span>4. Sync & Status</span>
          </button>
        </div>

        {/* Notifications & Status Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-accent-red-soft border border-hairline text-accent-red text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError(null)} className="text-accent-red/70 hover:text-accent-red">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-accent-green-soft border border-hairline text-accent-green text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)} className="text-accent-green/70 hover:text-accent-green">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Google OAuth Sign-In */}
          {activeStep === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 rounded-xl bg-surface-elevated border border-hairline flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-accent-green shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-semibold text-ink">Zero Third-Party Telemetry</h4>
                  <p className="text-mute leading-relaxed">
                    MedBuddy authenticates directly with Google via OAuth 2.0. Your medical records are transferred
                    directly between your computer and your personal Google Drive account.
                  </p>
                </div>
              </div>

              {settings?.isSignedIn ? (
                /* Signed-in Account Card */
                <div className="p-5 rounded-xl bg-surface-card border border-hairline space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-stone tracking-wider">
                      Connected Google Account
                    </span>
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-accent-red hover:bg-surface-elevated rounded border border-hairline transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>

                  {/* Warning banner if signed in as demo account */}
                  {(settings.userEmail?.includes('eleanor.vance') || settings.userEmail?.includes('demo')) && (
                    <div className="p-3 rounded-lg bg-accent-yellow/10 border border-accent-yellow/30 text-xs flex items-center justify-between gap-3 text-ink">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-accent-yellow shrink-0" />
                        <span className="text-mute">
                          Connected as <strong className="text-ink">Sandbox Demo Account</strong>. Sign out to connect your real personal Google account.
                        </span>
                      </div>
                      <button
                        onClick={handleDisconnect}
                        className="px-2.5 py-1 rounded bg-accent-yellow text-black font-semibold text-[11px] hover:opacity-90 shrink-0"
                      >
                        Sign Out & Connect Real Account
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3.5">
                    {settings.userAvatar ? (
                      <img
                        src={settings.userAvatar}
                        alt="Profile"
                        className="w-12 h-12 rounded-full border border-hairline object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center font-bold text-base border border-hairline">
                        {(settings.userName || 'G').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{settings.userName || 'Google Account'}</h3>
                      <p className="text-xs text-mute font-mono">{settings.userEmail}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] text-accent-green mt-1">
                        <Check className="w-3.5 h-3.5" /> OAuth 2.0 Verified
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-hairline flex justify-end">
                    <button
                      onClick={() => setActiveStep(2)}
                      className="px-4 py-2 text-xs font-semibold bg-primary text-primary-text hover:bg-primary-pressed rounded-md transition-colors"
                    >
                      Configure Drive Mount Location →
                    </button>
                  </div>
                </div>
              ) : (
                /* Not Signed-in Action Area */
                <div className="space-y-4">
                  <div className="p-6 rounded-xl bg-surface-card border border-hairline space-y-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-hairline flex items-center justify-center shrink-0 text-ink">
                        <Cloud className="w-5 h-5 text-accent-blue" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-ink">Sign In With Google Account</h3>
                        <p className="text-xs text-mute mt-1 leading-relaxed">
                          Enter your Google Cloud OAuth Client ID to authenticate directly with your Google account via browser.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-hairline/60">
                      <div>
                        <label className="block text-xs font-medium text-ink mb-1">
                          Google OAuth 2.0 Client ID <span className="text-accent-red">*</span>
                        </label>
                        <input
                          type="text"
                          value={clientIdInput}
                          onChange={(e) => setClientIdInput(e.target.value)}
                          placeholder="e.g. 1234567890-xyz.apps.googleusercontent.com"
                          className="w-full px-3 py-2 text-xs bg-surface border border-hairline rounded-md text-ink placeholder:text-stone font-mono focus:outline-none focus:border-hairline-strong"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-mute mb-1">
                          Client Secret <span className="text-stone">(Optional for Desktop clients)</span>
                        </label>
                        <input
                          type="password"
                          value={clientSecretInput}
                          onChange={(e) => setClientSecretInput(e.target.value)}
                          placeholder="GOCSPX-..."
                          className="w-full px-3 py-2 text-xs bg-surface border border-hairline rounded-md text-ink placeholder:text-stone font-mono focus:outline-none focus:border-hairline-strong"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                        <button
                          onClick={() => handleSignIn(false)}
                          disabled={isAuthenticating}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold bg-primary text-primary-text hover:bg-primary-pressed rounded-md transition-all shadow-sm disabled:opacity-50"
                        >
                          {isAuthenticating ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Opening Google sign-in in browser...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                              Sign in with Google
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleSignIn(true)}
                          disabled={isAuthenticating}
                          className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium bg-surface-elevated text-mute hover:text-ink hover:bg-surface border border-hairline rounded-md transition-colors"
                          title="Simulate Google Drive authentication instantly for offline testing"
                        >
                          Use Sandbox Demo Account
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Setup Guide */}
                  <div className="border border-hairline rounded-lg p-4 bg-surface space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                      <HelpCircle className="w-4 h-4 text-accent-blue" />
                      <span>How to get your Google Cloud OAuth Client ID (1 minute):</span>
                    </div>
                    <ol className="text-[11px] text-mute list-decimal list-inside space-y-1 leading-relaxed">
                      <li>Go to the <strong className="text-ink">Google Cloud Console</strong> (console.cloud.google.com).</li>
                      <li>Navigate to <strong className="text-ink">APIs & Services &gt; Credentials &gt; Create Credentials &gt; OAuth client ID</strong>.</li>
                      <li>Select Application type: <strong className="text-ink">Desktop app</strong> and paste the Client ID above.</li>
                      <li>In <strong className="text-ink">Enabled APIs & Services</strong>, ensure the <strong className="text-ink">Google Drive API</strong> is enabled.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Google Drive Mounting Folder Location Workflow */}
          {activeStep === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone font-mono">
                  Mounting Destination & Strategy
                </h3>
                <p className="text-xs text-mute">
                  Choose whether to sync directly via Google Drive Cloud API or mount a local Google Drive desktop directory.
                </p>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setMountType('cloud')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    mountType === 'cloud'
                      ? 'bg-surface-card border-accent-blue shadow-sm'
                      : 'bg-surface-elevated border-hairline hover:border-hairline-strong'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Cloud className={`w-5 h-5 ${mountType === 'cloud' ? 'text-accent-blue' : 'text-mute'}`} />
                    <input
                      type="radio"
                      name="mountType"
                      checked={mountType === 'cloud'}
                      onChange={() => setMountType('cloud')}
                      className="accent-white"
                    />
                  </div>
                  <h4 className="text-xs font-semibold text-ink">Google Drive Cloud Vault</h4>
                  <p className="text-[11px] text-mute mt-1 leading-relaxed">
                    Direct sync via Google Drive API v3. Creates a dedicated cloud folder without needing Google Drive desktop software installed.
                  </p>
                </div>

                <div
                  onClick={() => setMountType('local_mount')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    mountType === 'local_mount'
                      ? 'bg-surface-card border-accent-blue shadow-sm'
                      : 'bg-surface-elevated border-hairline hover:border-hairline-strong'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <HardDrive className={`w-5 h-5 ${mountType === 'local_mount' ? 'text-accent-blue' : 'text-mute'}`} />
                    <input
                      type="radio"
                      name="mountType"
                      checked={mountType === 'local_mount'}
                      onChange={() => setMountType('local_mount')}
                      className="accent-white"
                    />
                  </div>
                  <h4 className="text-xs font-semibold text-ink">Local Drive Mount Folder</h4>
                  <p className="text-[11px] text-mute mt-1 leading-relaxed">
                    Uses Google Drive for Desktop app's synchronized folder on your computer for instant offline caching.
                  </p>
                </div>
              </div>

              {/* Mount Location Configurations */}
              {mountType === 'cloud' ? (
                <div className="p-4 rounded-xl bg-surface-elevated border border-hairline space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-mute mb-1">
                      Remote Google Drive Vault Folder Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={driveFolderName}
                        onChange={(e) => setDriveFolderName(e.target.value)}
                        placeholder="e.g. MedBuddy Vault"
                        className="flex-1 px-3 py-2 text-xs bg-surface border border-hairline rounded-md text-ink placeholder:text-stone focus:outline-none focus:border-hairline-strong font-mono"
                      />
                      <button
                        onClick={handleTestMount}
                        disabled={isTestingMount}
                        className="px-3 py-2 text-xs font-medium bg-surface-card hover:bg-surface border border-hairline rounded-md text-ink transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        {isTestingMount ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-accent-green" />
                        )}
                        Verify Mount
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-mute font-mono">
                    Target Path: <span className="text-ink">My Drive / {driveFolderName || 'MedBuddy Vault'}</span>
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-surface-elevated border border-hairline space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-mute mb-1">
                      Local Google Drive Mount Directory Path
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={localMountPath}
                        onChange={(e) => setLocalMountPath(e.target.value)}
                        placeholder="/Users/name/Google Drive/MedBuddy"
                        className="flex-1 px-3 py-2 text-xs bg-surface border border-hairline rounded-md text-ink placeholder:text-stone focus:outline-none focus:border-hairline-strong font-mono"
                      />
                      <button
                        onClick={handleSelectLocalFolder}
                        className="px-3 py-2 text-xs font-medium bg-surface-card hover:bg-surface border border-hairline rounded-md text-ink transition-colors shrink-0"
                      >
                        Browse...
                      </button>
                      <button
                        onClick={handleTestMount}
                        disabled={isTestingMount}
                        className="px-3 py-2 text-xs font-medium bg-surface-card hover:bg-surface border border-hairline rounded-md text-ink transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        {isTestingMount ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-accent-green" />}
                        Test Access
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mount Test Result Feedback */}
              {mountTestResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    mountTestResult.success
                      ? 'bg-accent-green-soft border-accent-green/30 text-accent-green'
                      : 'bg-accent-red-soft border-accent-red/30 text-accent-red'
                  }`}
                >
                  {mountTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{mountTestResult.message}</span>
                </div>
              )}

              {/* Hierarchy Preview */}
              <div className="p-3.5 rounded-lg bg-surface border border-hairline space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-stone tracking-wider">Drive Hierarchy Structure</span>
                <p className="text-[11px] text-mute font-mono leading-relaxed">
                  📁 {driveFolderName || 'MedBuddy Vault'}/<br />
                  &nbsp;&nbsp;└── 📁 [Family Member Name]/<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 [Medical Category Folder]/<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📄 bloodwork_panel.pdf
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-hairline">
                <button
                  onClick={() => setActiveStep(1)}
                  className="px-3 py-1.5 text-xs text-mute hover:text-ink transition-colors"
                >
                  ← Back to Account
                </button>
                <button
                  onClick={() => setActiveStep(3)}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-primary-text hover:bg-primary-pressed rounded-md transition-colors"
                >
                  Select Sync Scope →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Sync Scope Selection */}
          {activeStep === 3 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone font-mono">
                  Sync Scope Selection
                </h3>
                <p className="text-xs text-mute">
                  Choose to synchronize all profiles, a specific family member, or selected medical folders.
                </p>
              </div>

              {/* Scope Options */}
              <div className="space-y-3">
                {/* 1. All Profiles */}
                <div
                  onClick={() => setSyncScope('all')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    syncScope === 'all'
                      ? 'bg-surface-card border-accent-blue shadow-sm'
                      : 'bg-surface-elevated border-hairline hover:border-hairline-strong'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Users className={`w-5 h-5 shrink-0 mt-0.5 ${syncScope === 'all' ? 'text-accent-blue' : 'text-mute'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-ink">Sync All Profiles at Once</h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-surface font-mono border border-hairline text-mute">
                            Entire Vault
                          </span>
                        </div>
                        <p className="text-[11px] text-mute mt-1">
                          Synchronizes all {members.length} family profiles, {folders.length} folders, and {totalVaultDocs} medical documents.
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="syncScope"
                      checked={syncScope === 'all'}
                      onChange={() => setSyncScope('all')}
                      className="accent-white mt-1"
                    />
                  </div>
                </div>

                {/* 2. Specific Profile */}
                <div
                  onClick={() => setSyncScope('profile')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    syncScope === 'profile'
                      ? 'bg-surface-card border-accent-blue shadow-sm'
                      : 'bg-surface-elevated border-hairline hover:border-hairline-strong'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <User className={`w-5 h-5 shrink-0 mt-0.5 ${syncScope === 'profile' ? 'text-accent-blue' : 'text-mute'}`} />
                      <div>
                        <h4 className="text-xs font-semibold text-ink">Sync Specific Profile</h4>
                        <p className="text-[11px] text-mute mt-0.5">
                          Synchronizes only records and folders belonging to one family member.
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="syncScope"
                      checked={syncScope === 'profile'}
                      onChange={() => setSyncScope('profile')}
                      className="accent-white mt-1"
                    />
                  </div>

                  {syncScope === 'profile' && (
                    <div className="pt-3 border-t border-hairline flex flex-col gap-2">
                      <label className="text-[11px] font-medium text-mute">Choose Profile:</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {members.map((m) => {
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
                              className={`p-2.5 rounded-lg border flex items-center gap-2.5 transition-colors ${
                                isChosen
                                  ? 'bg-surface border-ink text-ink font-semibold'
                                  : 'bg-surface/50 border-hairline text-mute hover:text-ink hover:bg-surface'
                              }`}
                            >
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                                style={{ backgroundColor: m.avatar_color }}
                              >
                                {m.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs truncate">{m.name}</div>
                                <div className="text-[10px] text-mute font-mono">{mDocs} docs</div>
                              </div>
                              {isChosen && <Check className="w-3.5 h-3.5 text-accent-green shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Specific Folders */}
                <div
                  onClick={() => setSyncScope('folders')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    syncScope === 'folders'
                      ? 'bg-surface-card border-accent-blue shadow-sm'
                      : 'bg-surface-elevated border-hairline hover:border-hairline-strong'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <FolderSync className={`w-5 h-5 shrink-0 mt-0.5 ${syncScope === 'folders' ? 'text-accent-blue' : 'text-mute'}`} />
                      <div>
                        <h4 className="text-xs font-semibold text-ink">Sync Specific Folders</h4>
                        <p className="text-[11px] text-mute mt-0.5">
                          Pick individual categories (e.g. Bloodwork, Cardiology, Lab Results) to sync.
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="syncScope"
                      checked={syncScope === 'folders'}
                      onChange={() => setSyncScope('folders')}
                      className="accent-white mt-1"
                    />
                  </div>

                  {syncScope === 'folders' && (
                    <div className="pt-3 border-t border-hairline space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-mute">
                        <span>Select folders to include:</span>
                        <span className="font-mono text-ink font-semibold">
                          {selectedFoldersCount} selected ({selectedFoldersDocsCount} docs)
                        </span>
                      </div>

                      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                        {members.map((m) => {
                          const mFolders = folders.filter((f) => f.member_id === m.id);
                          if (mFolders.length === 0) return null;
                          return (
                            <div key={m.id} className="p-2.5 rounded-lg bg-surface border border-hairline space-y-2">
                              <div className="flex items-center justify-between border-b border-hairline pb-1.5">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black"
                                    style={{ backgroundColor: m.avatar_color }}
                                  >
                                    {m.name.slice(0, 1).toUpperCase()}
                                  </div>
                                  <span className="text-xs font-medium text-ink">{m.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectAllFoldersForMember(mFolders);
                                  }}
                                  className="text-[10px] text-accent-blue hover:underline"
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
                                      className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                                        isChecked
                                          ? 'bg-surface-elevated border-hairline-strong text-ink font-medium'
                                          : 'bg-surface/40 border-hairline text-mute hover:bg-surface-elevated hover:text-ink'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleFolderSelection(f.id)}
                                          className="accent-white rounded"
                                        />
                                        <Folder className="w-3.5 h-3.5 text-stone shrink-0" />
                                        <span className="truncate">{f.name}</span>
                                      </div>
                                      <span className="text-[10px] font-mono text-stone px-1 rounded bg-surface border border-hairline/50 shrink-0">
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

              <div className="pt-2 flex items-center justify-between border-t border-hairline">
                <button
                  onClick={() => setActiveStep(2)}
                  className="px-3 py-1.5 text-xs text-mute hover:text-ink transition-colors"
                >
                  ← Back to Mount
                </button>
                <button
                  onClick={() => setActiveStep(4)}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-primary-text hover:bg-primary-pressed rounded-md transition-colors"
                >
                  Proceed to Sync & Status →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Sync Execution & Real-Time Progress */}
          {activeStep === 4 && (
            <div className="space-y-5 animate-in fade-in">
              {/* Target Summary Banner */}
              <div className="p-4 rounded-xl bg-surface-card border border-hairline space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-stone tracking-wider">
                    Ready to Synchronize
                  </span>
                  <span className="text-xs text-mute">
                    Mount: <strong className="text-ink">{mountType === 'cloud' ? 'Google Drive Cloud' : 'Local Mount'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-2.5 rounded-lg bg-surface-elevated border border-hairline">
                    <span className="text-[10px] text-mute uppercase font-mono">Scope</span>
                    <div className="text-xs font-semibold text-ink mt-0.5 capitalize">
                      {syncScope === 'all'
                        ? 'All Profiles'
                        : syncScope === 'profile'
                        ? `Profile: ${selectedMemberObj?.name || 'Selected'}`
                        : `${selectedFoldersCount} Folder(s)`}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-elevated border border-hairline">
                    <span className="text-[10px] text-mute uppercase font-mono">Destination</span>
                    <div className="text-xs font-semibold text-ink mt-0.5 truncate">
                      {mountType === 'cloud' ? driveFolderName : 'Local Drive'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-elevated border border-hairline">
                    <span className="text-[10px] text-mute uppercase font-mono">Estimated Docs</span>
                    <div className="text-xs font-semibold text-accent-blue mt-0.5 font-mono">
                      {syncScope === 'all'
                        ? totalVaultDocs
                        : syncScope === 'profile'
                        ? selectedMemberDocsCount
                        : selectedFoldersDocsCount}{' '}
                      records
                    </div>
                  </div>
                </div>

                {settings?.lastSyncTime && (
                  <p className="text-[11px] text-stone font-mono">
                    Last synced:{' '}
                    {new Date(settings.lastSyncTime).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>

              {/* Real-time Progress Display */}
              {isSyncing && (
                <div className="p-4 rounded-xl bg-surface-elevated border border-hairline space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-blue" />
                      {syncProgress?.message || 'Syncing files with Google Drive...'}
                    </span>
                    <span className="font-mono text-mute font-semibold">
                      {syncProgress?.progressPercent || 0}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-surface-card overflow-hidden border border-hairline">
                    <div
                      className="h-full bg-accent-blue transition-all duration-300 ease-out"
                      style={{ width: `${syncProgress?.progressPercent || 5}%` }}
                    />
                  </div>

                  {syncProgress?.currentFile && (
                    <p className="text-[11px] text-mute font-mono truncate">
                      Current file: <span className="text-ink">{syncProgress.currentFile}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Completed Sync Result Card */}
              {syncResult && !isSyncing && (
                <div
                  className={`p-4 rounded-xl border space-y-2 animate-in fade-in ${
                    syncResult.success
                      ? 'bg-accent-green-soft/50 border-accent-green/30 text-ink'
                      : 'bg-accent-red-soft/50 border-accent-red/30 text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {syncResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-accent-green" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-accent-red" />
                    )}
                    <h4 className="text-xs font-semibold">
                      {syncResult.success ? 'Google Drive Synchronized Successfully' : 'Sync Finished With Warnings'}
                    </h4>
                  </div>
                  <div className="text-xs text-mute space-y-1 font-mono">
                    <div>• Synced: <span className="text-ink font-semibold">{syncResult.syncedCount}</span> new/modified document(s)</div>
                    <div>• Skipped (Up-to-date): <span className="text-ink font-semibold">{syncResult.skippedCount}</span> document(s)</div>
                    {syncResult.failedCount > 0 && (
                      <div className="text-accent-red">• Failed: {syncResult.failedCount} document(s)</div>
                    )}
                  </div>
                </div>
              )}

              {/* Sync Action Button */}
              <div className="pt-2 flex items-center justify-between border-t border-hairline">
                <button
                  onClick={() => setActiveStep(3)}
                  disabled={isSyncing}
                  className="px-3 py-1.5 text-xs text-mute hover:text-ink transition-colors disabled:opacity-50"
                >
                  ← Adjust Scope
                </button>

                <button
                  onClick={handleStartSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-primary text-primary-text hover:bg-primary-pressed rounded-md transition-all shadow-sm disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Syncing in progress...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      Sync to Google Drive Now
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
