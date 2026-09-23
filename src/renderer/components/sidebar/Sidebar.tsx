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
  ShieldCheck,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Cloud,
  ChevronRight,
} from 'lucide-react';
import type { FamilyMember, Folder } from '../../../shared/types';
import { Keycap } from '../common/Keycap';
import { ThemeToggle } from '../common/ThemeToggle';
import type { ThemeMode } from '../../hooks/useTheme';

interface Props {
  members: FamilyMember[];
  selectedMember: FamilyMember | null;
  folders: Folder[];
  selectedFolderId: string | null;
  activeView: 'home' | 'files' | 'overview' | 'overviews_history' | 'settings' | 'logs';
  onSelectMember: (member: FamilyMember) => void;
  onSelectFolder: (folderId: string) => void;
  onNavigate: (view: 'home' | 'files' | 'overviews_history' | 'settings' | 'logs') => void;
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
}

/** Shared nav item styles */
const navItem = (active: boolean) =>
  `w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-[background-color,color] ${
    active
      ? 'bg-surface-card text-ink border border-hairline'
      : 'text-mute hover:bg-surface-elevated hover:text-ink'
  }`;

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
}) => {
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);

  // --------------------------------------------------------------------------
  // Collapsed Sidebar (Icon strip mode)
  // --------------------------------------------------------------------------
  if (isCollapsed) {
    return (
      <aside className="w-14 bg-surface border-r border-hairline flex flex-col h-full select-none shrink-0">
        {/* Hero Stripe */}
        <div className="h-0.5 w-full hero-stripe-accent shrink-0" />

        {/* Expand Button */}
        <div className="p-2.5 border-b border-hairline flex flex-col items-center gap-2 shrink-0">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-surface-elevated text-mute hover:text-ink"
            title="Expand Sidebar (⌘B)"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Icons */}
        <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col items-center gap-1.5">
          <button
            onClick={() => onNavigate('home')}
            className={`p-2 rounded-md transition-[background-color,color] ${
              activeView === 'home'
                ? 'bg-surface-card text-ink border border-hairline'
                : 'text-mute hover:bg-surface-elevated hover:text-ink'
            }`}
            title="Home Dashboard"
          >
            <Home className="w-4 h-4" />
          </button>

          {selectedMember ? (
            <button
              onClick={() => onNavigate('files')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0 my-0.5"
              style={{ backgroundColor: selectedMember.avatar_color }}
              title={`Active: ${selectedMember.name}`}
            >
              {selectedMember.name.slice(0, 1).toUpperCase()}
            </button>
          ) : (
            <button
              onClick={onOpenAddMember}
              className="p-2 rounded-md hover:bg-surface-elevated text-mute hover:text-ink"
              title="Add Family Member"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}

          <div className="w-5 h-px bg-hairline my-0.5" />

          <button
            onClick={() => onNavigate('files')}
            className={`p-2 rounded-md transition-[background-color,color] ${
              activeView === 'files'
                ? 'bg-surface-card text-ink border border-hairline'
                : 'text-mute hover:bg-surface-elevated hover:text-ink'
            }`}
            title="Medical Records"
          >
            <FolderIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Utilities */}
        <div className="p-2 border-t border-hairline flex flex-col items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenSync}
            className="p-2 rounded-md relative text-mute hover:bg-surface-elevated hover:text-ink"
            title="Google Drive Sync"
          >
            <Cloud className="w-4 h-4" />
            {isSyncConnected && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-green" />
            )}
          </button>

          <button
            onClick={() => onNavigate('overviews_history')}
            className={`p-2 rounded-md transition-[background-color,color] ${
              activeView === 'overviews_history'
                ? 'bg-surface-card text-ink border border-hairline'
                : 'text-mute hover:bg-surface-elevated hover:text-ink'
            }`}
            title="Health Overviews"
          >
            <Activity className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className={`p-2 rounded-md transition-[background-color,color] ${
              activeView === 'settings'
                ? 'bg-surface-card text-ink border border-hairline'
                : 'text-mute hover:bg-surface-elevated hover:text-ink'
            }`}
            title="AI Provider Setup"
          >
            <Cpu className="w-4 h-4" />
          </button>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </aside>
    );
  }

  // --------------------------------------------------------------------------
  // Expanded Sidebar
  // --------------------------------------------------------------------------
  return (
    <aside className="w-60 bg-surface border-r border-hairline flex flex-col h-full select-none shrink-0">
      {/* Signature Red Hero Stripe */}
      <div className="h-0.5 w-full hero-stripe-accent shrink-0" />

      {/* Brand Header */}
      <div className="px-3.5 py-3 border-b border-hairline flex items-center justify-between shrink-0">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 min-w-0 group"
          title="Home Dashboard"
        >
          {/* Logo mark — ShieldCheck in a pill, concentric with the sidebar radius */}
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary-text" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold tracking-tight text-ink">MedBuddy</h1>
              <span className="text-[10px] px-1.5 rounded-xs bg-surface-elevated text-stone border border-hairline font-medium">
                v1
              </span>
            </div>
            <p className="text-[10px] text-stone flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green inline-block" />
              Local Vault
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-md hover:bg-surface-elevated text-mute hover:text-ink"
              title="Collapse Sidebar (⌘B)"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Home nav item */}
      <div className="px-2.5 pt-2.5 pb-1 shrink-0">
        <button
          onClick={() => onNavigate('home')}
          className={navItem(activeView === 'home')}
        >
          <Home className="w-4 h-4 shrink-0" />
          <span className="truncate">Home</span>
        </button>
      </div>

      {/* Member Selector */}
      <div className="px-2.5 py-2 border-b border-hairline relative shrink-0">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-[10px] font-medium uppercase tracking-widest text-stone">
            Family
          </span>
          <button
            onClick={onOpenAddMember}
            className="text-[11px] text-stone hover:text-ink flex items-center gap-0.5 font-medium"
            title="Add Family Member"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {selectedMember ? (
          <div className="relative">
            <button
              onClick={() => setMemberMenuOpen(!memberMenuOpen)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-md bg-surface-elevated hover:bg-surface-card border border-hairline text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                  style={{ backgroundColor: selectedMember.avatar_color }}
                >
                  {selectedMember.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-ink truncate">{selectedMember.name}</div>
                  <div className="text-[10px] text-stone truncate">{selectedMember.relationship}</div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-stone shrink-0 ml-1" />
            </button>

            {memberMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-hairline rounded-md z-30 py-1 max-h-48 overflow-y-auto">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-2.5 py-1.5 hover:bg-surface-elevated cursor-pointer group"
                    onClick={() => {
                      onSelectMember(m);
                      setMemberMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black shrink-0"
                        style={{ backgroundColor: m.avatar_color }}
                      >
                        {m.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-xs text-ink truncate font-medium">{m.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberMenuOpen(false);
                        onOpenEditMember(m);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-stone hover:text-ink"
                      title="Edit Member"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAddMember}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md border border-dashed border-hairline text-xs text-stone hover:text-ink hover:border-hairline-strong"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add First Member
          </button>
        )}
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5">
        <div className="flex items-center justify-between px-0.5 mb-1.5">
          <span className="text-[10px] font-medium uppercase tracking-widest text-stone">
            Folders
          </span>
          {selectedMember && (
            <button
              onClick={onOpenAddFolder}
              className="text-[11px] text-stone hover:text-ink flex items-center gap-1 font-medium"
              title="New Folder"
            >
              <FolderPlus className="w-3 h-3" /> New
            </button>
          )}
        </div>

        {folders.length === 0 ? (
          <div className="text-center py-6 px-2">
            <FolderIcon className="w-5 h-5 text-stone mx-auto mb-1.5 opacity-30" />
            <p className="text-[11px] text-stone">No folders yet</p>
            {selectedMember && (
              <button
                onClick={onOpenAddFolder}
                className="mt-2 text-xs text-mute hover:text-ink underline"
              >
                Create one
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
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-[background-color,color] ${
                  isSelected
                    ? 'bg-surface-card text-ink border border-hairline'
                    : 'text-mute hover:bg-surface-elevated hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-ink' : 'text-stone'}`} />
                  <span className="truncate font-medium">{f.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Bare count — no badge noise */}
                  <span className="text-[10px] tabular-nums text-stone">
                    {f.document_count || 0}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete folder "${f.name}" and all documents inside?`)) {
                        onDeleteFolder(f.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-stone hover:text-accent-red"
                    title="Delete Folder"
                  >
                    <ChevronRight className="w-3 h-3 rotate-90 opacity-60" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="px-2.5 py-2 border-t border-hairline space-y-0.5 shrink-0">
        <button
          onClick={onOpenSync}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium text-mute hover:bg-surface-elevated hover:text-ink group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Cloud className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Drive Sync</span>
          </div>
          {isSyncConnected ? (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green shrink-0" />
          ) : (
            <span className="text-[10px] text-stone group-hover:text-mute">Setup</span>
          )}
        </button>

        <button
          onClick={() => onNavigate('overviews_history')}
          className={navItem(activeView === 'overviews_history')}
        >
          <Activity className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Overviews</span>
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className={navItem(activeView === 'settings')}
        >
          <Cpu className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">AI Providers</span>
        </button>

        <button
          onClick={() => onNavigate('logs')}
          className={`${navItem(activeView === 'logs')} justify-between`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Terminal className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Diagnostics</span>
          </div>
          <Keycap>⌘L</Keycap>
        </button>
      </div>
    </aside>
  );
};
