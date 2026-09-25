import React from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  User,
  Filter,
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
  const filteredSessions = filterMemberId
    ? sessions.filter((s) => s.memberId === filterMemberId)
    : sessions;

  return (
    <div className="w-64 border-r border-border bg-surface flex flex-col h-full shrink-0 select-none">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
          Consultations
        </span>
        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-colors cursor-pointer"
          title="Start new chat session"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Member Filter Dropdown */}
      {members.length > 1 && (
        <div className="px-3 py-2 border-b border-border/50 bg-surface-recessed/40">
          <div className="flex items-center gap-1.5 text-[11px] text-tertiary mb-1">
            <Filter className="w-3 h-3" />
            <span>Filter by profile:</span>
          </div>
          <select
            value={filterMemberId || ''}
            onChange={(e) => onFilterMemberChange(e.target.value ? e.target.value : null)}
            className="w-full text-xs px-2 py-1 rounded-md border border-border bg-surface text-secondary focus:outline-hidden"
          >
            <option value="">All Family Profiles</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.relationship})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-tertiary">
            No consultations yet.
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const member = members.find((m) => m.id === session.memberId);

            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-950/40 text-primary font-medium border border-teal-500/30'
                    : 'hover:bg-surface-recessed text-secondary'
                }`}
              >
                <div className="flex-1 min-w-0 pr-6">
                  {/* Session Title */}
                  <div className="truncate text-xs text-primary font-medium">
                    {session.title}
                  </div>

                  {/* Member & Date Subtitle */}
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-tertiary">
                    {member && (
                      <div className="flex items-center gap-1 shrink-0">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: member.avatar_color || '#14b8a6' }}
                        />
                        <span className="truncate max-w-[80px]">{member.name}</span>
                      </div>
                    )}
                    <span>•</span>
                    <span className="truncate">
                      {new Date(session.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="absolute right-2 p-1 rounded-md text-tertiary hover:text-red-500 hover:bg-surface opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete consultation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
