import React from 'react';
import { FileText, Calendar, ExternalLink } from 'lucide-react';
import type { CitedChunk } from '../../../shared/types';

interface ChatCitationBadgeProps {
  citation: CitedChunk;
  onClick?: () => void;
  className?: string;
}

export const ChatCitationBadge: React.FC<ChatCitationBadgeProps> = ({
  citation,
  onClick,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border text-left cursor-pointer transition-all ${
        onClick
          ? 'bg-surface hover:bg-surface-recessed border-border hover:border-teal-500/50 text-secondary hover:text-primary shadow-xs'
          : 'bg-surface-recessed border-border text-tertiary cursor-default'
      } ${className}`}
      title={citation.snippet ? `Snippet: ${citation.snippet.slice(0, 180)}...` : undefined}
    >
      <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 group-hover:scale-105 transition-transform" />
      
      <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]" title={citation.filename}>
        {citation.filename}
      </span>

      <span className="text-[10px] px-1 py-0.2 rounded bg-surface-raised border border-border text-tertiary shrink-0">
        p.{citation.pageNumber}
      </span>

      {citation.documentDate && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-tertiary shrink-0">
          <Calendar className="w-2.5 h-2.5 text-tertiary" />
          {citation.documentDate}
        </span>
      )}

      {onClick && (
        <ExternalLink className="w-3 h-3 text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-0.5" />
      )}
    </button>
  );
};
