import React, { useState, useEffect } from 'react';
import { X, AlertOctagon, ChevronDown, ChevronUp, Loader2, Sparkles, Clock } from 'lucide-react';
import type { ProviderProfile, DocumentItem, AIProgressEvent } from '../../../shared/types';
import { ProvenancePill } from '../common/ProvenancePill';
import { OcrStatusBadge } from '../common/OcrStatusBadge';
import { Button } from '../common/Button';
import { useOcrProgress } from '../../hooks/useOcrProgress';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scopeType: 'file' | 'selection' | 'folder';
  scopeId: string;
  scopeTitle: string;
  documents: DocumentItem[];
  providers: ProviderProfile[];
  onStartAnalysis: (providerProfileId: string, forceRefresh?: boolean) => Promise<void>;
}

/**
 * Pre-analysis confirmation dialog (§9.9 & §11.1 in docs/Designv2.md)
 * Contents in strict order:
 * 1. Provenance pill — first thing seen.
 * 2. Scope in plain language ("This will analyze X files in [Folder]").
 * 3. Estimated cost/tokens (cloud only).
 * 4. Collapsed-by-default file list ("View X files").
 * 5. Primary button: "Run locally" or "Run analysis".
 */
export const AnalyzeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  scopeType,
  scopeId,
  scopeTitle,
  documents,
  providers,
  onStartAnalysis,
}) => {
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [forceRefresh, setForceRefresh] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AIProgressEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFileList, setShowFileList] = useState(false);
  const ocrProgress = useOcrProgress();

  // Count pending OCR docs
  const pendingOcrCount = documents.filter((d) => {
    const live = ocrProgress.get(d.id);
    const status = live?.status ?? d.ocr_status;
    return status === 'pending' || status === 'processing';
  }).length;
  const isOcrPending = pendingOcrCount > 0;

  useEffect(() => {
    if (providers.length > 0) {
      const def = providers.find((p) => p.is_default === 1) || providers[0];
      setSelectedProviderId(def.id);
    }
  }, [providers]);

  // Subscribe to progress events
  useEffect(() => {
    if (!isOpen) {
      setIsAnalyzing(false);
      setProgress(null);
      setError(null);
      setShowFileList(false);
      return;
    }

    const unsubscribe = window.medbuddy.onAIProgress((event) => {
      setProgress(event);
      if (event.stage === 'error') {
        setIsAnalyzing(false);
        setError(event.message);
      } else if (event.stage === 'complete') {
        setIsAnalyzing(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentProvider = providers.find((p) => p.id === selectedProviderId) || providers[0];
  const isLocal = currentProvider?.kind === 'local';

  const handleRun = async () => {
    if (!selectedProviderId) return;
    try {
      setIsAnalyzing(true);
      setError(null);
      setProgress({
        stage: 'extracting',
        message: 'Initializing medical extraction pipeline...',
        progressPercent: 10,
      });

      await onStartAnalysis(selectedProviderId, forceRefresh);
      onClose();
    } catch (err: any) {
      setIsAnalyzing(false);
      setError(err.message || 'Analysis failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface border border-border rounded-lg w-full max-w-[560px] p-6 shadow-md animate-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-h1 font-semibold text-primary">Health Overview</h3>
          </div>
          {!isAnalyzing && (
            <button
              onClick={onClose}
              className="text-tertiary hover:text-primary p-1 rounded-sm hover:bg-surface-hover transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-sm bg-clay-100 border border-clay-300 text-clay-600 text-small flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div className="flex-1">
              <p className="font-semibold mb-0.5">Analysis could not be completed</p>
              <p className="text-secondary leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Active Analysis State (§9.12) */}
        {isAnalyzing ? (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-vault-50 border border-vault-200 flex items-center justify-center text-vault-600">
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.75} />
            </div>

            <div>
              <h4 className="text-h3 font-semibold text-primary">
                {progress?.stage === 'extracting' && 'Extracting Medical Records'}
                {progress?.stage === 'preparing_prompt' && 'Assembling Medical Context'}
                {progress?.stage === 'inferring' && 'Synthesizing Findings'}
                {progress?.stage === 'validating' && 'Validating Structured Schema'}
                {progress?.stage === 'retrying' && 'Executing Corrective Retry'}
                {progress?.stage === 'complete' && 'Finalizing Synthesis'}
              </h4>
              <p className="text-small text-secondary max-w-sm mt-1">
                {progress?.message || 'Processing your documents safely...'}
              </p>
            </div>

            {/* Progress bar per §9.12: 4px height, radius-full, ink-200 track / vault-600 fill */}
            <div className="w-full bg-ink-200 rounded-full h-1 overflow-hidden">
              <div
                className="bg-vault-600 h-full w-full origin-left transition-transform duration-200 ease-out"
                style={{ transform: `scaleX(${(progress?.progressPercent || 25) / 100})` }}
              />
            </div>

            <div className="flex items-center gap-2 text-caption text-tertiary font-mono">
              <ProvenancePill
                kind={isLocal ? 'local' : 'cloud'}
                providerName={currentProvider?.name}
                modelName={currentProvider?.model}
              />
            </div>
          </div>
        ) : (
          /* Confirmation Content per §11.1 in strict order */
          <div className="space-y-4">
            {/* 1. Provenance pill — first thing seen */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-caption uppercase tracking-wider text-tertiary font-medium">
                  Execution Provenance
                </span>
                <ProvenancePill
                  kind={isLocal ? 'local' : 'cloud'}
                  providerName={currentProvider?.name}
                  modelName={currentProvider?.model}
                />
              </div>

              {providers.length > 1 && (
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="h-7 px-2 text-caption bg-surface border border-border-strong rounded-sm text-primary focus:outline-none focus:border-vault-500"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.kind === 'local' ? 'Local' : 'Cloud'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Scope in plain language with folder/scope path */}
            <div className="p-3.5 rounded-md bg-surface-recessed border border-border space-y-1">
              <p className="text-body text-primary leading-relaxed">
                This will analyze <strong className="font-semibold text-primary">{documents.length} {documents.length === 1 ? 'file' : 'files'}</strong> in <em className="italic">{scopeTitle}</em>.
              </p>
              {isLocal ? (
                <p className="text-caption text-secondary">
                  Content remains entirely on this device via <code className="font-mono text-tertiary">{currentProvider?.base_url}</code>.
                </p>
              ) : (
                <p className="text-caption text-secondary">
                  Extracted text will be sent securely to <strong className="font-medium">{currentProvider?.name}</strong> using your private BYOK API key.
                </p>
              )}
            </div>

            {/* 3. Estimated cost/tokens (cloud only) */}
            {!isLocal && (
              <div className="text-small text-tertiary font-mono">
                Estimated payload: ~{(documents.reduce((acc, d) => acc + (d.extracted_text?.length || 500), 0) / 4).toFixed(0)} input tokens · Standard API rate
              </div>
            )}

            {/* 4. Collapsed-by-default file list */}
            <div className="border border-border rounded-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setShowFileList((prev) => !prev)}
                className="w-full px-3 py-2 bg-surface hover:bg-surface-hover flex items-center justify-between text-small font-medium text-secondary transition-colors"
              >
                <span>View {documents.length} files included in scope</span>
                {showFileList ? (
                  <ChevronUp className="w-4 h-4 text-tertiary" strokeWidth={1.75} />
                ) : (
                  <ChevronDown className="w-4 h-4 text-tertiary" strokeWidth={1.75} />
                )}
              </button>

              {showFileList && (
                <div className="max-h-40 overflow-y-auto divide-y divide-border border-t border-border bg-surface-recessed p-2 space-y-1">
                  {documents.map((d) => {
                    const liveOcr = ocrProgress.get(d.id);
                    return (
                      <div key={d.id} className="flex items-center justify-between py-1 px-2 text-small text-secondary gap-2">
                        <span className="truncate flex-1 font-mono text-caption text-primary">{d.filename}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-caption text-tertiary font-mono tabular-nums">
                            {(d.file_size / 1024).toFixed(0)} KB
                          </span>
                          <OcrStatusBadge doc={d} liveEvent={liveOcr} compact />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Force cache bypass option */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="forceRefresh"
                checked={forceRefresh}
                onChange={(e) => setForceRefresh(e.target.checked)}
                className="rounded-sm border-border-strong text-vault-600 focus:ring-vault-500/35"
              />
              <label htmlFor="forceRefresh" className="text-caption text-secondary cursor-pointer select-none">
                Bypass cached synthesis if already analyzed
              </label>
            </div>

            {/* 5. Primary button restating provenance choice (§11.1) */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-5">
              <Button type="button" variant="ghost" size="md" onClick={onClose}>
                Cancel
              </Button>

              {isOcrPending ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled
                  icon={<Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" strokeWidth={1.75} />}
                >
                  Waiting for OCR ({documents.length - pendingOcrCount}/{documents.length} ready)
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleRun}
                  icon={<Sparkles className="w-4 h-4" strokeWidth={1.75} />}
                >
                  {isLocal ? 'Run locally' : 'Run analysis'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
