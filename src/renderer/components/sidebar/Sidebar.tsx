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
  Trash2,
  Home,
  FileText,
  Sparkles,
  Clock,
} from 'lucide-react';
import type { FamilyMember, Folder, AnalysisRecord } from '../../../shared/types';
import { ThemeToggle } from '../common/ThemeToggle';
import type { ThemeMode } from '../../hooks/useTheme';
import { MEMBER_AVATAR_COLORS } from './MemberModal';
import { MedBuddyLogo } from '../common/MedBuddyLogo';

import {
  SidebarProvider,
  useSidebar,
  type SidebarState,
} from './SidebarContext';
import {
  SidebarRoot,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarItem,
  SidebarFooter,
  SidebarToggle,
} from './SidebarComponents';
import { SidebarTooltip } from './SidebarTooltip';

export interface SidebarProps {
  members: FamilyMember[];
  selectedMember: FamilyMember | null;
  folders: Folder[];
  selectedFolderId: string | null;
  activeView: 'home' | 'files' | 'overview' | 'overviews_history' | 'timeline' | 'chat' | 'settings' | 'logs';
  onSelectMember: (member: FamilyMember) => void;
  onSelectFolder: (folderId: string) => void;
  onNavigate: (view: 'home' | 'files' | 'overviews_history' | 'timeline' | 'chat' | 'settings' | 'logs') => void;
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

const SidebarInner: React.FC<SidebarProps> = ({
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
  theme,
  onToggleTheme,
  analyses = [],
  currentAnalysisId,
  onSelectAnalysis,
}) => {
  const { isPinned, isExpandedOrPeeking, togglePin } = useSidebar();
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [reportsFolderExpanded, setReportsFolderExpanded] = useState(true);

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

  return (
    <SidebarRoot>
      {/* 1. Header: Brand Logo & Wordmark + Collapse Button */}
      <SidebarHeader>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 min-w-0 text-left outline-none rounded-md focus-visible:ring-2 focus-visible:ring-vault-500/50"
          title="Return to Home"
        >
          <MedBuddyLogo size={28} showText={false} />
          <div
            className={`transition-all duration-280 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden whitespace-nowrap ${
              isExpandedOrPeeking
                ? 'opacity-100 translate-x-0 max-w-[150px]'
                : 'opacity-0 -translate-x-2 max-w-0 pointer-events-none'
            }`}
          >
            <span className="text-[16px] font-bold tracking-tight text-primary leading-none">
              Med<span className="text-[#18AFA3] dark:text-[#20B9A5]">Buddy</span>
            </span>
          </div>
        </button>
      </SidebarHeader>

      {/* 2. Middle Scrollable Content */}
      <SidebarContent>
        {/* Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItem
              icon={<Home className="w-4 h-4" strokeWidth={1.75} />}
              label="Home"
              active={activeView === 'home'}
              tooltip="Home"
              onClick={() => onNavigate('home')}
            />
            <SidebarItem
              icon={<FolderIcon className="w-4 h-4" strokeWidth={1.75} />}
              label="Vault Documents"
              active={activeView === 'files' && !selectedFolderId}
              tooltip="Vault Documents"
              onClick={() => onNavigate('files')}
            />
            <SidebarItem
              icon={<Clock className="w-4 h-4" strokeWidth={1.75} />}
              label="Health Chronicle"
              active={activeView === 'timeline'}
              tooltip="Health Chronicle"
              onClick={() => onNavigate('timeline')}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Member Profiles Section */}
        <SidebarGroup className="pt-2">
          <SidebarGroupLabel
            action={
              <button
                type="button"
                onClick={onOpenAddMember}
                className="text-caption text-tertiary hover:text-primary flex items-center gap-0.5 font-medium transition-colors p-0.5 rounded hover:bg-surface-hover"
                title="Add Profile"
              >
                <Plus className="w-3 h-3" strokeWidth={2} /> Add
              </button>
            }
          >
            Profiles
          </SidebarGroupLabel>

          <SidebarGroupContent>
            {selectedMember ? (
              <div className="relative">
                {/* Collapsed Mode Avatar Button */}
                {!isExpandedOrPeeking ? (
                  <SidebarTooltip
                    content={`Profile: ${selectedMember.name} (${selectedMember.relationship})`}
                    enabled={!isExpandedOrPeeking}
                  >
                    <button
                      type="button"
                      onClick={() => onNavigate('files')}
                      className="w-full flex items-center justify-center py-1 outline-none"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold text-white shadow-2xs hover:scale-105 transition-transform"
                        style={{ backgroundColor: getMemberColor(selectedMember, 0) }}
                      >
                        {selectedMember.name.slice(0, 1).toUpperCase()}
                      </div>
                    </button>
                  </SidebarTooltip>
                ) : (
                  /* Expanded Mode Profile Switcher Card */
                  <>
                    <button
                      type="button"
                      onClick={() => setMemberMenuOpen(!memberMenuOpen)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-surface/70 hover:bg-surface-hover border border-border text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-vault-500/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold text-white shrink-0 shadow-2xs"
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
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-tertiary shrink-0 ml-1 transition-transform duration-200 ${
                          memberMenuOpen ? 'rotate-180' : ''
                        }`}
                        strokeWidth={1.75}
                      />
                    </button>

                    {/* Member Dropdown Menu */}
                    {memberMenuOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-md z-50 py-1 max-h-48 overflow-y-auto animate-fade-in">
                        {members.map((m, idx) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between px-2.5 py-1.5 hover:bg-surface-hover cursor-pointer group transition-colors"
                            onClick={() => {
                              onSelectMember(m);
                              setMemberMenuOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: getMemberColor(m, idx) }}
                              >
                                {m.name.slice(0, 1).toUpperCase()}
                              </div>
                              <span className="text-body text-primary truncate font-medium">
                                {m.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMemberMenuOpen(false);
                                onOpenEditMember(m);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-tertiary hover:text-primary transition-opacity rounded hover:bg-surface"
                              title="Edit Member"
                            >
                              <Settings className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <SidebarItem
                icon={<UserPlus className="w-4 h-4" strokeWidth={1.75} />}
                label="Add First Profile"
                tooltip="Add Profile"
                onClick={onOpenAddMember}
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Folders & Intelligence Section */}
        <SidebarGroup className="pt-2">
          <SidebarGroupLabel
            action={
              selectedMember && (
                <button
                  type="button"
                  onClick={onOpenAddFolder}
                  className="text-caption text-tertiary hover:text-primary flex items-center gap-0.5 font-medium transition-colors p-0.5 rounded hover:bg-surface-hover"
                  title="Create New Folder"
                >
                  <FolderPlus className="w-3 h-3" strokeWidth={1.75} /> New
                </button>
              )
            }
          >
            Vault Folders
          </SidebarGroupLabel>

          <SidebarGroupContent>
            {/* 1. Default 'AI Summaries' Folder for Active Profile */}
            {selectedMember && (
              <div className="space-y-0.5">
                <SidebarItem
                  icon={<Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" strokeWidth={2} />}
                  label={selectedMember ? `${selectedMember.name}'s AI Summaries` : 'AI Summaries'}
                  active={activeView === 'overviews_history' || (activeView === 'overview' && !selectedFolderId)}
                  tooltip={`${selectedMember.name}'s AI Summaries`}
                  badge={
                    <span className="text-[11px] tabular-nums font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80">
                      {memberAnalyses.length}
                    </span>
                  }
                  action={
                    isExpandedOrPeeking && memberAnalyses.length > 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportsFolderExpanded(!reportsFolderExpanded);
                        }}
                        className="p-1 text-tertiary hover:text-primary transition-transform rounded"
                        title={reportsFolderExpanded ? 'Collapse' : 'Expand'}
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            reportsFolderExpanded ? '' : '-rotate-90'
                          }`}
                          strokeWidth={2}
                        />
                      </button>
                    ) : undefined
                  }
                  onClick={() => {
                    if (isExpandedOrPeeking) {
                      setReportsFolderExpanded(!reportsFolderExpanded);
                    }
                    onNavigate('overviews_history');
                  }}
                />

                {/* Expanded items list: reports for this profile */}
                {isExpandedOrPeeking && reportsFolderExpanded && memberAnalyses.length > 0 && (
                  <div className="pl-4 pr-1 space-y-0.5 mt-0.5 mb-1.5 border-l-2 border-teal-500/20 dark:border-teal-500/30 ml-4 animate-fade-in">
                    {memberAnalyses.map((rec) => {
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
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-small text-left transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-vault-500/40 ${
                            isSelected
                              ? 'bg-vault-50 text-vault-700 dark:bg-vault-950/60 dark:text-vault-300 font-semibold shadow-2xs'
                              : 'text-secondary hover:bg-surface-hover hover:text-primary font-normal'
                          }`}
                          title={`${rec.scope_name || 'Generated Summary'} (${dateStr})`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-vault-600 dark:text-vault-400' : 'text-tertiary'
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
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. Custom Folders */}
            {folders.map((f) => {
              const isSelected = selectedFolderId === f.id && activeView === 'files';
              return (
                <SidebarItem
                  key={f.id}
                  icon={<FolderIcon className="w-4 h-4" strokeWidth={1.75} />}
                  label={f.name}
                  active={isSelected}
                  tooltip={`Folder: ${f.name} (${f.document_count || 0})`}
                  badge={
                    <span className="text-caption tabular-nums text-tertiary font-medium px-1">
                      {f.document_count || 0}
                    </span>
                  }
                  action={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete folder "${f.name}" and all records inside?`)) {
                          onDeleteFolder(f.id);
                        }
                      }}
                      className="opacity-0 group-hover/item:opacity-100 p-1 text-tertiary hover:text-clay-600 transition-colors rounded hover:bg-surface"
                      title="Delete Folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  }
                  onClick={() => {
                    onSelectFolder(f.id);
                    onNavigate('files');
                  }}
                />
              );
            })}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* 3. Pinned Footer Section */}
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            {/* All Generated Reports */}
            <SidebarItem
              icon={<Activity className="w-4 h-4" strokeWidth={2} />}
              label="All Generated Reports"
              active={activeView === 'overviews_history'}
              tooltip="All Generated Reports"
              badge={
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-recessed border border-border text-tertiary tabular-nums">
                  {analyses.length}
                </span>
              }
              onClick={() => onNavigate('overviews_history')}
            />

            {/* AI Providers */}
            <SidebarItem
              icon={<Cpu className="w-4 h-4" strokeWidth={1.75} />}
              label="AI Providers"
              active={activeView === 'settings'}
              tooltip="AI Providers & Models"
              onClick={() => onNavigate('settings')}
            />

            {/* Diagnostics */}
            <SidebarItem
              icon={<Terminal className="w-4 h-4" strokeWidth={1.75} />}
              label="Diagnostics"
              active={activeView === 'logs'}
              tooltip="Diagnostics & System Logs (Cmd+L)"
              onClick={() => onNavigate('logs')}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Utility Row: Sidebar Toggle pinned to exact same position; Theme Toggle appears on right only when expanded/peeking */}
        <div className="pt-1.5 border-t border-border flex items-center justify-between px-1 h-10">
          <SidebarToggle />
          <div
            className={`transition-all duration-280 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex items-center justify-end ${
              isExpandedOrPeeking
                ? 'opacity-100 scale-100 max-w-[40px] pointer-events-auto'
                : 'opacity-0 scale-75 max-w-0 pointer-events-none'
            }`}
          >
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
      </SidebarFooter>
    </SidebarRoot>
  );
};

// Main Export wrapping with SidebarProvider for complete plug-and-play compatibility
export const Sidebar: React.FC<SidebarProps> & {
  Provider: typeof SidebarProvider;
  Root: typeof SidebarRoot;
  Header: typeof SidebarHeader;
  Content: typeof SidebarContent;
  Group: typeof SidebarGroup;
  GroupLabel: typeof SidebarGroupLabel;
  GroupContent: typeof SidebarGroupContent;
  Item: typeof SidebarItem;
  Footer: typeof SidebarFooter;
  Toggle: typeof SidebarToggle;
  Tooltip: typeof SidebarTooltip;
} = (props) => {
  return (
    <SidebarProvider
      isCollapsedControlled={props.isCollapsed}
      onToggleCollapseControlled={props.onToggleCollapse}
    >
      <SidebarInner {...props} />
    </SidebarProvider>
  );
};

// Attach compound subcomponents for clean modular usage
Sidebar.Provider = SidebarProvider;
Sidebar.Root = SidebarRoot;
Sidebar.Header = SidebarHeader;
Sidebar.Content = SidebarContent;
Sidebar.Group = SidebarGroup;
Sidebar.GroupLabel = SidebarGroupLabel;
Sidebar.GroupContent = SidebarGroupContent;
Sidebar.Item = SidebarItem;
Sidebar.Footer = SidebarFooter;
Sidebar.Toggle = SidebarToggle;
Sidebar.Tooltip = SidebarTooltip;
