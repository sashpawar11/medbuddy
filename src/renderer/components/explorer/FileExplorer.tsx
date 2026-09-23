import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Sparkles,
  CheckSquare,
  Square,
  FileCode,
  Image as ImageIcon,
  Clock,
  HardDrive,
  Cloud,
  RotateCcw,
} from 'lucide-react';
import type { DocumentItem, Folder, FamilyMember } from '../../../shared/types';
import { Keycap } from '../common/Keycap';
import { OcrStatusBadge } from '../common/OcrStatusBadge';
import { useOcrProgress } from '../../hooks/useOcrProgress';

interface Props {
  member: FamilyMember;
  folder: Folder;
  documents: DocumentItem[];
  onImportFiles: (filePaths: string[]) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onPreviewDocument: (document: DocumentItem) => void;
  onTriggerAnalysis: (scopeType: 'file' | 'selection' | 'folder', docIds: string[], title: string) => void;
  onOpenSyncFolder?: (folderId: string) => void;
}

export const FileExplorer: React.FC<Props> = ({
  member,
  folder,
  documents,
  onImportFiles,
  onDeleteDocument,
  onPreviewDocument,
  onTriggerAnalysis,
  onOpenSyncFolder,
}) => {
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const ocrProgress = useOcrProgress();

  const toggleSelect = (id: string) => {
    const next = new Set(selectedDocIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDocIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.size === documents.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(documents.map((d) => d.id)));
    }
  };

  const handleOpenFileDialog = async () => {
    const filePaths = await window.medbuddy.openFileDialog();
    if (filePaths.length > 0) {
      await onImportFiles(filePaths);
    }
  };

  // Drag and Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const paths = files.map((f: any) => f.path).filter(Boolean);
      if (paths.length > 0) {
        await onImportFiles(paths);
      }
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-accent-red" />;
    if (fileType.includes('image')) return <ImageIcon className="w-4 h-4 text-accent-blue" />;
    return <FileCode className="w-4 h-4 text-mute" />;
  };

  const hasSelection = selectedDocIds.size > 0;
  const analysisTargetIds = hasSelection
    ? Array.from(selectedDocIds)
    : documents.map((d) => d.id);
  const analysisScopeType = hasSelection ? 'selection' : 'folder';
  const analysisTitle = hasSelection
    ? `${selectedDocIds.size} Selected Document(s)`
    : `${folder.name} (All ${documents.length} Docs)`;

  return (
    <div
      className="flex-1 flex flex-col h-full bg-canvas relative overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-surface-elevated/95 border-2 border-dashed border-hairline-strong flex flex-col items-center justify-center pointer-events-none">
          <Upload className="w-10 h-10 text-ink mb-3" />
          <p className="text-sm font-semibold text-ink">Drop files here</p>
          <p className="text-xs text-mute mt-1">Saved into {folder.name}</p>
        </div>
      )}

      {/* Breadcrumb & Action Topbar */}
      <header className="h-14 px-6 border-b border-hairline flex items-center justify-between shrink-0 bg-surface/40 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone font-medium">{member.name}</span>
          <span className="text-stone">/</span>
          <span className="text-ink font-semibold">{folder.name}</span>
          <span className="text-[11px] text-stone ml-1 tabular-nums">
            ({documents.length} {documents.length === 1 ? 'record' : 'records'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenFileDialog}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-ink bg-surface-elevated hover:bg-surface-card border border-hairline rounded-md"
          >
            <Upload className="w-3.5 h-3.5 text-stone" />
            Import
          </button>

          {onOpenSyncFolder && (
            <button
              onClick={() => onOpenSyncFolder(folder.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-ink bg-surface-elevated hover:bg-surface-card border border-hairline rounded-md"
              title={`Sync "${folder.name}" to Google Drive`}
            >
              <Cloud className="w-3.5 h-3.5 text-stone" />
              <span>Sync</span>
            </button>
          )}

          {documents.length > 0 && (
            <button
              onClick={() =>
                onTriggerAnalysis(analysisScopeType, analysisTargetIds, analysisTitle)
              }
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold bg-primary text-primary-text hover:bg-primary-pressed rounded-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {hasSelection
                  ? `Analyze (${selectedDocIds.size})`
                  : 'Analyze Folder'}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Main File Table or Empty State */}
      <div className="flex-1 overflow-y-auto p-5">
        {documents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border border-dashed border-hairline rounded-xl p-10 text-center">
            <div className="w-10 h-10 rounded-full bg-surface-elevated border border-hairline flex items-center justify-center mb-4 text-stone">
              <Upload className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-ink mb-1">No documents yet</h3>
            <p className="text-xs text-mute max-w-sm mb-5">
              Drag &amp; drop lab results, radiology summaries, or doctor notes, or click below.
            </p>
            <button
              onClick={handleOpenFileDialog}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-primary text-primary-text hover:bg-primary-pressed rounded-md"
            >
              <Upload className="w-3.5 h-3.5" />
              Choose Files
            </button>
          </div>
        ) : (
          <div className="border border-hairline rounded-lg bg-surface overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-4 py-2.5 bg-surface-elevated/60 border-b border-hairline text-[11px] font-medium uppercase tracking-wider text-stone items-center">
              <div className="col-span-1 flex items-center">
                <button
                  onClick={toggleSelectAll}
                  className="text-stone hover:text-ink"
                >
                  {selectedDocIds.size === documents.length ? (
                    <CheckSquare className="w-3.5 h-3.5 text-ink" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="col-span-6">File Name</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-2">Uploaded</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-hairline">
              {documents.map((doc) => {
                const isSelected = selectedDocIds.has(doc.id);
                const sizeKb = (doc.file_size / 1024).toFixed(0);
                const dateFormatted = new Date(doc.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const liveOcr = ocrProgress.get(doc.id);

                return (
                  <div
                    key={doc.id}
                    className={`grid grid-cols-12 px-4 py-3 items-center text-xs transition-colors group ${isSelected ? 'bg-surface-elevated text-ink' : 'hover:bg-surface-elevated/40 text-body'}`}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1 flex items-center">
                      <button
                        onClick={() => toggleSelect(doc.id)}
                        className="text-stone hover:text-ink transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-ink" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* File Name, OCR badge & preview snippet */}
                    <div
                      className="col-span-6 flex items-center gap-2.5 min-w-0 cursor-pointer"
                      onClick={() => onPreviewDocument(doc)}
                    >
                      {getFileIcon(doc.file_type)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-ink hover:underline truncate">
                            {doc.filename}
                          </span>
                          <OcrStatusBadge doc={doc} liveEvent={liveOcr} compact />
                        </div>
                        {doc.extracted_text && (
                          <span className="text-[11px] text-mute truncate block max-w-md">
                            {doc.extracted_text.slice(0, 65)}...
                          </span>
                        )}
                        {liveOcr?.detail && (liveOcr.status === 'processing') && (
                          <span className="text-[10px] text-accent-blue truncate block">
                            {liveOcr.detail}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* File Size */}
                    <div className="col-span-2 text-mute font-mono text-[11px]">
                      {sizeKb} KB
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-mute text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone" />
                      {dateFormatted}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onPreviewDocument(doc)}
                        className="p-1 text-stone hover:text-ink transition-colors opacity-0 group-hover:opacity-100"
                        title="Preview Document"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => window.medbuddy.reRunOcr(doc.id)}
                        className="p-1 text-stone hover:text-accent-blue transition-colors opacity-0 group-hover:opacity-100"
                        title="Re-run OCR extraction"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete document "${doc.filename}"?`)) {
                            onDeleteDocument(doc.id);
                          }
                        }}
                        className="p-1 text-stone hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
