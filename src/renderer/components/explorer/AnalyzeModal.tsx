import React, { useState, useEffect } from 'react';
import { X, Sparkles, Shield, AlertTriangle, CheckCircle, RefreshCw, Cpu, Clock } from 'lucide-react';
import type { ProviderProfile, DocumentItem, AIProgressEvent } from '../../../shared/types';
import { Keycap } from '../common/Keycap';
import { OcrStatusBadge } from '../common/OcrStatusBadge';
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
  const ocrProgress = useOcrProgress();

  // Count how many of the selected documents are still being processed
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

  // Subscribe to AI progress IPC events
  useEffect(() => {
    if (!isOpen) {
      setIsAnalyzing(false);
      setProgress(null);
      setError(null);
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

  const currentProvider = providers.find((p) => p.id === selectedProviderId);
  const isLocal = currentProvider?.kind === 'local';

  const handleRun = async () => {
    if (!selectedProviderId) return;
    try {
      setIsAnalyzing(true);
      setError(null);
      setProgress({
        stage: 'extracting',
        message: 'Initializing document analysis pipeline...',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-hairline rounded-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-hairline mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-text">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Run AI Health Overview</h3>
              <p className="text-xs text-mute">Scope: {scopeTitle}</p>
            </div>
          </div>
          {!isAnalyzing && (
            <button onClick={onClose} className="text-mute hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-md bg-accent-red-soft border border-hairline text-accent-red text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-0.5">Analysis could not be completed</p>
              <p className="text-body leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Active Analysis State */}
        {isAnalyzing ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="relative w-12 h-12 mb-4 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin opacity-80" />
            </div>

            <h4 className="text-sm font-semibold text-ink mb-1">
              {progress?.stage === 'extracting' && 'Extracting Medical Records'}
              {progress?.stage === 'preparing_prompt' && 'Assembling Medical Context'}
              {progress?.stage === 'inferring' && 'Model Generating Overview'}
              {progress?.stage === 'validating' && 'Validating Structured Schema'}
              {progress?.stage === 'retrying' && 'Executing Corrective Retry'}
              {progress?.stage === 'complete' && 'Finalizing Dashboard'}
            </h4>

            <p className="text-xs text-mute max-w-sm mb-4">
              {progress?.message || 'Processing your documents safely...'}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden border border-hairline mb-2">
              <div
                className="bg-primary h-full transition-[width] duration-300 ease-out"
                style={{ width: `${progress?.progressPercent || 30}%` }}
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-stone font-mono">
              <span>{isLocal ? 'On-Device Processing' : 'Cloud Endpoint'}</span>
              <span>•</span>
              <span>{currentProvider?.model}</span>
            </div>
          </div>
        ) : (
          /* Pre-run Form */
          <div className="space-y-4">
            {/* Documents to Analyze */}
            <div>
              <label className="block text-xs font-medium text-stone mb-1.5">
                Documents ({documents.length})
                {isOcrPending && (
                  <span className="ml-2 text-accent-blue font-normal">
                    · {pendingOcrCount} extracting…
                  </span>
                )}
              </label>
              <div className="max-h-36 overflow-y-auto bg-surface-elevated border border-hairline rounded-md p-2 space-y-1">
                {documents.map((d) => {
                  const liveOcr = ocrProgress.get(d.id);
                  return (
                    <div key={d.id} className="flex items-center justify-between text-xs text-body py-0.5 px-1 gap-2">
                      <span className="truncate flex-1">{d.filename}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-mute font-mono">
                          {(d.file_size / 1024).toFixed(0)} KB
                        </span>
                        <OcrStatusBadge doc={d} liveEvent={liveOcr} compact />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Provider Picker */}
            <div>
              <label className="block text-xs font-medium text-stone mb-1.5">
                AI Provider
              </label>
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-elevated border border-hairline rounded-md text-ink focus:outline-none focus:border-hairline-strong transition-colors"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.model} ({p.kind === 'local' ? 'Local on-device' : 'Cloud BYOK'})
                  </option>
                ))}
              </select>
            </div>

            {/* Privacy Guarantee Indicator (PRD §5.2) */}
            <div className={`p-3 rounded-md border text-xs flex items-start gap-2.5 ${isLocal ? 'bg-surface-elevated border-hairline text-body' : 'bg-surface-elevated border-accent-yellow/30 text-body'}`}>
              <Shield className={`w-4 h-4 shrink-0 mt-0.5 ${isLocal ? 'text-accent-green' : 'text-accent-yellow'}`} />
              <div className="text-[11px] leading-relaxed">
                {isLocal ? (
                  <>
                    <strong className="text-ink">100% On-Device Privacy:</strong> Document content is extracted and sent solely to your local AI engine at <code className="font-mono text-mute">{currentProvider?.base_url}</code>. No medical records leave your computer.
                  </>
                ) : (
                  <>
                    <strong className="text-ink">Cloud API Execution:</strong> This analysis will send extracted text to your configured cloud provider ({currentProvider?.name}).
                  </>
                )}
              </div>
            </div>

            {/* Cache Control */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="forceRefresh"
                checked={forceRefresh}
                onChange={(e) => setForceRefresh(e.target.checked)}
                className="rounded border-hairline bg-surface-elevated text-primary focus:ring-0"
              />
              <label htmlFor="forceRefresh" className="text-xs text-mute cursor-pointer select-none">
                Force regeneration (bypass local cache if previously analyzed)
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-hairline mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-mute hover:text-ink transition-colors"
              >
                Cancel
              </button>

              {isOcrPending ? (
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-surface-elevated text-mute border border-hairline rounded-md cursor-not-allowed"
                  title="Wait for background OCR to complete before analyzing"
                >
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  Waiting for OCR… ({documents.length - pendingOcrCount}/{documents.length} ready)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRun}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-primary text-primary-text rounded-md hover:bg-primary-pressed transition-colors shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Start Analysis
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
