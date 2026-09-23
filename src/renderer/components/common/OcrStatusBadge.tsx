import React from 'react';
import { CheckCircle, AlertTriangle, Clock, Loader2, Minus, Eye } from 'lucide-react';
import type { DocumentItem, OcrProgressEvent, OcrStatus } from '../../../shared/types';

interface OcrStatusBadgeProps {
  /** The persisted document (provides the DB ocr_status as baseline) */
  doc: DocumentItem;
  /** Live progress event from useOcrProgress() — overrides DB status when present */
  liveEvent?: OcrProgressEvent;
  /** Show compact icon-only badge (for table rows). Default: false (show label too). */
  compact?: boolean;
}

/**
 * Inline badge showing the current OCR extraction status of a document.
 *
 * Status hierarchy (live event overrides DB status):
 *   pending     → ⚪ Queued
 *   processing  → 🔵 Spinner + label + optional page progress
 *   done        → ✅ subtle (or 🔮 if via LLM Vision)
 *   failed      → 🟠 Warning + tooltip
 *   skipped     → ─ (no badge — plain text files)
 */
export const OcrStatusBadge: React.FC<OcrStatusBadgeProps> = ({ doc, liveEvent, compact = false }) => {
  // Live event takes precedence over persisted status
  const status: OcrStatus = liveEvent?.status ?? doc.ocr_status ?? 'pending';
  const stage = liveEvent?.stage ?? doc.ocr_stage;
  const detail = liveEvent?.detail;
  const pct = liveEvent?.progressPercent;
  const errorMsg = doc.ocr_error;

  // Plain-text docs: no badge needed
  if (status === 'skipped') return null;

  if (status === 'pending') {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-stone bg-surface-elevated border border-hairline"
        title="Queued for OCR extraction"
      >
        <Clock className="w-2.5 h-2.5" />
        {!compact && <span>Queued</span>}
      </span>
    );
  }

  if (status === 'processing') {
    const label = stage === 'llm_vision'
      ? (compact ? 'LLM' : 'LLM Vision…')
      : (compact ? 'OCR' : pct ? `Extracting ${pct}%` : 'Extracting…');

    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-accent-blue bg-surface-elevated border border-hairline"
        title={detail || 'Running OCR extraction…'}
      >
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        {!compact && <span>{label}</span>}
      </span>
    );
  }

  if (status === 'done') {
    const isVision = stage === 'llm_vision';
    if (isVision) {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-accent-blue bg-surface-elevated border border-hairline"
          title="Text extracted via LLM Vision (OCR had low confidence)"
        >
          <Eye className="w-2.5 h-2.5" />
          {!compact && <span>Vision</span>}
        </span>
      );
    }
    // Paddle success — very subtle, don't clutter the row
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] text-accent-green opacity-70"
        title="OCR extraction complete"
      >
        <CheckCircle className="w-3 h-3" />
        {!compact && <span>Ready</span>}
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-accent-yellow bg-surface-elevated border border-hairline cursor-help"
        title={errorMsg ? `OCR failed: ${errorMsg}` : 'OCR extraction failed — analysis will use filename metadata only'}
      >
        <AlertTriangle className="w-2.5 h-2.5" />
        {!compact && <span>OCR Failed</span>}
      </span>
    );
  }

  return null;
};
