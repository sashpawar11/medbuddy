import React, { useState, useEffect } from 'react';
import {
  X,
  Tags,
  Check,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  ArrowRight,
  Plus,
  RotateCcw,
  Zap,
  Sparkles,
} from 'lucide-react';
import type {
  ProviderProfile,
  DocumentItem,
  ProposedOrganization,
  OrganizeApplyPayload,
} from '../../../shared/types';
import { ProvenancePill } from '../common/ProvenancePill';
import { Button } from '../common/Button';
import { getTagColorClass } from '../../utils/tagColors';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  providers: ProviderProfile[];
  onSuccess: (updatedCount: number) => void;
}

interface EditableItem extends ProposedOrganization {
  selected: boolean;
  newTagInput?: string;
  isAddingTag?: boolean;
}

export const OrganizeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  documents,
  providers,
  onSuccess,
}) => {
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [organizeMode, setOrganizeMode] = useState<'fast' | 'ai'>('fast');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [fastItems, setFastItems] = useState<EditableItem[]>([]);
  const [aiItems, setAiItems] = useState<EditableItem[]>([]);
  const [hasRunAi, setHasRunAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (providers.length > 0 && !selectedProviderId) {
      const def = providers.find((p) => p.is_default === 1) || providers[0];
      setSelectedProviderId(def.id);
    }
  }, [providers, selectedProviderId]);

  // Run fast preview automatically when modal opens or documents change
  useEffect(() => {
    if (!isOpen || documents.length === 0) {
      setItems([]);
      setFastItems([]);
      setAiItems([]);
      setHasRunAi(false);
      setError(null);
      setIsLoading(false);
      setIsApplying(false);
      setOrganizeMode('fast');
      return;
    }

    let isMounted = true;

    const runFastPreview = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const docIds = documents.map((d) => d.id);
        const results = await window.medbuddy.organizeDocumentsPreview(docIds, 'fast');
        if (isMounted) {
          const mapped = results.map((r) => ({
            ...r,
            selected: true,
            newTagInput: '',
            isAddingTag: false,
          }));
          setFastItems(mapped);
          setItems(mapped);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to generate organization suggestions');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    runFastPreview();

    return () => {
      isMounted = false;
    };
  }, [isOpen, documents]);

  // Handle switching between Fast Mode and Smart AI mode
  const handleModeChange = (newMode: 'fast' | 'ai') => {
    setOrganizeMode(newMode);
    setError(null);
    if (newMode === 'fast') {
      if (fastItems.length > 0) {
        setItems(fastItems);
      }
    } else if (newMode === 'ai') {
      if (hasRunAi && aiItems.length > 0) {
        setItems(aiItems);
      }
      // If AI hasn't run yet, do NOT trigger automatically. Keep current items and let user click the trigger button.
    }
  };

  // Explicitly run Smart AI classification on button click
  const runAiAnalysis = async () => {
    if (documents.length === 0 || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const docIds = documents.map((d) => d.id);
      const results = await window.medbuddy.organizeDocumentsPreview(
        docIds,
        selectedProviderId || undefined
      );
      const mapped = results.map((r) => ({
        ...r,
        selected: true,
        newTagInput: '',
        isAddingTag: false,
      }));
      setAiItems(mapped);
      setItems(mapped);
      setHasRunAi(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI organization suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentProvider = providers.find((p) => p.id === selectedProviderId) || providers[0];
  const isLocal = currentProvider?.kind === 'local';

  const toggleSelectAll = () => {
    const allSelected = items.every((i) => i.selected);
    setItems((prev) => prev.map((i) => ({ ...i, selected: !allSelected })));
  };

  const toggleSelectItem = (docId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.documentId === docId ? { ...i, selected: !i.selected } : i))
    );
  };

  const handleFilenameChange = (docId: string, value: string) => {
    setItems((prev) =>
      prev.map((i) => (i.documentId === docId ? { ...i, proposedFilename: value } : i))
    );
  };

  const handleRemoveTag = (docId: string, tagToRemove: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.documentId === docId
          ? { ...i, tags: i.tags.filter((t) => t !== tagToRemove) }
          : i
      )
    );
  };

  const handleAddTag = (docId: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.documentId === docId) {
          const val = (i.newTagInput || '').trim();
          if (val && !i.tags.includes(val)) {
            return {
              ...i,
              tags: [...i.tags, val],
              newTagInput: '',
              isAddingTag: false,
            };
          }
          return { ...i, isAddingTag: false, newTagInput: '' };
        }
        return i;
      })
    );
  };

  const handleApply = async () => {
    const selectedItems = items.filter((i) => i.selected);
    if (selectedItems.length === 0) return;

    try {
      setIsApplying(true);
      setError(null);

      const updates: OrganizeApplyPayload[] = selectedItems.map((i) => ({
        documentId: i.documentId,
        filename: i.proposedFilename.trim(),
        tags: i.tags,
      }));

      await window.medbuddy.applyDocumentOrganization(updates);
      onSuccess(updates.length);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to apply organization changes');
    } finally {
      setIsApplying(false);
    }
  };

  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-180">
      <div className="bg-surface border border-border rounded-lg w-full max-w-[840px] max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <header className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-vault-50 border border-vault-200 flex items-center justify-center text-vault-600">
              <Tags className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-h2 font-semibold text-primary">Organize Medical Records</h3>
              <p className="text-caption text-secondary">
                Auto-generates clinical tags and standardizes file names as{' '}
                <code className="bg-surface-recessed px-1 py-0.5 rounded text-[11px] font-mono text-tertiary">
                  &lt;Prefix-Nameforreport&gt;-&lt;Date&gt;
                </code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Mode Switcher */}
            <div className="inline-flex items-center p-0.5 rounded-md bg-surface-recessed border border-border text-caption">
              <button
                type="button"
                onClick={() => handleModeChange('fast')}
                disabled={isLoading || isApplying}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-caption font-medium transition-all ${
                  organizeMode === 'fast'
                    ? 'bg-surface text-primary font-semibold shadow-xs'
                    : 'text-tertiary hover:text-secondary'
                }`}
                title="Instant deterministic categorization from clinical keywords & dates (<10ms)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Fast</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('ai')}
                disabled={isLoading || isApplying}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-caption font-medium transition-all ${
                  organizeMode === 'ai'
                    ? 'bg-surface text-primary font-semibold shadow-xs'
                    : 'text-tertiary hover:text-secondary'
                }`}
                title="Semantic categorization using your selected AI model"
              >
                <Sparkles className="w-3.5 h-3.5 text-vault-600" />
                <span>Smart AI</span>
              </button>
            </div>

            {organizeMode === 'ai' && (
              <ProvenancePill
                kind={isLocal ? 'local' : 'cloud'}
                providerName={currentProvider?.name}
                modelName={currentProvider?.model}
              />
            )}

            {!isApplying && (
              <button
                type="button"
                onClick={onClose}
                className="text-tertiary hover:text-primary p-1 rounded-sm hover:bg-surface-hover transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-md bg-clay-50 border border-clay-200 text-clay-700 text-small flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-clay-600" strokeWidth={1.75} />
              <div className="flex-1">
                <p className="font-semibold mb-0.5">Organization Issue</p>
                <p className="text-secondary leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-vault-50 border border-vault-200 flex items-center justify-center text-vault-600">
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.75} />
              </div>
              <h4 className="text-h3 font-semibold text-primary">
                {organizeMode === 'fast'
                  ? `Instantly Organizing ${documents.length} File${documents.length === 1 ? '' : 's'}...`
                  : `AI Analyzing ${documents.length} File${documents.length === 1 ? '' : 's'}...`}
              </h4>
              <p className="text-small text-secondary max-w-md">
                {organizeMode === 'fast'
                  ? 'Performing rapid heuristic extraction using clinical vocabulary and date patterns (<10ms).'
                  : 'Performing semantic classification using medical LLM to identify report types and clinical tags.'}
              </p>
            </div>
          ) : organizeMode === 'ai' && !hasRunAi ? (
            /* Smart AI Pane: Model Selection & Trigger ONLY (§Request 1) */
            <div className="py-10 flex flex-col items-center justify-center">
              <div className="w-full max-w-lg p-6 rounded-lg bg-surface border border-border shadow-xs space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-vault-50 border border-vault-200 flex items-center justify-center text-vault-600 shrink-0">
                    <Sparkles className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-h3 font-semibold text-primary">Smart AI Organization</h4>
                    <p className="text-small text-secondary leading-relaxed">
                      Select your AI provider model to analyze medical document headers, extract encounter dates, and generate standardized clinical filenames and tags.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-md bg-surface-recessed border border-border/80 space-y-3">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-tertiary">
                    Selected Model Profile
                  </label>
                  <div className="space-y-3">
                    <select
                      value={selectedProviderId}
                      onChange={(e) => setSelectedProviderId(e.target.value)}
                      disabled={isLoading || isApplying}
                      className="w-full text-small bg-surface border border-border rounded-md px-3 py-2 text-primary focus:outline-none focus:ring-1 focus:ring-vault-500 font-medium"
                    >
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.model}) {p.is_default ? '• Default' : ''}
                        </option>
                      ))}
                    </select>

                    <Button
                      variant="primary"
                      size="md"
                      onClick={runAiAnalysis}
                      disabled={isLoading || isApplying}
                      loading={isLoading}
                      icon={!isLoading ? <Sparkles className="w-4 h-4" /> : undefined}
                      className="w-full justify-center"
                    >
                      Run Smart AI ({documents.length} file{documents.length === 1 ? '' : 's'})
                    </Button>
                  </div>
                </div>

                <p className="text-caption text-tertiary text-center">
                  Runs local semantic extraction. No other content is generated until you trigger the model.
                </p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-secondary">
              No document proposals available.
            </div>
          ) : (
            <div className="space-y-3">
              {/* If AI has run, show a subtle banner with option to re-run */}
              {organizeMode === 'ai' && hasRunAi && (
                <div className="p-3 rounded-md bg-vault-50/60 border border-vault-200 flex items-center justify-between gap-3 text-caption">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-vault-600 shrink-0" />
                    <span className="font-semibold text-primary">AI Organization Results</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-sage-100 text-sage-700 border border-sage-200">
                      Generated via {currentProvider?.name} ({currentProvider?.model})
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={runAiAnalysis}
                    disabled={isLoading || isApplying}
                    icon={<RotateCcw className="w-3 h-3" />}
                  >
                    Re-run AI
                  </Button>
                </div>
              )}
              {/* Batch Select Controls */}
              <div className="flex items-center justify-between text-caption px-1">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-secondary hover:text-primary transition-colors font-medium select-none"
                >
                  {items.every((i) => i.selected) ? (
                    <CheckSquare className="w-4 h-4 text-vault-600" strokeWidth={1.75} />
                  ) : (
                    <Square className="w-4 h-4 text-tertiary" strokeWidth={1.75} />
                  )}
                  <span>Select All ({items.length})</span>
                </button>
                <span className="text-tertiary">
                  Click on any proposed name or tag to edit before applying
                </span>
              </div>

              {/* Items Card List */}
              <div className="border border-border rounded-md divide-y divide-border bg-surface overflow-hidden">
                {items.map((item) => (
                  <div
                    key={item.documentId}
                    className={`p-4 transition-colors space-y-3 ${
                      item.selected ? 'bg-surface' : 'bg-surface-recessed/50 opacity-60'
                    }`}
                  >
                    {/* Top Row: Checkbox + Original Name -> New Name */}
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleSelectItem(item.documentId)}
                        className="p-0.5 mt-1 text-tertiary hover:text-primary transition-colors shrink-0"
                      >
                        {item.selected ? (
                          <CheckSquare className="w-4 h-4 text-vault-600" strokeWidth={1.75} />
                        ) : (
                          <Square className="w-4 h-4 text-tertiary" strokeWidth={1.75} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Filenames comparison */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span
                            className="text-caption font-mono text-tertiary truncate max-w-[200px]"
                            title={item.originalFilename}
                          >
                            {item.originalFilename}
                          </span>
                          <ArrowRight
                            className="w-3.5 h-3.5 text-tertiary shrink-0 hidden sm:block"
                            strokeWidth={1.75}
                          />
                          <div className="flex-1">
                            <input
                              type="text"
                              value={item.proposedFilename}
                              onChange={(e) =>
                                handleFilenameChange(item.documentId, e.target.value)
                              }
                              className="w-full px-2.5 py-1 text-small font-mono bg-surface border border-border rounded-sm text-primary focus:outline-none focus:border-vault-500 focus:ring-1 focus:ring-vault-500 transition-colors"
                              placeholder="Proposed Filename"
                            />
                          </div>
                        </div>

                        {/* Tags and Metadata Row */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] uppercase tracking-wider text-tertiary font-medium mr-1">
                            Tags:
                          </span>
                          {item.tags.map((tag) => {
                            const color = getTagColorClass(tag);
                            return (
                              <span
                                key={tag}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium border ${color.full}`}
                              >
                                <span>{tag}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(item.documentId, tag)}
                                  className="opacity-50 hover:opacity-100 hover:text-clay-600 rounded-full transition-opacity ml-0.5"
                                  title={`Remove ${tag}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}

                          {/* Inline Add Tag */}
                          {item.isAddingTag ? (
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="text"
                                autoFocus
                                value={item.newTagInput || ''}
                                onChange={(e) =>
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.documentId === item.documentId
                                        ? { ...i, newTagInput: e.target.value }
                                        : i
                                    )
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddTag(item.documentId);
                                  if (e.key === 'Escape') {
                                    setItems((prev) =>
                                      prev.map((i) =>
                                        i.documentId === item.documentId
                                          ? { ...i, isAddingTag: false }
                                          : i
                                      )
                                    );
                                  }
                                }}
                                placeholder="Tag name..."
                                className="h-6 px-2 text-caption bg-surface border border-vault-400 rounded-sm focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddTag(item.documentId)}
                                className="p-1 text-vault-600 hover:text-vault-800"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setItems((prev) =>
                                  prev.map((i) =>
                                    i.documentId === item.documentId
                                      ? { ...i, isAddingTag: true }
                                      : i
                                  )
                                )
                              }
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-border text-caption text-tertiary hover:text-primary hover:border-border-strong transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Tag</span>
                            </button>
                          )}

                          {/* Detected Date badge */}
                          <span className="ml-auto text-caption text-tertiary tabular-nums font-mono">
                            Date: {item.detectedDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="px-6 py-3.5 border-t border-border flex items-center justify-between shrink-0 bg-surface-recessed">
          <div className="text-small text-secondary">
            {organizeMode === 'ai' && !hasRunAi ? (
              <span className="text-caption text-tertiary">
                Select your model above and click Run Smart AI to preview standardized names.
              </span>
            ) : !isLoading && (
              <span>
                <strong className="font-semibold text-primary">{selectedCount}</strong> of{' '}
                {items.length} document{items.length === 1 ? '' : 's'} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={onClose} disabled={isApplying}>
              Cancel
            </Button>
            {(! (organizeMode === 'ai' && !hasRunAi)) && (
              <Button
                variant="primary"
                size="md"
                onClick={handleApply}
                disabled={isLoading || selectedCount === 0 || isApplying}
                icon={
                  isApplying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )
                }
              >
                {isApplying
                  ? 'Applying...'
                  : `Apply Changes (${selectedCount})`}
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
