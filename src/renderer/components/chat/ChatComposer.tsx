import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  Send,
  Square,
  ChevronDown,
  User,
  Sparkles,
  FileText,
  CornerDownLeft,
} from 'lucide-react';
import type { FamilyMember } from '../../../shared/types';
import { MentionAutocomplete } from './MentionAutocomplete';

interface ChatComposerProps {
  selectedMember: FamilyMember | null;
  members: FamilyMember[];
  memberDocCounts?: Record<string, number>;
  onSelectMember: (member: FamilyMember) => void;
  onSendMessage: (text: string, memberId: string) => void;
  onStopStreaming?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  selectedMember,
  members,
  memberDocCounts = {},
  onSelectMember,
  onSendMessage,
  onStopStreaming,
  isStreaming = false,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [mentionState, setMentionState] = useState<{
    isOpen: boolean;
    filterText: string;
    mentionIndex: number;
    selectedIndex: number;
  }>({
    isOpen: false,
    filterText: '',
    mentionIndex: -1,
    selectedIndex: 0,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [inputText]);

  // Close member dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    };
    if (isMemberDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMemberDropdownOpen]);

  // Handle text changes and detect '@'
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInputText(value);

    // Look back from cursor to find if we're in an '@' mention
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const charBeforeAt = lastAtPos > 0 ? textBeforeCursor[lastAtPos - 1] : ' ';
      // Ensure '@' is preceded by whitespace or at start of input
      if (/\s/.test(charBeforeAt) || lastAtPos === 0) {
        const query = textBeforeCursor.slice(lastAtPos + 1);
        // Only trigger if no spaces after '@'
        if (!/\s/.test(query)) {
          setMentionState({
            isOpen: true,
            filterText: query,
            mentionIndex: lastAtPos,
            selectedIndex: 0,
          });
          return;
        }
      }
    }

    if (mentionState.isOpen) {
      setMentionState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleSelectMention = (member: FamilyMember) => {
    onSelectMember(member);

    // Replace the '@partial' with the member mention or clear it cleanly
    if (mentionState.mentionIndex !== -1) {
      const beforeMention = inputText.slice(0, mentionState.mentionIndex);
      const afterCursor = inputText.slice(textareaRef.current?.selectionStart || inputText.length);
      const newText = `${beforeMention}@${member.name} ${afterCursor}`;
      setInputText(newText);
    }

    setMentionState({
      isOpen: false,
      filterText: '',
      mentionIndex: -1,
      selectedIndex: 0,
    });

    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState.isOpen) {
      const filtered = members.filter((m) => {
        const q = mentionState.filterText.toLowerCase();
        return !q || m.name.toLowerCase().includes(q) || m.relationship.toLowerCase().includes(q);
      });

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % Math.max(1, filtered.length),
        }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + filtered.length) % Math.max(1, filtered.length),
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

      {/* Main Composer Box */}
      <div className="bg-surface rounded-2xl border border-border focus-within:border-teal-500/60 focus-within:ring-2 focus-within:ring-teal-500/15 shadow-sm transition-all flex flex-col">
        {/* Scoped Profile Control Header */}
        <div className="px-3.5 pt-3 pb-1.5 flex items-center justify-between gap-2 border-b border-border/40 select-none">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsMemberDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-recessed hover:bg-surface-raised border border-border transition-colors cursor-pointer group"
              title="Click to switch profile documents scope"
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/20"
                style={{ backgroundColor: selectedMember?.avatar_color || '#14b8a6' }}
              />
              <span className="text-secondary font-medium group-hover:text-primary">
                {selectedMember ? selectedMember.name : 'Select Profile'}
              </span>
              <span className="text-[10px] text-tertiary">
                ({activeDocCount} {activeDocCount === 1 ? 'doc' : 'docs'})
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-tertiary group-hover:text-secondary shrink-0 transition-transform" />
            </button>

            {/* Profile Dropdown Menu */}
            {isMemberDropdownOpen && (
              <div className="absolute top-full mt-1.5 left-0 w-64 bg-surface rounded-xl border border-border shadow-lg py-1.5 z-50 animate-fade-in-scale">
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
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                          style={{ backgroundColor: m.avatar_color || '#14b8a6' }}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{m.name}</span>
                            <span className="text-[10px] text-tertiary">({m.relationship})</span>
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
            <span>Type <kbd className="px-1 py-0.5 rounded bg-surface-recessed border border-border text-[10px] font-mono">@</kbd> to mention a profile</span>
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
        <div className="px-3 pb-2.5 pt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-tertiary">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="text-[11px]">Searches {selectedMember?.name || 'profile'}'s records & citations</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white shadow-xs transition-colors cursor-pointer"
                title="Stop response generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!inputText.trim() || disabled}
                className={`inline-flex items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                  inputText.trim() && !disabled
                    ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-xs hover:scale-105 active:scale-95'
                    : 'bg-surface-recessed text-tertiary cursor-not-allowed border border-border/50'
                }`}
                title="Send message (Enter)"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
