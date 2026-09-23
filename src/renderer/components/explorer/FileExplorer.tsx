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
  Cloud,
  RotateCcw,
  Tags,
  X,
} from 'lucide-react';
import type { DocumentItem, Folder, FamilyMember } from '../../../shared/types';
import { OcrStatusBadge } from '../common/OcrStatusBadge';
import { Button } from '../common/Button';
import { useOcrProgress } from '../../hooks/useOcrProgress';
import { getTagColorClass } from '../../utils/tagColors';

interface Props {
  member: FamilyMember;
  folder: Folder;
  documents: DocumentItem[];
  onImportFiles: (filePaths: string[]) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onDeleteMultipleDocuments?: (documentIds: string[]) => Promise<void>;
  onUpdateDocumentTags?: (documentId: string, tags: string[]) => void;
  onPreviewDocument: (document: DocumentItem) => void;
  onTriggerAnalysis: (scopeType: 'file' | 'selection' | 'folder', docIds: string[], title: string) => void;
  onTriggerOrganize?: (docIds: string[]) => void;
  onOpenSyncFolder?: (folderId: string) => void;
}

/** Format dates consistently app-wide per §4.3: "Mar 12, 2024" */
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const FileExplorer: React.FC<Props> = ({
  member,
  folder,
  documents,
  onImportFiles,
  onDeleteDocument,
  onDeleteMultipleDocuments,
  onUpdateDocumentTags,
  onPreviewDocument,
  onTriggerAnalysis,
  onTriggerOrganize,
  onOpenSyncFolder,
}) => {
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const ocrProgress = useOcrProgress();

  const handleDeleteSelected = async () => {
    if (selectedDocIds.size === 0) return;
    const count = selectedDocIds.size;
    if (!confirm(`Delete ${count} selected document(s)?`)) return;
    const ids = Array.from(selectedDocIds);
    setSelectedDocIds(new Set());
    if (onDeleteMultipleDocuments) {
      await onDeleteMultipleDocuments(ids);
    } else {
      for (const id of ids) {
        await onDeleteDocument(id);
      }
    }
  };

  const handleRemoveTagFromFile = async (docId: string, tagToRemove: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    const newTags = (doc.tags || []).filter((t) => t !== tagToRemove);
    try {
      await window.medbuddy.applyDocumentOrganization([
        {
          documentId: doc.id,
          filename: doc.filename,
          tags: newTags,
        },
      ]);
      onUpdateDocumentTags?.(doc.id, newTags);
    } catch (err: any) {
      console.error('Failed to remove tag from file', err);
    }
  };

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

  // Drag and Drop handlers per §9.6
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
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-tertiary" strokeWidth={1.75} />;
    if (fileType.includes('image')) return <ImageIcon className="w-4 h-4 text-tertiary" strokeWidth={1.75} />;
    return <FileCode className="w-4 h-4 text-tertiary" strokeWidth={1.75} />;
  };

  const hasSelection = selectedDocIds.size > 0;
  const analysisTargetIds = hasSelection
    ? Array.from(selectedDocIds)
    : documents.map((d) => d.id);
  const analysisScopeType = hasSelection ? 'selection' : 'folder';
  const analysisTitle = hasSelection
    ? `${selectedDocIds.size} Selected Records`
    : `${folder.name} (${documents.length} Records)`;

  // Collect unique tags from documents in this folder
  const allFolderTags = Array.from(
    new Set(documents.flatMap((d) => d.tags || []))
  ).filter(Boolean);

  const displayedDocuments = selectedTagFilter
    ? documents.filter((d) => d.tags?.includes(selectedTagFilter))
    : documents;

  return (
    <div
      className="flex-1 flex flex-col h-full bg-app relative overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Target State (§9.6): vault-500 dashed 2px border + vault-50 bg tint */}
      {isDragging && (
        <div className="absolute inset-4 z-40 bg-vault-50/90 border-2 border-dashed border-vault-500 rounded-lg flex flex-col items-center justify-center pointer-events-none text-center p-6 animate-in fade-in">
          <Upload className="w-10 h-10 text-vault-600 mb-3" strokeWidth={1.75} />
          <h3 className="text-h2 font-semibold text-primary">
            Drop files to add to <em className="italic">{folder.name}</em>
          </h3>
          <p className="text-small text-secondary mt-1">
            Files will be safely encrypted and indexed locally
          </p>
        </div>
      )}

      {/* Top Breadcrumb & Action Bar */}
      <header className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 bg-surface">
        <div className="flex items-center gap-2 text-small">
          <span className="text-tertiary">{member.name}</span>
          <span className="text-tertiary">/</span>
          <span className="text-primary font-semibold">{folder.name}</span>
          <span className="text-caption text-tertiary ml-1 tabular-nums">
            ({documents.length} {documents.length === 1 ? 'file' : 'files'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenFileDialog}
            icon={<Upload className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            Import Documents
          </Button>

          {onOpenSyncFolder && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenSyncFolder(folder.id)}
              icon={<Cloud className="w-3.5 h-3.5" strokeWidth={1.75} />}
              title={`Sync "${folder.name}" to Google Drive`}
            >
              Sync
            </Button>
          )}

          {documents.length > 0 && (
            <>
              {hasSelection && (
                <Button
                  variant="destructive"
                  size="md"
                  onClick={handleDeleteSelected}
                  icon={<Trash2 className="w-4 h-4" strokeWidth={1.75} />}
                  title="Delete all selected documents at once"
                >
                  Delete ({selectedDocIds.size})
                </Button>
              )}

              <Button
                variant="secondary"
                size="md"
                onClick={() => onTriggerOrganize?.(analysisTargetIds)}
                icon={<Tags className="w-4 h-4 text-tertiary" strokeWidth={1.75} />}
                title="Automatically generate clinical tags and standardize file names"
              >
                {hasSelection ? `Organize (${selectedDocIds.size})` : 'Organize Files'}
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() =>
                  onTriggerAnalysis(analysisScopeType, analysisTargetIds, analysisTitle)
                }
                icon={<Sparkles className="w-4 h-4" strokeWidth={1.75} />}
              >
                {hasSelection ? `Analyze (${selectedDocIds.size})` : 'Analyze Folder'}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main File Table / Empty State (§9.6, §9.7, §9.13) */}
      <div className="flex-1 overflow-y-auto p-6">
        {documents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-9 text-center">
            <Upload className="w-6 h-6 text-tertiary mb-3 opacity-40" strokeWidth={1.75} />
            <h3 className="text-h2 font-semibold text-primary mb-1">No documents in this folder</h3>
            <p className="text-body text-secondary max-w-sm mb-5">
              Drag and drop lab panels, clinical letters, or scan reports, or import from your filesystem.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenFileDialog}
              icon={<Upload className="w-4 h-4" strokeWidth={1.75} />}
            >
              Choose Files
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Tag Filter Bar */}
            {allFolderTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 py-1 text-caption">
                <span className="text-tertiary font-semibold uppercase tracking-wider text-[11px] shrink-0 mr-1">
                  Tags:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTagFilter(null)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium border transition-all whitespace-nowrap ${
                    selectedTagFilter === null
                      ? 'bg-vault-600 text-white border-vault-600 shadow-xs'
                      : 'bg-surface border-border text-secondary hover:text-primary hover:border-border-strong hover:bg-surface-hover'
                  }`}
                >
                  <span>All</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-mono leading-none ${
                      selectedTagFilter === null
                        ? 'bg-white/25 text-white'
                        : 'bg-surface-recessed text-tertiary'
                    }`}
                  >
                    {documents.length}
                  </span>
                </button>
                {allFolderTags.map((tag) => {
                  const count = documents.filter((d) => d.tags?.includes(tag)).length;
                  const isSelected = selectedTagFilter === tag;
                  const color = getTagColorClass(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium border transition-all whitespace-nowrap ${
                        isSelected
                          ? 'bg-vault-600 text-white border-vault-600 shadow-xs'
                          : `${color.full} hover:opacity-85 shadow-xs`
                      }`}
                    >
                      <span>{tag}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-mono leading-none ${
                          isSelected
                            ? 'bg-white/25 text-white'
                            : 'bg-black/10 dark:bg-white/15 text-inherit'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="border border-border rounded-md bg-surface overflow-hidden">
              {/* Table Header Row (§9.7): bg-recessed, text-caption, border-hairline bottom */}
              <div className="grid grid-cols-12 px-4 py-2.5 bg-surface-recessed border-b border-border text-caption uppercase tracking-[0.02em] font-medium text-tertiary items-center select-none">
                <div className="col-span-1 flex items-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-tertiary hover:text-primary transition-colors p-0.5"
                    title={selectedDocIds.size === documents.length ? 'Deselect all' : 'Select all'}
                  >
                    {selectedDocIds.size === documents.length ? (
                      <CheckSquare className="w-4 h-4 text-primary" strokeWidth={1.75} />
                    ) : (
                      <Square className="w-4 h-4" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
                <div className="col-span-5 text-left">Document Name</div>
                <div className="col-span-2 text-left">Date Added</div>
                <div className="col-span-2 text-left">Extraction</div>
                <div className="col-span-1 text-right">Size</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Table Body Rows (§9.7): 44px+ height, border-hairline between rows, hover bg-hover */}
              <div className="divide-y divide-border">
                {displayedDocuments.map((doc) => {
                  const isSelected = selectedDocIds.has(doc.id);
                  const sizeKb = (doc.file_size / 1024).toFixed(0);
                  const liveOcr = ocrProgress.get(doc.id);

                  return (
                    <div
                      key={doc.id}
                      className={`grid grid-cols-12 px-4 min-h-[46px] py-2 items-center text-body transition-colors group ${
                        isSelected
                          ? 'bg-vault-50 text-primary'
                          : 'hover:bg-surface-hover text-secondary'
                      }`}
                    >
                      {/* Checkbox (shown on hover or when selected per §9.6) */}
                      <div className="col-span-1 flex items-center">
                        <button
                          type="button"
                          onClick={() => toggleSelect(doc.id)}
                          className={`transition-opacity p-0.5 ${
                            isSelected
                              ? 'opacity-100 text-vault-600'
                              : 'opacity-0 group-hover:opacity-100 text-tertiary hover:text-primary'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-vault-600" strokeWidth={1.75} />
                          ) : (
                            <Square className="w-4 h-4" strokeWidth={1.75} />
                          )}
                        </button>
                      </div>

                      {/* Document Name & preview snippet & tags */}
                      <div
                        className="col-span-5 flex items-start gap-2.5 min-w-0 cursor-pointer"
                        onClick={() => onPreviewDocument(doc)}
                      >
                        <div className="mt-0.5 shrink-0">{getFileIcon(doc.file_type)}</div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-primary hover:text-vault-600 truncate text-small leading-tight">
                            {doc.filename}
                          </span>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {doc.tags.map((tag) => {
                                const tagColor = getTagColorClass(tag);
                                return (
                                  <span
                                    key={tag}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border leading-tight ${tagColor.full}`}
                                  >
                                    <span>{tag}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveTagFromFile(doc.id, tag);
                                      }}
                                      className="hover:opacity-75 focus:outline-none p-0.5 -mr-0.5 rounded-xs hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                      title={`Remove tag "${tag}"`}
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                    {/* Date Added (formatted consistently as Mar 12, 2024 per §4.3) */}
                    <div className="col-span-2 text-small text-tertiary tabular-nums">
                      {formatDate(doc.created_at)}
                    </div>

                    {/* OCR Extraction Status */}
                    <div className="col-span-2 flex items-center">
                      <OcrStatusBadge doc={doc} liveEvent={liveOcr} />
                    </div>

                    {/* Size (Numeric column right-aligned with tabular figures per §9.7) */}
                    <div className="col-span-1 text-right text-small text-tertiary tabular-nums font-mono">
                      {sizeKb} KB
                    </div>

                    {/* Row Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onPreviewDocument(doc)}
                        className="p-1 text-tertiary hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-sm hover:bg-surface-hover"
                        title="Preview Document"
                      >
                        <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => window.medbuddy.reRunOcr(doc.id)}
                        className="p-1 text-tertiary hover:text-vault-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm hover:bg-surface-hover"
                        title="Re-run text extraction"
                      >
                        <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete document "${doc.filename}"?`)) {
                            onDeleteDocument(doc.id);
                          }
                        }}
                        className="p-1 text-tertiary hover:text-clay-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm hover:bg-surface-hover"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
