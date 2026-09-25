import React, { useState } from 'react';
import {
  FileText,
  Activity,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Pill,
  ClipboardList,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import type { CitedChunk } from '../../../shared/types';

interface ChatSourcesDrawerProps {
  citedChunks: CitedChunk[];
  onOpenDocumentPreview?: (documentId: string, pageNumber?: number) => void;
}

interface GroupedSource {
  documentId: string;
  filename: string;
  documentDate?: string | null;
  pages: number[];
  chunks: CitedChunk[];
  category: 'lab' | 'imaging' | 'prescription' | 'note' | 'general';
}

function getDocumentCategory(filename: string): GroupedSource['category'] {
  const lower = filename.toLowerCase();
  if (lower.includes('blood') || lower.includes('lab') || lower.includes('cbc') || lower.includes('panel') || lower.includes('serology') || lower.includes('fish')) {
    return 'lab';
  }
  if (lower.includes('ct') || lower.includes('scan') || lower.includes('ultrasound') || lower.includes('xray') || lower.includes('mri')) {
    return 'imaging';
  }
  if (lower.includes('prescription') || lower.includes('medication') || lower.includes('rx')) {
    return 'prescription';
  }
  if (lower.includes('note') || lower.includes('opd') || lower.includes('clinical') || lower.includes('discharge')) {
    return 'note';
  }
  return 'general';
}

function getCategoryMeta(category: GroupedSource['category']) {
  switch (category) {
    case 'lab':
      return {
        label: 'Lab Report',
        icon: Activity,
        badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      };
    case 'imaging':
      return {
        label: 'Imaging Scan',
        icon: Layers,
        badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      };
    case 'prescription':
      return {
        label: 'Prescription',
        icon: Pill,
        badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      };
    case 'note':
      return {
        label: 'Clinical Note',
        icon: ClipboardList,
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      };
    default:
      return {
        label: 'Document',
        icon: FileText,
        badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      };
  }
}

export const ChatSourcesDrawer: React.FC<ChatSourcesDrawerProps> = ({
  citedChunks,
  onOpenDocumentPreview,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activePreviewChunk, setActivePreviewChunk] = useState<CitedChunk | null>(null);

  if (!citedChunks || citedChunks.length === 0) return null;

  // Group citations by unique documentId
  const groupedMap = new Map<string, GroupedSource>();

  for (const chunk of citedChunks) {
    const existing = groupedMap.get(chunk.documentId);
    if (existing) {
      if (!existing.pages.includes(chunk.pageNumber)) {
        existing.pages.push(chunk.pageNumber);
      }
      existing.chunks.push(chunk);
    } else {
      groupedMap.set(chunk.documentId, {
        documentId: chunk.documentId,
        filename: chunk.filename,
        documentDate: chunk.documentDate,
        pages: [chunk.pageNumber],
        chunks: [chunk],
        category: getDocumentCategory(chunk.filename),
      });
    }
  }

  const groupedSources = Array.from(groupedMap.values());

  return (
    <div className="mt-4 pt-3.5 border-t border-border/60">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-2.5 select-none">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer group"
        >
          <div className="w-5 h-5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <span>Grounded Document Sources</span>
          <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-surface-recessed text-tertiary border border-border">
            {groupedSources.length} {groupedSources.length === 1 ? 'record' : 'records'} · {citedChunks.length} {citedChunks.length === 1 ? 'citation' : 'citations'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-tertiary group-hover:text-secondary transition-transform" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-tertiary group-hover:text-secondary transition-transform" />
          )}
        </button>

        <span className="text-[10px] text-tertiary hidden sm:inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          Strict Profile Isolated
        </span>
      </div>

      {/* Sources Grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
          {groupedSources.map((source) => {
            const meta = getCategoryMeta(source.category);
            const Icon = meta.icon;
            const sortedPages = [...source.pages].sort((a, b) => a - b);

            return (
              <div
                key={source.documentId}
                onClick={() => onOpenDocumentPreview?.(source.documentId, sortedPages[0])}
                className="group relative flex flex-col justify-between p-2.5 rounded-xl border border-border/80 bg-surface hover:bg-surface-recessed hover:border-teal-500/40 shadow-xs hover:shadow-sm transition-all cursor-pointer text-left"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${meta.badgeBg}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{meta.label}</span>
                    </span>

                    {source.documentDate && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-tertiary">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{source.documentDate}</span>
                      </span>
                    )}
                  </div>

                  <h4
                    className="text-xs font-semibold text-primary group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1"
                    title={source.filename}
                  >
                    {source.filename}
                  </h4>
                </div>

                <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-border/40 text-[11px] text-tertiary">
                  <div className="flex items-center gap-1 truncate">
                    <span>Pages:</span>
                    <span className="font-medium text-secondary">
                      {sortedPages.map((p) => `p.${p}`).join(', ')}
                    </span>
                    <span className="text-[10px] text-tertiary">
                      ({source.chunks.length} {source.chunks.length === 1 ? 'excerpt' : 'excerpts'})
                    </span>
                  </div>

                  <ExternalLink className="w-3 h-3 text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
