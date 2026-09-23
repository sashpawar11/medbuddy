import React from 'react';
import { GitMerge, AlertTriangle } from 'lucide-react';

export type ClinicalStatus = 'normal' | 'borderline' | 'flagged';
export type SyncStatusType = 'synced' | 'pending' | 'error' | 'conflict';

interface StatusChipProps {
  status: ClinicalStatus;
  label?: string;
  confidence?: 'high' | 'medium' | 'low';
  className?: string;
}

/**
 * Status chips adhere strictly to §9.3 & §11.2:
 * - Never color alone: glyph (●/▲/✕) + colored text + colored 1px border + colored bg tint
 * - radius-full, text-caption, space-1 gap, horizontal padding space-2
 * - confidence="low" adds a dotted border treatment + tooltip modifier
 */
export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  label,
  confidence,
  className = '',
}) => {
  const isLowConfidence = confidence === 'low';

  const config = {
    normal: {
      glyph: '●',
      defaultLabel: 'Normal',
      classes: 'bg-sage-100 border-sage-300 text-sage-600',
    },
    borderline: {
      glyph: '▲',
      defaultLabel: 'Borderline',
      classes: 'bg-amber-100 border-amber-300 text-amber-600',
    },
    flagged: {
      glyph: '✕',
      defaultLabel: 'Flagged',
      classes: 'bg-clay-100 border-clay-300 text-clay-600',
    },
  }[status] || {
    glyph: '●',
    defaultLabel: 'Normal',
    classes: 'bg-sage-100 border-sage-300 text-sage-600',
  };

  const displayText = label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium border ${config.classes} ${
        isLowConfidence ? 'border-dashed' : 'border-solid'
      } ${className}`}
      title={isLowConfidence ? 'Low confidence extraction — verify with original document' : undefined}
    >
      <span className="text-[10px] leading-none select-none font-sans">{config.glyph}</span>
      <span>{displayText}</span>
      {isLowConfidence && <span className="opacity-70 text-[10px] font-mono">(low conf)</span>}
    </span>
  );
};

interface SyncChipProps {
  status: SyncStatusType;
  className?: string;
}

/**
 * Sync status indicator per §9.3 & §11.3:
 * Distinct icons + color:
 * - Synced: sage filled dot
 * - Pending: amber dot with subtle pulse
 * - Error: clay exclamation
 * - Conflict: clay merge glyph
 */
export const SyncStatusChip: React.FC<SyncChipProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'synced':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-medium bg-sage-100 border border-sage-300 text-sage-600 ${className}`}
          title="Synced to Google Drive"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sage-600" />
          <span>Synced</span>
        </span>
      );
    case 'pending':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-medium bg-amber-100 border border-amber-300 text-amber-600 ${className}`}
          title="Pending synchronization"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
          <span>Pending</span>
        </span>
      );
    case 'conflict':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium bg-clay-100 border border-clay-300 text-clay-600 ${className}`}
          title="Drive sync conflict needs resolution"
        >
          <GitMerge className="w-3 h-3 text-clay-600" strokeWidth={1.75} />
          <span>Conflict</span>
        </span>
      );
    case 'error':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium bg-clay-100 border border-clay-300 text-clay-600 ${className}`}
          title="Sync error occurred"
        >
          <AlertTriangle className="w-3 h-3 text-clay-600" strokeWidth={1.75} />
          <span>Error</span>
        </span>
      );
  }
};
