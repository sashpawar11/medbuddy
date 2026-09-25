import React, { useState } from 'react';
import {
  Folder as FolderIcon,
  FolderPlus,
  UserPlus,
  Plus,
  Activity,
  Cpu,
  Terminal,
  Settings,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import type { FamilyMember, Folder, AnalysisRecord } from '../../../shared/types';
import { Keycap } from '../common/Keycap';
import { ThemeToggle } from '../common/ThemeToggle';
import type { ThemeMode } from '../../hooks/useTheme';
import { MEMBER_AVATAR_COLORS } from './MemberModal';
import { MedBuddyLogo } from '../common/MedBuddyLogo';

interface Props {
  members: FamilyMember[];
  selectedMember: FamilyMember | null;
  folders: Folder[];
  selectedFolderId: string | null;
  activeView: 'home' | 'files' | 'overview' | 'overviews_history' | 'timeline' | 'settings' | 'logs';
  onSelectMember: (member: FamilyMember) => void;
  onSelectFolder: (folderId: string) => void;
  onNavigate: (view: 'home' | 'files' | 'overviews_history' | 'timeline' | 'settings' | 'logs') => void;
  onOpenAddMember: () => void;
  onOpenEditMember: (member: FamilyMember) => void;
  onOpenAddFolder: () => void;
  onDeleteFolder: (folderId: string) => void;
  onOpenSync: () => void;
  isSyncConnected?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  analyses?: AnalysisRecord[];
  currentAnalysisId?: string | null;
  onSelectAnalysis?: (analysis: AnalysisRecord) => void;
  aiHealth?: {
    status: 'idle' | 'checking' | 'active' | 'failure';
    latencyMs?: number;
    error?: string;
    providerName?: string;
  };
  onCheckAiHealth?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  members,
  selectedMember,
  folders,
  selectedFolderId,
  activeView,
  onSelectMember,
  onSelectFolder,
  onNavigate,
  onOpenAddMember,
  onOpenEditMember,
  onOpenAddFolder,
  onDeleteFolder,
  onOpenSync,
  isSyncConnected = false,
  isCollapsed = false,
  onToggleCollapse,
  theme,
  onToggleTheme,
  analyses = [],
  currentAnalysisId,
  onSelectAnalysis,
  aiHealth = { status: 'idle' },
  onCheckAiHealth,
}) => {
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [reportsFolderExpanded, setReportsFolderExpanded] = useState(true);

  // Resizable sidebar width with local persistence (§5.2)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('medbuddy-sidebar-width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 180 && val <= 500) {
          return val;
        }
      }
    } catch {
      // ignore
    }
    return 240;
  });

  const isResizingRef = React.useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.min(Math.max(moveEvent.clientX, 180), 500);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      try {
        setSidebarWidth((w) => {
          localStorage.setItem('medbuddy-sidebar-width', String(w));
          return w;
        });
      } catch {
        // ignore
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Helper for member avatar color deterministic lookup
  const getMemberColor = (m: FamilyMember, idx: number) => {
    if (m.avatar_color && MEMBER_AVATAR_COLORS.includes(m.avatar_color)) {
      return m.avatar_color;
    }
    return MEMBER_AVATAR_COLORS[idx % MEMBER_AVATAR_COLORS.length];
  };

  // Filter analyses specifically belonging to active selected profile
  const memberAnalyses = analyses.filter((a) => {
    if (!selectedMember) return false;
    if (a.member_id && a.member_id === selectedMember.id) return true;
    if (!a.member_id && a.member_name === selectedMember.name) return true;
    if (a.source_documents && a.source_documents.length > 0) {
      const memberFolderIds = new Set(folders.map((f) => f.id));
      return a.source_documents.some((doc) => memberFolderIds.has(doc.folder_id));
    }
    return false;
  });

  // Nav item helper per §9.5: active has vault-50 bg and vault-600 text
  const navItemClass = (active: boolean) =>
    `w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-body transition-colors select-none ${
      active
        ? 'bg-vault-50 text-vault-600 font-medium'
        : 'text-secondary hover:bg-surface-hover hover:text-primary font-normal'
    }`;

  // --------------------------------------------------------------------------
  // Collapsed Mode (Icon strip)
  // --------------------------------------------------------------------------
  if (isCollapsed) {
    return (
      <aside className="w-14 bg-surface-recessed border-r border-border flex flex-col h-full select-none shrink-0 print:hidden">
        <div className="p-2.5 border-b border-border flex flex-col items-center gap-2 shrink-0">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-sm hover:bg-surface-hover text-tertiary hover:text-primary transition-colors"
            title="Expand Sidebar (⌘B)"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col items-center gap-1.5">
          <button
            onClick={() => onNavigate('home')}
            className={`p-2 rounded-sm transition-colors ${
              activeView === 'home'
                ? 'bg-vault-50 text-vault-600'
                : 'text-tertiary hover:bg-surface-hover hover:text-primary'
            }`}
            title="Home Dashboard"
          >
            <Home className="w-4 h-4" strokeWidth={1.75} />
          </button>

          {selectedMember ? (
            <button
              onClick={() => onNavigate('files')}
              className="w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold text-white shrink-0 my-0.5"
              style={{ backgroundColor: getMemberColor(selectedMember, 0) }}
              title={`Active: ${selectedMember.name}`}
            >
              {selectedMember.name.slice(0, 1).toUpperCase()}
            </button>
          ) : (
            <button
              onClick={onOpenAddMember}
              className="p-2 rounded-sm hover:bg-surface-hover text-tertiary hover:text-primary"
              title="Add Family Member"
            >
              <UserPlus className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}

          <div className="w-5 h-px bg-border my-1" />

          <button
            onClick={() => onNavigate('files')}
            className={`p-2 rounded-sm transition-colors ${
              activeView === 'files'
                ? 'bg-vault-50 text-vault-600'
                : 'text-tertiary hover:bg-surface-hover hover:text-primary'
            }`}
            title="Medical Documents"
          >
            <FolderIcon className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-2 border-t border-border flex flex-col items-center gap-1.5 shrink-0">
          {/* Generated Reports (first in footer list) */}
          <button
            onClick={() => onNavigate('overviews_history')}
            className={`p-2 rounded-md transition-all relative ${
              activeView === 'overviews_history' || activeView === 'overview'
                ? 'bg-vault-600 text-white shadow-xs'
                : 'text-vault-600 dark:text-vault-400 bg-vault-50 dark:bg-vault-950/60 hover:bg-vault-100 hover:text-vault-700'
            }`}
            title="All Generated Reports"
          >
            <Activity className="w-4 h-4" strokeWidth={2} />
            {analyses.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal-500" />
            )}
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className={`p-2 rounded-sm relative transition-colors ${
              activeView === 'settings'
                ? 'bg-vault-50 text-vault-600'
                : 'text-tertiary hover:bg-surface-hover hover:text-primary'
            }`}
            title="AI Providers"
          >
            <Cpu className="w-4 h-4" strokeWidth={1.75} />
          </button>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </aside>
    );
  }

  // --------------------------------------------------------------------------
  // Standard Sidebar (Resizable with hold and drag)
  // --------------------------------------------------------------------------
  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className="bg-surface-recessed border-r border-border flex flex-col h-full select-none shrink-0 font-sans relative group/sidebar print:hidden"
    >
      {/* Resizing Hold and Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={() => {
          setSidebarWidth(240);
          try {
            localStorage.setItem('medbuddy-sidebar-width', '240');
          } catch {}
        }}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-vault-500/40 active:bg-vault-500 transition-colors z-20"
        title="Hold and drag to resize sidebar (double click to reset)"
      />
      {/* Brand Header - Spacious and Breathable */}
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between shrink-0 bg-surface">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center min-w-0 text-left transition-opacity hover:opacity-90"
          title="Return to Home Dashboard"
        >
          <MedBuddyLogo size={32} showText={true} />
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-md text-tertiary hover:text-primary hover:bg-surface-hover transition-colors"
              title="Collapse Sidebar (⌘B)"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {/* Home Navigation Link */}
      <div className="px-3 pt-3 pb-1.5 shrink-0">
        <button
          onClick={() => onNavigate('home')}
          className={navItemClass(activeView === 'home')}
        >
          <Home className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">Home Dashboard</span>
        </button>
      </div>

      {/* Member Switcher per §9.5 */}
      <div className="px-3 py-2 border-b border-border relative shrink-0">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-caption font-medium uppercase tracking-wider text-tertiary">
            Family Profile
          </span>
          <button
            onClick={onOpenAddMember}
            className="text-caption text-tertiary hover:text-primary flex items-center gap-0.5 font-medium transition-colors"
            title="Add Family Member"
          >
            <Plus className="w-3 h-3" strokeWidth={1.75} /> Add
          </button>
        </div>

        {selectedMember ? (
          <div className="relative">
            <button
              onClick={() => setMemberMenuOpen(!memberMenuOpen)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm bg-surface hover:bg-surface-hover border border-border text-left transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: getMemberColor(selectedMember, 0) }}
                >
                  {selectedMember.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-body font-medium text-primary truncate leading-tight">
                    {selectedMember.name}
                  </div>
                  <div className="text-caption text-tertiary truncate leading-tight">
                    {selectedMember.relationship}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-tertiary shrink-0 ml-1" strokeWidth={1.75} />
            </button>

            {memberMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-sm z-30 py-1 max-h-48 overflow-y-auto">
                {members.map((m, idx) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-surface-hover cursor-pointer group transition-colors"
                    onClick={() => {
                      onSelectMember(m);
                      setMemberMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: getMemberColor(m, idx) }}
                      >
                        {m.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-body text-primary truncate font-medium">{m.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberMenuOpen(false);
                        onOpenEditMember(m);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-tertiary hover:text-primary transition-opacity"
                      title="Edit Member"
                    >
                      <Settings className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAddMember}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border border-dashed border-border-strong text-small text-tertiary hover:text-primary hover:border-vault-500 transition-colors"
          >
            <UserPlus className="w-4 h-4" strokeWidth={1.75} />
            Add First Profile
          </button>
        )}
      </div>

      {/* Folder Tree per §9.5 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-caption font-medium uppercase tracking-wider text-tertiary">
            Folders
          </span>
          {selectedMember && (
            <button
              onClick={onOpenAddFolder}
              className="text-caption text-tertiary hover:text-primary flex items-center gap-1 font-medium transition-colors"
              title="Create New Folder"
            >
              <FolderPlus className="w-3 h-3" strokeWidth={1.75} /> New
            </button>
          )}
        </div>

        {/* 1. Default 'AI Summaries' Folder for the Profile */}
        {selectedMember && (
          <div className="mb-1.5">
            <div
              onClick={() => setReportsFolderExpanded(!reportsFolderExpanded)}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-body cursor-pointer transition-colors ${
                activeView === 'overviews_history' || (activeView === 'overview' && !selectedFolderId)
                  ? 'bg-vault-50 text-vault-700 dark:bg-vault-950/60 dark:text-vault-300 font-semibold'
                  : 'text-secondary hover:bg-surface-hover hover:text-primary font-medium'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReportsFolderExpanded(!reportsFolderExpanded);
                  }}
                  className="p-0.5 text-tertiary hover:text-primary transition-transform"
                  title={reportsFolderExpanded ? 'Collapse' : 'Expand'}
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      reportsFolderExpanded ? '' : '-rotate-90'
                    }`}
                    strokeWidth={2}
                  />
                </button>
                <div className="w-4 h-4 rounded flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <span className="truncate text-small font-medium">
                  {selectedMember ? `${selectedMember.name}'s AI Summaries` : 'AI Summaries'}
                </span>
              </div>
              <span className="text-[11px] tabular-nums font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80 shrink-0">
                {memberAnalyses.length}
              </span>
            </div>

            {/* Expanded items list: reports for this profile */}
            {reportsFolderExpanded && (
              <div className="pl-4 pr-1 space-y-0.5 mt-0.5 mb-1.5 border-l-2 border-teal-500/20 dark:border-teal-500/30 ml-4">
                {memberAnalyses.length === 0 ? (
                  <div className="px-2 py-1.5 text-caption text-tertiary italic">
                    No generated summaries yet
                  </div>
                ) : (
                  memberAnalyses.map((rec) => {
                    const isSelected = activeView === 'overview' && currentAnalysisId === rec.id;
                    const dateStr = new Date(rec.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                    return (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => onSelectAnalysis?.(rec)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-small text-left transition-colors group ${
                          isSelected
                            ? 'bg-vault-50 text-vault-700 dark:bg-vault-950/60 dark:text-vault-300 font-semibold shadow-2xs'
                            : 'text-secondary hover:bg-surface-hover hover:text-primary font-normal'
                        }`}
                        title={`${rec.scope_name || 'Generated Summary'} (${dateStr})`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSelected ? 'text-vault-600' : 'text-tertiary'
                            }`}
                            strokeWidth={1.75}
                          />
                          <span className="truncate text-[12px]">{rec.scope_name || 'Generated Summary'}</span>
                        </div>
                        <span className="text-[10px] text-tertiary tabular-nums shrink-0 ml-1.5">
                          {dateStr}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. Custom Folders */}
        {folders.length === 0 && (!selectedMember || memberAnalyses.length === 0) ? (
          <div className="text-center py-6 px-2">
            <FolderIcon className="w-6 h-6 text-tertiary mx-auto mb-2 opacity-40" strokeWidth={1.75} />
            <p className="text-small text-secondary">No custom folders</p>
            {selectedMember && (
              <button
                onClick={onOpenAddFolder}
                className="mt-1.5 text-caption text-brand hover:underline font-medium"
              >
                Create your first folder
              </button>
            )}
          </div>
        ) : (
          folders.map((f) => {
            const isSelected = selectedFolderId === f.id && activeView === 'files';
            return (
              <div
                key={f.id}
                onClick={() => {
                  onSelectFolder(f.id);
                  onNavigate('files');
                }}
                className={`group flex items-center justify-between px-3 py-1.5 rounded-sm text-body cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-vault-50 text-vault-600 font-medium'
                    : 'text-secondary hover:bg-surface-hover hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderIcon
                    className={`w-4 h-4 shrink-0 ${isSelected ? 'text-vault-600' : 'text-tertiary'}`}
                    strokeWidth={1.75}
                  />
                  <span className="truncate">{f.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-caption tabular-nums text-tertiary font-medium">
                    {f.document_count || 0}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete folder "${f.name}" and all records inside?`)) {
                        onDeleteFolder(f.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-tertiary hover:text-clay-600 transition-colors"
                    title="Delete Folder"
                  >
                    <ChevronRight className="w-3.5 h-3.5 rotate-90" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pinned Footer Items (§9.5) */}
      <div className="px-3 py-2.5 border-t border-border space-y-1.5 shrink-0 bg-surface-recessed">
        {/* 1. Emphasized Generated Reports (First in List) */}
        <button
          onClick={() => onNavigate('overviews_history')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all shadow-2xs ${
            activeView === 'overviews_history' || activeView === 'overview'
              ? 'bg-vault-50/80 border-vault-300 text-vault-700 dark:bg-vault-950/60 dark:border-vault-700 dark:text-vault-300 font-semibold shadow-xs'
              : 'bg-surface border-border hover:border-vault-300/60 hover:bg-vault-50/30 text-primary font-medium hover:shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                activeView === 'overviews_history' || activeView === 'overview'
                  ? 'bg-vault-600 text-white'
                  : 'bg-vault-50 dark:bg-vault-900/60 text-vault-600 dark:text-vault-400 border border-vault-200/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
            <span className="truncate font-semibold text-small">All Generated Reports</span>
          </div>
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-recessed border border-border text-tertiary tabular-nums">
            {analyses.length}
          </span>
        </button>

        {/* 2. AI Providers */}
        <button
          onClick={() => onNavigate('settings')}
          className={navItemClass(activeView === 'settings')}
        >
          <Cpu className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">AI Providers</span>
        </button>


        {/* 4. Diagnostics & Theme Utility Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <button
            onClick={() => onNavigate('logs')}
            className="flex items-center gap-2 px-2 py-1 rounded-sm text-caption text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            <span>Diagnostics</span>
            <Keycap>⌘L</Keycap>
          </button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </aside>
  );
};
