import React from 'react';
import { Check, AlertTriangle, Clock, Loader2, Sparkles } from 'lucide-react';
import type { DocumentItem, OcrProgressEvent, OcrStatus } from '../../../shared/types';

interface OcrStatusBadgeProps {
  /** The persisted document (provides the DB ocr_status as baseline) */
  doc: DocumentItem;
  /** Live progress event from useOcrProgress() — overrides DB status when present */
  liveEvent?: OcrProgressEvent;
  /** Show compact icon-only badge (for table rows). Default: false */
  compact?: boolean;
}

/**
 * Inline badge showing the current OCR extraction status of a document
 * Conforms to Designv2 token rules & Lucide 1.75px outline style.
 */
export const OcrStatusBadge: React.FC<OcrStatusBadgeProps> = ({ doc, liveEvent, compact = false }) => {
  const status: OcrStatus = liveEvent?.status ?? doc.ocr_status ?? 'pending';
  const stage = liveEvent?.stage ?? doc.ocr_stage;
  const detail = liveEvent?.detail;
  const pct = liveEvent?.progressPercent;
  const errorMsg = doc.ocr_error;

  // Plain-text files: no badge needed
  if (status === 'skipped') return null;

  if (status === 'pending') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium bg-surface-recessed text-tertiary border border-border"
        title="Queued for text extraction"
      >
        <Clock className="w-3 h-3 text-tertiary" strokeWidth={1.75} />
        {!compact && <span>Queued</span>}
      </span>
    );
  }

  if (status === 'processing') {
    const label = stage === 'llm_vision'
      ? (compact ? 'Vision' : 'LLM Vision…')
      : (compact ? 'OCR' : pct ? `Extracting ${pct}%` : 'Extracting…');

    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium bg-vault-50 text-vault-600 border border-vault-200"
        title={detail || 'Running extraction…'}
      >
        <Loader2 className="w-3 h-3 animate-spin text-vault-600" strokeWidth={1.75} />
        {!compact && <span>{label}</span>}
      </span>
    );
  }

  if (status === 'done') {
    const isVision = stage === 'llm_vision';
    if (isVision) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium bg-violet-100 text-violet-600 border border-violet-300"
          title="Text extracted via LLM Vision (OCR had low confidence)"
        >
          <Sparkles className="w-3 h-3 text-violet-600" strokeWidth={1.75} />
          {!compact && <span>Vision</span>}
        </span>
      );
    }
    // Paddle/pdf success — subtle sage check
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium bg-sage-100 text-sage-600 border border-sage-300"
        title="Text extraction complete"
      >
        <Check className="w-3 h-3 text-sage-600" strokeWidth={2} />
        {!compact && <span>Ready</span>}
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium bg-amber-100 text-amber-600 border border-amber-300 cursor-help"
        title={errorMsg ? `Extraction failed: ${errorMsg}` : 'Extraction incomplete — will use metadata only'}
      >
        <AlertTriangle className="w-3 h-3 text-amber-600" strokeWidth={1.75} />
        {!compact && <span>Extraction Failed</span>}
      </span>
    );
  }

  return null;
};
