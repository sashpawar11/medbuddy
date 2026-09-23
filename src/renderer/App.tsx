import React, { useState, useEffect, useCallback } from 'react';
import type {
  FamilyMember,
  Folder,
  DocumentItem,
  ProviderProfile,
  AnalysisRecord,
  GoogleSyncSettings,
  SyncScope,
} from '../shared/types';
import { Sidebar } from './components/sidebar/Sidebar';
import { MemberModal } from './components/sidebar/MemberModal';
import { FolderModal } from './components/sidebar/FolderModal';
import { FileExplorer } from './components/explorer/FileExplorer';
import { AnalyzeModal } from './components/explorer/AnalyzeModal';
import { DocumentPreview } from './components/preview/DocumentPreview';
import { HomeDashboard } from './components/dashboard/HomeDashboard';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { OverviewsHistory } from './components/dashboard/OverviewsHistory';
import { ProviderSettings } from './components/settings/ProviderSettings';
import { DiagnosticsModal } from './components/diagnostics/DiagnosticsModal';
import { GoogleSyncModal } from './components/sync/GoogleSyncModal';
import { ToastContainer } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';

export const App: React.FC = () => {
  const { toasts, dismissToast, showSuccess, showError } = useToast();
  const { theme, toggleTheme } = useTheme();

  // Core Data State
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);

  // Navigation State (Home is default per user request)
  const [activeView, setActiveView] = useState<'home' | 'files' | 'overview' | 'overviews_history' | 'settings' | 'logs'>('home');
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisRecord | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('medbuddy-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('medbuddy-sidebar-collapsed', String(isSidebarCollapsed));
    } catch {
      // Ignore localStorage errors
    }
  }, [isSidebarCollapsed]);

  // Modals State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncSettings, setSyncSettings] = useState<GoogleSyncSettings | null>(null);
  const [syncScopeOverride, setSyncScopeOverride] = useState<{
    scope?: SyncScope;
    memberId?: string;
    folderId?: string;
  }>({});
  const [analyzeScope, setAnalyzeScope] = useState<{
    isOpen: boolean;
    scopeType: 'file' | 'selection' | 'folder';
    scopeId: string;
    scopeTitle: string;
    docIds: string[];
  }>({
    isOpen: false,
    scopeType: 'folder',
    scopeId: '',
    scopeTitle: '',
    docIds: [],
  });

  // Load Initial Data
  const refreshSyncSettings = useCallback(async () => {
    try {
      const data = await window.medbuddy.getSyncSettings();
      setSyncSettings(data);
    } catch {
      // Ignore initial sync settings error
    }
  }, []);

  const handleOpenSync = (scope?: SyncScope, memberId?: string, folderId?: string) => {
    setSyncScopeOverride({ scope, memberId, folderId });
    setIsSyncModalOpen(true);
  };

  const refreshMembers = useCallback(async () => {
    try {
      const list = await window.medbuddy.listMembers();
      setMembers(list);
      if (list.length > 0 && !selectedMember) {
        setSelectedMember(list[0]);
      }
    } catch (e: any) {
      showError('Failed to load members', e.message);
    }
  }, [selectedMember, showError]);

  const refreshFolders = useCallback(async (memberId: string) => {
    try {
      const list = await window.medbuddy.listFolders(memberId);
      setFolders(list);
      if (list.length > 0) {
        setSelectedFolderId(list[0].id);
      } else {
        setSelectedFolderId(null);
        setDocuments([]);
      }
    } catch (e: any) {
      showError('Failed to load folders', e.message);
    }
  }, [showError]);

  const refreshDocuments = useCallback(async (folderId: string) => {
    try {
      const list = await window.medbuddy.listDocuments(folderId);
      setDocuments(list);
    } catch (e: any) {
      showError('Failed to load documents', e.message);
    }
  }, [showError]);

  const refreshProviders = useCallback(async () => {
    try {
      const list = await window.medbuddy.listProviders();
      setProviders(list);
    } catch (e: any) {
      showError('Failed to load AI providers', e.message);
    }
  }, [showError]);

  const refreshAnalyses = useCallback(async () => {
    try {
      const list = await window.medbuddy.listAnalyses(30);
      setAnalyses(list);
    } catch (e: any) {
      showError('Failed to load overview history', e.message);
    }
  }, [showError]);

  // Initial load
  useEffect(() => {
    refreshMembers();
    refreshProviders();
    refreshAnalyses();
    refreshSyncSettings();
  }, []);

  // When selected member changes, refresh folders
  useEffect(() => {
    if (selectedMember) {
      refreshFolders(selectedMember.id);
    }
  }, [selectedMember]);

  // When selected folder changes, refresh documents
  useEffect(() => {
    if (selectedFolderId) {
      refreshDocuments(selectedFolderId);
    } else {
      setDocuments([]);
    }
  }, [selectedFolderId]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsDiagnosticsOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (previewDoc) setPreviewDoc(null);
        if (isDiagnosticsOpen) setIsDiagnosticsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, isDiagnosticsOpen]);

  // Member Handlers
  const handleSaveMember = async (data: Omit<FamilyMember, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingMember) {
      const updated = await window.medbuddy.updateMember(editingMember.id, data);
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      if (selectedMember?.id === updated.id) setSelectedMember(updated);
      showSuccess('Member updated');
    } else {
      const created = await window.medbuddy.createMember(data);
      setMembers((prev) => [...prev, created]);
      setSelectedMember(created);
      showSuccess(`Added ${created.name}`);
    }
  };

  const handleDeleteMember = async (id: string) => {
    await window.medbuddy.deleteMember(id);
    const updated = members.filter((m) => m.id !== id);
    setMembers(updated);
    setSelectedMember(updated.length > 0 ? updated[0] : null);
    showSuccess('Member deleted');
  };

  // Folder Handlers
  const handleCreateFolder = async (name: string) => {
    if (!selectedMember) return;
    const created = await window.medbuddy.createFolder(selectedMember.id, name, null);
    setFolders((prev) => [...prev, created]);
    setSelectedFolderId(created.id);
    setActiveView('files');
    showSuccess(`Created folder "${name}"`);
  };

  const handleDeleteFolder = async (folderId: string) => {
    await window.medbuddy.deleteFolder(folderId);
    const updated = folders.filter((f) => f.id !== folderId);
    setFolders(updated);
    setSelectedFolderId(updated.length > 0 ? updated[0].id : null);
    showSuccess('Folder deleted');
  };

  // Document Handlers
  const handleImportFiles = async (filePaths: string[]) => {
    if (!selectedFolderId) return;
    const imported = await window.medbuddy.importDocuments(selectedFolderId, filePaths);
    setDocuments((prev) => [...imported, ...prev]);
    // Refresh folder count
    if (selectedMember) refreshFolders(selectedMember.id);
    showSuccess(`Imported ${imported.length} document(s) into vault`);
  };

  const handleDeleteDocument = async (documentId: string) => {
    await window.medbuddy.deleteDocument(documentId);
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    if (previewDoc?.id === documentId) setPreviewDoc(null);
    if (selectedMember) refreshFolders(selectedMember.id);
    showSuccess('Document deleted');
  };

  // Analysis Handlers
  const handleTriggerAnalysis = (
    scopeType: 'file' | 'selection' | 'folder',
    docIds: string[],
    title: string
  ) => {
    const scopeId = scopeType === 'folder' ? (selectedFolderId || '') : (docIds[0] || '');
    setAnalyzeScope({
      isOpen: true,
      scopeType,
      scopeId,
      scopeTitle: title,
      docIds,
    });
  };

  const handleStartAnalysis = async (providerProfileId: string, forceRefresh?: boolean) => {
    try {
      const record = await window.medbuddy.runAnalysis({
        scopeType: analyzeScope.scopeType,
        scopeId: analyzeScope.scopeId,
        documentIds: analyzeScope.docIds,
        providerProfileId,
        forceRefresh,
      });

      setCurrentAnalysis(record);
      setActiveView('overview');
      refreshAnalyses();
      showSuccess('Health overview generated!');
    } catch (err: any) {
      showError('Analysis Failed', err.message);
      throw err;
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    try {
      await window.medbuddy.deleteAnalysis(id);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      if (currentAnalysis?.id === id) {
        setCurrentAnalysis(null);
        setActiveView('overviews_history');
      }
      showSuccess('Health overview deleted');
    } catch (err: any) {
      showError('Failed to delete overview', err.message);
    }
  };

  // Provider Handlers
  const handleSaveProvider = async (profile: Omit<ProviderProfile, 'id' | 'created_at'> & { id?: string }) => {
    await window.medbuddy.saveProvider(profile);
    await refreshProviders();
    showSuccess('Provider profile saved');
  };

  const handleDeleteProvider = async (id: string) => {
    await window.medbuddy.deleteProvider(id);
    await refreshProviders();
    showSuccess('Provider profile removed');
  };

  const handleTestConnection = async (profile: Partial<ProviderProfile>) => {
    return window.medbuddy.testConnection(profile);
  };

  const currentFolder = folders.find((f) => f.id === selectedFolderId) || null;
  const targetDocsForAnalysis = documents.filter((d) => analyzeScope.docIds.includes(d.id));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-ink select-none font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        members={members}
        selectedMember={selectedMember}
        folders={folders}
        selectedFolderId={selectedFolderId}
        activeView={activeView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onSelectMember={(m) => {
          setSelectedMember(m);
          setActiveView('files');
        }}
        onSelectFolder={(fid) => {
          setSelectedFolderId(fid);
          setActiveView('files');
        }}
        onNavigate={(view) => {
          if (view === 'logs') {
            setIsDiagnosticsOpen(true);
          } else {
            setActiveView(view);
          }
        }}
        onOpenAddMember={() => {
          setEditingMember(null);
          setIsMemberModalOpen(true);
        }}
        onOpenEditMember={(m) => {
          setEditingMember(m);
          setIsMemberModalOpen(true);
        }}
        onOpenAddFolder={() => setIsFolderModalOpen(true)}
        onDeleteFolder={handleDeleteFolder}
        onOpenSync={() => handleOpenSync('all')}
        isSyncConnected={Boolean(syncSettings?.isSignedIn)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main View Area */}
      <main className="flex-1 flex overflow-hidden relative">
        <ErrorBoundary fallbackTitle="Error Loading View">
          {activeView === 'home' && (
            <HomeDashboard
              members={members}
              selectedMember={selectedMember}
              folders={folders}
              analyses={analyses}
              providers={providers}
              syncSettings={syncSettings}
              onNavigate={(view) => {
                if (view === 'logs') {
                  setIsDiagnosticsOpen(true);
                } else {
                  setActiveView(view);
                }
              }}
              onOpenAddMember={() => {
                setEditingMember(null);
                setIsMemberModalOpen(true);
              }}
              onSelectFolder={(fid) => {
                setSelectedFolderId(fid);
                setActiveView('files');
              }}
              onSelectAnalysis={(rec) => {
                setCurrentAnalysis(rec);
                setActiveView('overview');
              }}
              onDeleteAnalysis={handleDeleteAnalysis}
              onOpenSync={() => handleOpenSync('all')}
            />
          )}

          {activeView === 'files' && selectedMember && currentFolder && (
            <FileExplorer
              member={selectedMember}
              folder={currentFolder}
              documents={documents}
              onImportFiles={handleImportFiles}
              onDeleteDocument={handleDeleteDocument}
              onPreviewDocument={(doc) => setPreviewDoc(doc)}
              onTriggerAnalysis={handleTriggerAnalysis}
              onOpenSyncFolder={(fid) => handleOpenSync('folders', selectedMember.id, fid)}
            />
          )}

          {activeView === 'files' && (!selectedMember || !currentFolder) && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-canvas">
              <h2 className="text-base font-semibold text-ink mb-1">Select or Create a Medical Folder</h2>
              <p className="text-xs text-mute max-w-sm mb-4">
                Choose a family member and folder in the sidebar to view documents, or return to the home dashboard.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveView('home')}
                  className="px-4 py-2 text-xs font-semibold bg-surface-elevated text-ink hover:bg-surface-card border border-hairline rounded-md transition-colors"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => setIsMemberModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-primary-text hover:bg-primary-pressed rounded-md transition-colors shadow-sm"
                >
                  Add Family Member
                </button>
              </div>
            </div>
          )}

          {activeView === 'overview' && currentAnalysis && (
            <OverviewDashboard
              analysis={currentAnalysis}
              onBack={() => setActiveView('files')}
              onRegenerate={() => {
                handleTriggerAnalysis(
                  currentAnalysis.scope_type,
                  currentAnalysis.source_documents.map((d) => d.id),
                  currentAnalysis.scope_name || 'Regenerating Overview'
                );
              }}
              onDelete={handleDeleteAnalysis}
            />
          )}

          {activeView === 'overviews_history' && (
            <OverviewsHistory
              analyses={analyses}
              onSelectAnalysis={(rec) => {
                setCurrentAnalysis(rec);
                setActiveView('overview');
              }}
              onDeleteAnalysis={handleDeleteAnalysis}
            />
          )}

          {activeView === 'settings' && (
            <ProviderSettings
              providers={providers}
              onSaveProvider={handleSaveProvider}
              onDeleteProvider={handleDeleteProvider}
              onTestConnection={handleTestConnection}
            />
          )}
        </ErrorBoundary>

        {/* Document Preview Pane (Split-screen) */}
        {previewDoc && (
          <DocumentPreview
            document={previewDoc}
            onClose={() => setPreviewDoc(null)}
          />
        )}
      </main>

      {/* Member Modal */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onSave={handleSaveMember}
        onDelete={editingMember ? handleDeleteMember : undefined}
        editingMember={editingMember}
      />

      {/* Folder Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSave={handleCreateFolder}
        memberName={selectedMember?.name || 'Member'}
      />

      {/* Analyze Modal */}
      <AnalyzeModal
        isOpen={analyzeScope.isOpen}
        onClose={() => setAnalyzeScope((prev) => ({ ...prev, isOpen: false }))}
        scopeType={analyzeScope.scopeType}
        scopeId={analyzeScope.scopeId}
        scopeTitle={analyzeScope.scopeTitle}
        documents={targetDocsForAnalysis}
        providers={providers}
        onStartAnalysis={handleStartAnalysis}
      />

      {/* Diagnostics & Logs Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

      {/* Google Drive Sync Modal */}
      <GoogleSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        members={members}
        folders={folders}
        initialScope={syncScopeOverride.scope}
        initialMemberId={syncScopeOverride.memberId}
        initialFolderId={syncScopeOverride.folderId}
        onSyncComplete={() => {
          refreshSyncSettings();
          if (selectedMember) refreshFolders(selectedMember.id);
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
