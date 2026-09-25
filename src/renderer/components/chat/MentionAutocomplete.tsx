import React, { useEffect, useRef } from 'react';
import { User, FileText } from 'lucide-react';
import type { FamilyMember } from '../../../shared/types';

interface MentionAutocompleteProps {
  members: FamilyMember[];
  memberDocCounts?: Record<string, number>;
  filterText: string;
  selectedIndex: number;
  onSelect: (member: FamilyMember) => void;
  onClose: () => void;
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  members,
  memberDocCounts = {},
  filterText,
  selectedIndex,
  onSelect,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanFilter = filterText.toLowerCase().trim();
  const filteredMembers = members.filter((m) => {
    if (!cleanFilter) return true;
    return (
      m.name.toLowerCase().includes(cleanFilter) ||
      m.relationship.toLowerCase().includes(cleanFilter)
    );
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredMembers.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full mb-2 left-0 w-80 bg-surface rounded-xl border border-border shadow-xl overflow-hidden z-50 animate-fade-in-scale"
      role="listbox"
      aria-label="Family Member Profiles"
    >
      <div className="px-3 py-2 bg-surface-recessed border-b border-border flex items-center justify-between text-[11px] text-tertiary uppercase tracking-wider font-semibold">
        <span>Scope query to profile</span>
        <span className="text-[10px] font-normal normal-case">@mention</span>
      </div>

      <div className="max-h-56 overflow-y-auto p-1 divide-y divide-border/40">
        {filteredMembers.map((member, idx) => {
          const isSelected = idx === selectedIndex;
          const count = memberDocCounts[member.id] || 0;

          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelect(member)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-teal-50 dark:bg-teal-950/40 text-primary border-l-2 border-teal-500'
                  : 'hover:bg-surface-recessed text-secondary'
              }`}
              role="option"
              aria-selected={isSelected}
            >
              {/* Member Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-xs"
                style={{ backgroundColor: member.avatar_color || '#14b8a6' }}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>

              {/* Name & Relationship */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate text-primary">
                    {member.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-raised border border-border text-tertiary">
                    {member.relationship}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-tertiary mt-0.5">
                  <FileText className="w-3 h-3 text-tertiary" />
                  <span>{count} document{count === 1 ? '' : 's'}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-3 py-1.5 bg-surface-recessed border-t border-border flex items-center justify-between text-[10px] text-tertiary">
        <span>Use <kbd className="px-1 py-0.5 bg-surface rounded border border-border">↑</kbd> <kbd className="px-1 py-0.5 bg-surface rounded border border-border">↓</kbd> to navigate</span>
        <span><kbd className="px-1 py-0.5 bg-surface rounded border border-border">↵</kbd> select</span>
      </div>
    </div>
  );
};
