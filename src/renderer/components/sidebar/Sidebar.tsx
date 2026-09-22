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
  MoreVertical,
  ChevronDown,
  ShieldCheck,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Cloud,
} from 'lucide-react';
import type { FamilyMember, Folder } from '../../../shared/types';
import { Keycap } from '../common/Keycap';

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
}) => {
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);

  // --------------------------------------------------------------------------
  // Collapsed Sidebar (Icon strip mode)
  // --------------------------------------------------------------------------
  if (isCollapsed) {
    return (
      <aside className="w-16 bg-surface border-r border-hairline flex flex-col h-full select-none shrink-0 transition-all duration-200 ease-in-out">
        {/* Signature Hero Accent */}
        <div className="h-1 w-full hero-stripe-accent shrink-0" />

        {/* Top Header & Expand Button */}
        <div className="p-3 border-b border-hairline flex flex-col items-center gap-2 shrink-0">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-surface-elevated text-mute hover:text-ink transition-colors"
            title="Expand Sidebar (⌘B)"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Icons Stack */}
        <div className="flex-1 overflow-y-auto py-3 px-2 flex flex-col items-center gap-2">
          {/* Home Icon */}
          <button
            onClick={() => onNavigate('home')}
            className={`p-2.5 rounded-md transition-colors ${
              activeView === 'home'
                ? 'bg-surface-card text-ink font-semibold border border-hairline shadow-sm'
                : 'text-mute hover:bg-surface-elevated hover:text-ink'
            }`}
            title="Dashboard (Home)"
          >
            <Home className={`w-4 h-4 ${activeView === 'home' ? 'text-accent-blue' : ''}`} />
          </button>

          {/* Member Avatar Button */}
          {selectedMember ? (
            <button
              onClick={() => onNavigate('files')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0 my-1 transition-transform hover:scale-105"
              style={{ backgroundColor: selectedMember.avatar_color }}
              title={`Active Member: ${selectedMember.name}`}
            >
              {selectedMember.name.slice(0, 1).toUpperCase()}
            </button>
          ) : (
            <button
              onClick={onOpenAddMember}
              className="p-2 rounded-md hover:bg-surface-elevated text-mute hover:text-ink transition-colors"
              title="Add Family Member"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}

          <div className="w-6 h-px bg-hairline my-1" />

          {/* Folders Icon */}
          <button
            onClick={() => onNavigate('files')}
            className={`p-2.5 rounded-md transition-colors ${
              activeView === 'files'
                ? 'bg-surface-card text-ink font-semibold border border-hairline shadow-sm'
                : 'text-mute hover:bg-surface-elevated hover:text-ink'
            }`}
            title="Medical Records Explorer"
          >
            <FolderIcon className={`w-4 h-4 ${activeView === 'files' ? 'text-ink' : ''}`} />
          </button>
        </div>

        {/* Bottom Utility Icons */}
        <div className="p-2 border-t border-hairline flex flex-col items-center gap-2 shrink-0 bg-surface-elevated/40">
          <button
            onClick={onOpenSync}
            className="p-2 rounded-md relative text-mute hover:bg-surface-elevated hover:text-ink transition-colors"
            title="Sync to Google Drive"
          >
            <Cloud className="w-4 h-4 text-accent-blue" />
            {isSyncConnected && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-green" />
            )}
          </button>

          <button
            onClick={() => onNavigate('overviews_history')}
            className={`p-2 rounded-md transition-colors ${
              activeView === 'overviews_history'
                ? 'bg-surface-card text-ink border border-hairline'
                : 'text-mute hover:bg-surface-elevated hover:text-ink'
            }`}
            title="Health Overviews"
          >
            <Activity className="w-4 h-4 text-accent-blue" />
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className={`p-2 rounded-md transition-colors ${
              activeView === 'settings'
                ? 'bg-surface-card text-ink border border-hairline'
                : 'text-mute hover:bg-surface-elevated hover:text-ink'
            }`}
            title="AI Provider Setup"
          >
            <Cpu className="w-4 h-4 text-accent-yellow" />
          </button>

          <button
            onClick={() => onNavigate('logs')}
            className={`p-2 rounded-md transition-colors ${
              activeView === 'logs'
                ? 'bg-surface-card text-ink border border-hairline'
                : 'text-mute hover:bg-surface-elevated hover:text-ink'
            }`}
            title="Diagnostics & Logs (⌘L)"
          >
            <Terminal className="w-4 h-4 text-stone" />
          </button>
        </div>
      </aside>
    );
  }

  // --------------------------------------------------------------------------
  // Expanded Sidebar
  // --------------------------------------------------------------------------
  return (
    <aside className="w-64 bg-surface border-r border-hairline flex flex-col h-full select-none shrink-0 transition-all duration-200 ease-in-out">
      {/* Signature Red Hero Stripe Accent (Design.md §2.5) */}
      <div className="h-1 w-full hero-stripe-accent shrink-0" />

      {/* Brand Header */}
      <div className="p-3.5 border-b border-hairline flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => onNavigate('home')}
            className="w-7 h-7 rounded-md bg-primary text-primary-text flex items-center justify-center font-bold text-sm shadow-sm shrink-0 transition-transform active:scale-95"
            title="Go to Home Dashboard"
          >
            M
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold tracking-tight text-ink">
                MedBuddy
              </h1>
              <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-surface-elevated text-mute font-mono border border-hairline">
                v1.0
              </span>
              <button
                onClick={() => onNavigate('home')}
                className="p-0.5 rounded hover:bg-surface-elevated text-mute hover:text-ink transition-colors ml-0.5"
                title="Go to Home Dashboard"
              >
                <Home className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-mute flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3 h-3 text-accent-green shrink-0" /> Local Vault
            </p>
          </div>
        </div>

        {/* Collapse Toggle Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-surface-elevated text-mute hover:text-ink transition-colors shrink-0"
            title="Collapse Sidebar (⌘B)"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Primary Navigation Item: Home Dashboard */}
      <div className="px-3 pt-3 pb-1 shrink-0">
        <button
          onClick={() => onNavigate('home')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
            activeView === 'home'
              ? 'bg-surface-card text-ink border border-hairline shadow-sm'
              : 'text-body hover:bg-surface-elevated hover:text-ink'
          }`}
        >
          <Home className={`w-4 h-4 shrink-0 ${activeView === 'home' ? 'text-accent-blue' : 'text-mute'}`} />
          <span className="truncate">Home Dashboard</span>
        </button>
      </div>

      {/* Member Selector Section */}
      <div className="px-3 py-2 border-b border-hairline relative shrink-0">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[10px] font-mono uppercase text-stone tracking-wider">Family Member</span>
          <button
            onClick={onOpenAddMember}
            className="text-[11px] text-mute hover:text-ink flex items-center gap-0.5 transition-colors font-medium"
            title="Add Family Member"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {selectedMember ? (
          <div className="relative">
            <button
              onClick={() => setMemberMenuOpen(!memberMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-md bg-surface-elevated hover:bg-surface-card border border-hairline transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-black shrink-0 shadow-sm"
                  style={{ backgroundColor: selectedMember.avatar_color }}
                >
                  {selectedMember.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-ink truncate">{selectedMember.name}</div>
                  <div className="text-[10px] text-mute truncate">{selectedMember.relationship}</div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-mute shrink-0 ml-1" />
            </button>

            {/* Member Dropdown Menu */}
            {memberMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-hairline-strong rounded-md shadow-2xl z-30 py-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-2.5 py-1.5 hover:bg-surface-elevated transition-colors cursor-pointer group"
                    onClick={() => {
                      onSelectMember(m);
                      setMemberMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
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
                      className="opacity-0 group-hover:opacity-100 p-1 text-mute hover:text-ink transition-opacity"
                      title="Edit Member Profile"
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
            className="w-full flex items-center justify-center gap-1.5 p-2 rounded-md bg-surface-elevated border border-hairline text-xs text-mute hover:text-ink hover:border-hairline-strong transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add First Member
          </button>
        )}
      </div>

      {/* Folders List Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-[10px] font-mono uppercase text-stone tracking-wider">Medical Folders</span>
          {selectedMember && (
            <button
              onClick={onOpenAddFolder}
              className="text-[11px] text-mute hover:text-ink flex items-center gap-1 transition-colors font-medium"
              title="Add New Folder"
            >
              <FolderPlus className="w-3 h-3" /> New
            </button>
          )}
        </div>

        {folders.length === 0 ? (
          <div className="text-center py-6 px-2">
            <FolderIcon className="w-5 h-5 text-stone mx-auto mb-1.5 opacity-40" />
            <p className="text-xs text-mute">No folders created yet</p>
            {selectedMember && (
              <button
                onClick={onOpenAddFolder}
                className="mt-2 text-xs text-ink underline hover:text-body"
              >
                Create a folder
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
                className={`group flex items-center justify-between px-2.5 py-2 rounded-md text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-surface-card text-ink font-semibold border border-hairline shadow-sm'
                    : 'text-body hover:bg-surface-elevated hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderIcon
                    className={`w-4 h-4 shrink-0 ${isSelected ? 'text-accent-blue' : 'text-mute'}`}
                  />
                  <span className="truncate">{f.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-mute font-mono px-1.5 py-0.2 rounded-xs bg-surface-elevated border border-hairline/60">
                    {f.document_count || 0}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete folder "${f.name}" and all documents inside?`)) {
                        onDeleteFolder(f.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-stone hover:text-accent-red transition-opacity"
                    title="Delete Folder"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Global Navigation Links */}
      <div className="p-3 border-t border-hairline space-y-1 bg-surface-elevated/40 shrink-0">
        <button
          onClick={onOpenSync}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium text-mute hover:bg-surface-elevated hover:text-ink transition-colors group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Cloud className="w-4 h-4 text-accent-blue shrink-0" />
            <span className="truncate">Google Drive Sync</span>
          </div>
          {isSyncConnected ? (
            <span className="text-[9px] px-1.5 py-0.2 rounded-xs bg-accent-green-soft text-accent-green font-mono border border-accent-green/30">
              Synced
            </span>
          ) : (
            <span className="text-[10px] text-stone group-hover:text-mute">
              Setup
            </span>
          )}
        </button>

        <button
          onClick={() => onNavigate('overviews_history')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
            activeView === 'overviews_history'
              ? 'bg-surface-card text-ink font-semibold border border-hairline shadow-sm'
              : 'text-mute hover:bg-surface-elevated hover:text-ink'
          }`}
        >
          <Activity className="w-4 h-4 text-accent-blue shrink-0" />
          <span className="truncate">Health Overviews</span>
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
            activeView === 'settings'
              ? 'bg-surface-card text-ink font-semibold border border-hairline shadow-sm'
              : 'text-mute hover:bg-surface-elevated hover:text-ink'
          }`}
        >
          <Cpu className="w-4 h-4 text-accent-yellow shrink-0" />
          <span className="truncate">AI Provider Setup</span>
        </button>

        <button
          onClick={() => onNavigate('logs')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
            activeView === 'logs'
              ? 'bg-surface-card text-ink font-semibold border border-hairline shadow-sm'
              : 'text-mute hover:bg-surface-elevated hover:text-ink'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Terminal className="w-4 h-4 text-stone shrink-0" />
            <span className="truncate">Diagnostics & Logs</span>
          </div>
          <Keycap>⌘L</Keycap>
        </button>
      </div>
    </aside>
  );
};
