import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import type { ChatMessageItem as ChatMessageType, FamilyMember, CitedChunk } from '../../../shared/types';
import { ChatCitationBadge } from './ChatCitationBadge';

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

  const isUser = message.role === 'user';
  const scopedMember = message.scopedMemberId
    ? members.find((m) => m.id === message.scopedMemberId)
    : null;

  // Simple Markdown formatting helper for bold, lists, and headings
  const renderFormattedContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Heading 3
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-base font-semibold text-primary mt-3 mb-1.5">
            {line.replace('### ', '')}
          </h3>
        );
      }
      // Heading 2
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg font-bold text-primary mt-4 mb-2">
            {line.replace('## ', '')}
          </h2>
        );
      }
      // Unordered list item
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemContent = line.slice(2);
        return (
          <li key={idx} className="ml-4 list-disc text-secondary my-0.5 leading-relaxed">
            {renderInlineMarkdown(itemContent)}
          </li>
        );
      }
      // Ordered list item
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="ml-4 list-decimal text-secondary my-0.5 leading-relaxed">
            {renderInlineMarkdown(numMatch[2])}
          </li>
        );
      }
      // Empty line / paragraph break
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      // Normal paragraph
      return (
        <p key={idx} className="text-secondary leading-relaxed my-1">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (line: string) => {
    // Parse bold text **something**
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-primary">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  if (isUser) {
    return (
      <div className="flex flex-col items-end my-3 px-4">
        {/* Scoped Member Tag */}
        {scopedMember && (
          <div className="flex items-center gap-1.5 mb-1 mr-1 text-[11px] text-tertiary">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: scopedMember.avatar_color || '#14b8a6' }}
            />
            <span>Scoped to {scopedMember.name}'s records</span>
          </div>
        )}

        {/* User Message Bubble */}
        <div className="max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-xs bg-teal-600 text-white shadow-xs">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="flex gap-3 my-4 px-4 group">
      {/* Assistant Avatar */}
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
        <Sparkles className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Assistant Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-primary">MedBuddy Assistant</span>
          {scopedMember && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-surface-recessed border border-border text-tertiary">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: scopedMember.avatar_color || '#14b8a6' }}
              />
              <span>{scopedMember.name}</span>
            </span>
          )}
          {message.latencyMs && (
            <span className="text-[10px] text-tertiary ml-auto flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {(message.latencyMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {/* Collapsible Clinical Reasoning Drawer */}
        {message.reasoningContent && (
          <div className="mb-3 rounded-xl border border-border/70 bg-surface-recessed/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsReasoningOpen((prev) => !prev)}
              className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-tertiary hover:text-secondary cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="font-medium text-[11px]">Clinical Reasoning Process</span>
              </div>
              {isReasoningOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-tertiary" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-tertiary" />
              )}
            </button>
            {isReasoningOpen && (
              <div className="p-3 pt-1 border-t border-border/40 text-xs text-tertiary font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto bg-surface/40">
                {message.reasoningContent}
              </div>
            )}
          </div>
        )}

        {/* Message Content */}
        <div className="text-sm">
          {message.content ? (
            renderFormattedContent(message.content)
          ) : isStreamingActive ? (
            <div className="flex items-center gap-1.5 text-xs text-tertiary py-2">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              <span>Synthesizing records and consulting documents...</span>
            </div>
          ) : null}
        </div>

        {/* Interactive Document Citations */}
        {message.citedChunks && message.citedChunks.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-border/60">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-secondary">
              <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Grounded Document Sources ({message.citedChunks.length}):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.citedChunks.map((chunk) => (
                <ChatCitationBadge
                  key={chunk.chunkId}
                  citation={chunk}
                  onClick={() => onOpenDocumentPreview?.(chunk.documentId, chunk.pageNumber)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
