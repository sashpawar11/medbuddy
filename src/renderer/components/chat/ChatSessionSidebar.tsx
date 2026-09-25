import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  User,
  Filter,
  Search,
  X,
  Calendar,
} from 'lucide-react';
import type { ChatSessionItem, FamilyMember } from '../../../shared/types';

interface ChatSessionSidebarProps {
  sessions: ChatSessionItem[];
  activeSessionId: string | null;
  members: FamilyMember[];
  filterMemberId: string | null;
  onFilterMemberChange: (memberId: string | null) => void;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const ChatSessionSidebar: React.FC<ChatSessionSidebarProps> = ({
  sessions,
  activeSessionId,
  members,
  filterMemberId,
  onFilterMemberChange,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sessions by member and search query
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filterMemberId && s.memberId !== filterMemberId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.title.toLowerCase().includes(q);
      }
      return true;
    });
  }, [sessions, filterMemberId, searchQuery]);

  // Group sessions by timeframe (Today, Yesterday, Previous 7 Days, Older)
  const groupedSessions = useMemo(() => {
    const today: ChatSessionItem[] = [];
    const yesterday: ChatSessionItem[] = [];
    const lastWeek: ChatSessionItem[] = [];
    const older: ChatSessionItem[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;

    for (const session of filteredSessions) {
      const time = new Date(session.updatedAt).getTime();
      if (time >= todayStart) {
        today.push(session);
      } else if (time >= yesterdayStart) {
        yesterday.push(session);
      } else if (time >= weekStart) {
        lastWeek.push(session);
      } else {
        older.push(session);
      }
    }

    return [
      { label: 'Today', items: today },
      { label: 'Yesterday', items: yesterday },
      { label: 'Previous 7 Days', items: lastWeek },
      { label: 'Older', items: older },
    ].filter((g) => g.items.length > 0);
  }, [filteredSessions]);

  return (
    <div className="w-72 border-r border-border bg-surface flex flex-col h-full shrink-0 select-none transition-all">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span className="text-xs font-semibold text-primary tracking-tight">
            Consultations
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-recessed text-tertiary border border-border">
            {filteredSessions.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white shadow-xs hover:shadow-sm transition-all cursor-pointer"
          title="Start new consultation (⌘N)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Search & Profile Scope Filter */}
      <div className="p-2.5 border-b border-border/50 bg-surface-recessed/30 space-y-2">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-tertiary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search consultations..."
            className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-border bg-surface text-primary placeholder:text-tertiary focus:outline-hidden focus:border-teal-500/60 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Profile Filter Badges */}
        {members.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => onFilterMemberChange(null)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer border ${
                filterMemberId === null
                  ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500/40 text-teal-700 dark:text-teal-300'
                  : 'bg-surface border-border text-tertiary hover:text-secondary'
              }`}
            >
              All
            </button>
            {members.map((m) => {
              const isSelected = filterMemberId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onFilterMemberChange(isSelected ? null : m.id)}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500/40 text-teal-700 dark:text-teal-300'
                      : 'bg-surface border-border text-tertiary hover:text-secondary'
                  }`}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: m.avatar_color || '#14b8a6' }}
                  />
                  <span>{m.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <MessageSquare className="w-8 h-8 text-tertiary/40 mx-auto mb-2" />
            <p className="text-xs font-medium text-secondary">No consultations found</p>
            <p className="text-[11px] text-tertiary mt-0.5">
              {searchQuery ? 'Try a different search term' : 'Start a new consultation above'}
            </p>
          </div>
        ) : (
          groupedSessions.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-2 text-[10px] font-semibold text-tertiary uppercase tracking-wider">
                {group.label}
              </div>

              {group.items.map((session) => {
                const isActive = session.id === activeSessionId;
                const member = members.find((m) => m.id === session.memberId);

                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-teal-500/10 text-primary font-medium border border-teal-500/30 shadow-2xs'
                        : 'hover:bg-surface-recessed text-secondary border border-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="truncate text-xs text-primary font-medium leading-snug">
                        {session.title}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-tertiary">
                        {member && (
                          <div className="flex items-center gap-1 shrink-0">
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: member.avatar_color || '#14b8a6' }}
                            />
                            <span className="truncate max-w-[80px] font-normal">{member.name}</span>
                          </div>
                        )}
                        <span>•</span>
                        <span className="truncate text-[10px]">
                          {new Date(session.updatedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Delete Session Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="absolute right-2 p-1.5 rounded-lg text-tertiary hover:text-red-500 hover:bg-surface opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete consultation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
