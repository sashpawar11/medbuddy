import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Sparkles,
  ChevronDown,
  AtSign,
  ShieldCheck,
  CornerDownLeft,
} from 'lucide-react';
import type { FamilyMember } from '../../../shared/types';
import { MentionAutocomplete } from './MentionAutocomplete';

interface ChatComposerProps {
  members: FamilyMember[];
  selectedMember: FamilyMember | null;
  memberDocCounts?: Record<string, number>;
  onSelectMember: (member: FamilyMember) => void;
  onSendMessage: (text: string, memberId: string) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  members,
  selectedMember,
  memberDocCounts: propDocCounts,
  onSelectMember,
  onSendMessage,
  onStopStreaming,
  isStreaming,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [internalDocCounts, setInternalDocCounts] = useState<Record<string, number>>({});
  const memberDocCounts = propDocCounts || internalDocCounts;

  // @mention state
  const [mentionState, setMentionState] = useState<{
    isOpen: boolean;
    filterText: string;
    selectedIndex: number;
    matchIndex: number;
  }>({
    isOpen: false,
    filterText: '',
    selectedIndex: 0,
    matchIndex: -1,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch document counts for members to display in scoping badges
  useEffect(() => {
    let isSubscribed = true;
    const loadCounts = async () => {
      const counts: Record<string, number> = {};
      for (const m of members) {
        try {
          const folders = await window.medbuddy.listFolders(m.id);
          let total = 0;
          for (const f of folders) {
            const docs = await window.medbuddy.listDocuments(f.id);
            total += docs.length;
          }
          counts[m.id] = total;
        } catch {
          counts[m.id] = 0;
        }
      }
      if (isSubscribed) {
        setInternalDocCounts(counts);
      }
    };
    loadCounts();
    return () => {
      isSubscribed = false;
    };
  }, [members]);

  // Click outside to close member dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  // Handle typing to trigger @mention menu
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart || val.length;
    setInputText(val);

    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1) {
      const charBeforeAt = lastAtIdx > 0 ? textBeforeCursor[lastAtIdx - 1] : ' ';
      if (/\s/.test(charBeforeAt) || lastAtIdx === 0) {
        const query = textBeforeCursor.slice(lastAtIdx + 1);
        if (!/\s/.test(query)) {
          setMentionState({
            isOpen: true,
            filterText: query,
            selectedIndex: 0,
            matchIndex: lastAtIdx,
          });
          return;
        }
      }
    }

    if (mentionState.isOpen) {
      setMentionState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Select member from @mention menu
  const handleSelectMention = (member: FamilyMember) => {
    onSelectMember(member);
    if (mentionState.matchIndex !== -1 && textareaRef.current) {
      const before = inputText.slice(0, mentionState.matchIndex);
      const after = inputText.slice(textareaRef.current.selectionStart || inputText.length);
      setInputText(before + after);
    }
    setMentionState((prev) => ({ ...prev, isOpen: false }));
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Keyboard navigation for @mention and submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState.isOpen) {
      const filtered = members.filter((m) =>
        m.name.toLowerCase().includes(mentionState.filterText.toLowerCase())
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % (filtered.length || 1),
        }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + (filtered.length || 1)) % (filtered.length || 1),
        }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[mentionState.selectedIndex]) {
          handleSelectMention(filtered[mentionState.selectedIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionState((prev) => ({ ...prev, isOpen: false }));
        return;
      }
    }

    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming || disabled) return;

    if (!selectedMember) {
      if (members.length > 0) {
        onSelectMember(members[0]);
        onSendMessage(trimmed, members[0].id);
        setInputText('');
      }
      return;
    }

    onSendMessage(trimmed, selectedMember.id);
    setInputText('');
  };

  const activeDocCount = selectedMember ? memberDocCounts[selectedMember.id] || 0 : 0;

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Floating Mention Autocomplete */}
      {mentionState.isOpen && (
        <MentionAutocomplete
          members={members}
          memberDocCounts={memberDocCounts}
          filterText={mentionState.filterText}
          selectedIndex={mentionState.selectedIndex}
          onSelect={handleSelectMention}
          onClose={() => setMentionState((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Main Composer Card */}
      <div className="bg-surface rounded border border-border focus-within:border-teal-500/60 shadow-2xs transition-all flex flex-col">
        {/* Scoped Profile Control Header */}
        <div className="px-3.5 pt-2 pb-1.5 flex items-center justify-between gap-2 border-b border-border/40 select-none">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsMemberDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-surface-recessed hover:bg-surface-raised border border-border hover:border-teal-500/40 text-secondary hover:text-primary transition-all cursor-pointer group shadow-2xs"
              title="Click to switch profile documents scope"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: selectedMember?.avatar_color || '#14b8a6' }}
              />
              <span className="font-semibold text-primary">
                {selectedMember ? selectedMember.name : 'Select Profile'}
              </span>
              <span className="text-[10px] text-tertiary font-normal">
                ({activeDocCount} {activeDocCount === 1 ? 'record' : 'records'})
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-tertiary group-hover:text-secondary shrink-0 transition-transform" />
            </button>

            {/* Profile Dropdown Menu */}
            {isMemberDropdownOpen && (
              <div className="absolute top-full mt-1 left-0 w-64 bg-surface rounded border border-border shadow-md py-1 z-50">
                <div className="px-3 py-1 text-[10px] uppercase font-semibold text-tertiary tracking-wider border-b border-border/40 mb-1">
                  Scope Query to Profile
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {members.map((m) => {
                    const isCurrent = m.id === selectedMember?.id;
                    const docCount = memberDocCounts[m.id] || 0;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onSelectMember(m);
                          setIsMemberDropdownOpen(false);
                          textareaRef.current?.focus();
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-teal-50 dark:bg-teal-950/40 text-primary font-medium'
                            : 'hover:bg-surface-recessed text-secondary'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                          style={{ backgroundColor: m.avatar_color || '#14b8a6' }}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{m.name}</span>
                            <span className="text-[10px] text-tertiary font-normal">({m.relationship})</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-tertiary shrink-0">
                          {docCount} docs
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <span className="text-[11px] text-tertiary hidden sm:inline-flex items-center gap-1">
            <span>Type <kbd className="px-1 py-0.5 rounded bg-surface-recessed border border-border text-[10px] font-mono">@</kbd> to switch profile</span>
          </span>
        </div>

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isStreaming}
          rows={1}
          placeholder={
            selectedMember
              ? `Ask a question about ${selectedMember.name}'s medical records, lab trends, or medications...`
              : 'Ask a question about records (type @ to select profile)...'
          }
          className="w-full px-4 py-3 bg-transparent text-sm text-primary placeholder:text-tertiary resize-none focus:outline-hidden min-h-[44px] max-h-[180px] leading-relaxed"
        />

        {/* Composer Footer Actions */}
        <div className="px-3.5 pb-2 pt-1 flex items-center justify-between gap-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-tertiary">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="text-[11px]">
              Grounded search in {selectedMember ? `${selectedMember.name}'s` : ''} records
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-[10px] text-tertiary hidden md:inline-flex items-center gap-1">
              <span>Return to send</span>
              <CornerDownLeft className="w-2.5 h-2.5" />
            </span>

            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-2xs transition-all cursor-pointer"
                title="Stop response generation"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!inputText.trim() || disabled}
                className={`inline-flex items-center justify-center w-7 h-7 rounded transition-all cursor-pointer ${
                  inputText.trim() && !disabled
                    ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-2xs hover:bg-teal-500'
                    : 'bg-surface-recessed text-tertiary cursor-not-allowed border border-border/50'
                }`}
                title="Send message (Enter)"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
