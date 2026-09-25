import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Check,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';
import { marked } from 'marked';
import type { ChatMessageItem as ChatMessageType, FamilyMember } from '../../../shared/types';
import { ChatSourcesDrawer } from './ChatSourcesDrawer';

// Configure marked for clean GFM parsing
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface ChatMessageItemProps {
  message: ChatMessageType;
  members: FamilyMember[];
  onOpenDocumentPreview?: (documentId: string, pageNumber?: number) => void;
  isStreamingActive?: boolean;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  members,
  onOpenDocumentPreview,
  isStreamingActive = false,
}) => {
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';
  const scopedMember = message.scopedMemberId
    ? members.find((m) => m.id === message.scopedMemberId)
    : null;

  // Convert markdown to sanitized, styled HTML
  const parsedHtml = useMemo(() => {
    if (!message.content) return '';
    try {
      let rawHtml = marked.parse(message.content) as string;
      // Wrap all <table> elements in <div class="table-container"> for responsive horizontal scroll & modern borders
      rawHtml = rawHtml.replace(/<table>/g, '<div class="table-container"><table>');
      rawHtml = rawHtml.replace(/<\/table>/g, '</table></div>');
      return rawHtml;
    } catch {
      return message.content;
    }
  }, [message.content]);

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  // --- 1. User Message Turn ---
  if (isUser) {
    return (
      <div className="flex flex-col items-end my-4 px-4 sm:px-6">
        {/* Scoped Member Subtitle */}
        {scopedMember && (
          <div className="flex items-center gap-1.5 mb-1.5 mr-1 text-[11px] text-tertiary">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: scopedMember.avatar_color || '#14b8a6' }}
            />
            <span className="font-medium">Scoped to {scopedMember.name}'s records</span>
          </div>
        )}

        {/* User Message Bubble */}
        <div className="max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded bg-teal-600 dark:bg-teal-700 text-white shadow-2xs font-normal border border-teal-500/30">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  // --- 2. Assistant Message Turn ---
  return (
    <div className="flex gap-3.5 my-6 px-4 sm:px-6 group">
      {/* Assistant Avatar */}
      <div className="w-7 h-7 rounded bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
        <Sparkles className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Top Header with Profile Badge, Model Latency, and Copy Button */}
        <div className="flex items-center justify-between gap-2 mb-2 select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary tracking-tight">MedBuddy Assistant</span>
            
            {scopedMember && (
              <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-surface-recessed border border-border text-secondary">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: scopedMember.avatar_color || '#14b8a6' }}
                />
                <span className="font-medium">{scopedMember.name}</span>
              </span>
            )}

            {message.latencyMs && (
              <span className="text-[10px] text-tertiary flex items-center gap-1 bg-surface-recessed/60 px-1.5 py-0.5 rounded border border-border/40">
                <Clock className="w-2.5 h-2.5" />
                {(message.latencyMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-tertiary hover:text-secondary hover:bg-surface-recessed border border-transparent hover:border-border transition-all cursor-pointer"
              title="Copy response"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Clinical Reasoning Accordion */}
        {message.reasoningContent && (
          <div className="mb-3.5 rounded border border-border bg-surface-recessed/40 overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setIsReasoningOpen((prev) => !prev)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs text-secondary hover:text-primary hover:bg-surface-recessed/80 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Brain className="w-3 h-3" />
                </div>
                <span className="font-medium text-xs">Clinical Reasoning Process</span>
                <span className="text-[10px] text-tertiary font-mono">
                  ({message.reasoningContent.length} chars)
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-tertiary">
                <span>{isReasoningOpen ? 'Hide' : 'Inspect'}</span>
                {isReasoningOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {isReasoningOpen && (
              <div className="p-3.5 pt-2 border-t border-border/50 text-xs text-secondary font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-surface-recessed/30">
                {message.reasoningContent}
              </div>
            )}
          </div>
        )}

        {/* Primary Formatted Markdown Prose */}
        <div className="chat-prose">
          {message.content ? (
            <div dangerouslySetInnerHTML={{ __html: parsedHtml }} />
          ) : isStreamingActive ? (
            <div className="flex items-center gap-2 text-xs text-tertiary py-3">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              <span>Consulting clinical records and synthesizing citations...</span>
            </div>
          ) : null}
        </div>

        {/* Perplexity-style Grouped Document Sources Drawer */}
        {message.citedChunks && message.citedChunks.length > 0 && (
          <ChatSourcesDrawer
            citedChunks={message.citedChunks}
            onOpenDocumentPreview={onOpenDocumentPreview}
          />
        )}
      </div>
    </div>
  );
};
