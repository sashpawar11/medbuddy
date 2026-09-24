import React from 'react';
import { StatusChip, ClinicalStatus } from './StatusChip';
import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';

interface MetricHistoryPoint {
  date: string;
  value: string | number;
}

interface MetricCardProps {
  name: string;
  value: string | number;
  unit?: string;
  status: ClinicalStatus;
  referenceRange?: string;
  history?: MetricHistoryPoint[];
  confidence?: 'high' | 'medium' | 'low';
  onClick?: () => void;
  className?: string;
}

/**
 * Metric Card Component (§9.4 in docs/Designv2.md)
 * - Left border accent (3px inset) colored by status (sage-600 / amber-600 / clay-600)
 * - Label in text-h3, status chip right-aligned
 * - Value in text-metric-lg with tabular figures
 * - Unit in text-small / text-tertiary
 * - Reference range in text-small / text-tertiary
 * - Inline sparkline with 2+ points
 * - Direction delta arrow colored by status
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  name,
  value,
  unit,
  status,
  referenceRange,
  history = [],
  confidence,
  onClick,
  className = '',
}) => {
  // Status accent subtle top tint or glow (optional clean indicator)
  const statusGlow = {
    normal: '',
    borderline: 'hover:border-amber-400/50',
    flagged: 'hover:border-clay-400/50',
  }[status] || '';

  // Calculate history delta if 2 or more points exist
  let deltaText: string | null = null;
  let DeltaIcon: React.FC<{ className?: string }> | null = null;

  if (history && history.length >= 2) {
    const prev = history[history.length - 2];
    const prevVal = Number(prev.value);
    const currVal = Number(value);

    if (!isNaN(prevVal) && !isNaN(currVal)) {
      if (currVal > prevVal) {
        DeltaIcon = ArrowUp;
        deltaText = `from ${prev.value} (${prev.date.slice(0, 7)})`;
      } else if (currVal < prevVal) {
        DeltaIcon = ArrowDown;
        deltaText = `from ${prev.value} (${prev.date.slice(0, 7)})`;
      } else {
        DeltaIcon = ArrowRight;
        deltaText = `unchanged from ${prev.date.slice(0, 7)}`;
      }
    }
  }

  // Sparkline SVG renderer
  const renderSparkline = () => {
    if (!history || history.length < 2) return null;
    const numValues = history.map((h) => Number(h.value)).filter((v) => !isNaN(v));
    if (numValues.length < 2) return null;

    const min = Math.min(...numValues);
    const max = Math.max(...numValues);
    const range = max - min || 1;
    const width = 120;
    const height = 28;
    const padding = 3;

    const points = numValues.map((val, idx) => {
      const x = padding + (idx / (numValues.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    return (
      <div className="py-1">
        <svg
          width={width}
          height={height}
          className="overflow-visible stroke-vault-600 fill-none"
        >
          <polyline
            fill="none"
            stroke="var(--vault-600)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.join(' ')}
          />
          {numValues.map((val, idx) => {
            const x = padding + (idx / (numValues.length - 1)) * (width - padding * 2);
            const y = height - padding - ((val - min) / range) * (height - padding * 2);
            const isLast = idx === numValues.length - 1;
            const dotColor = isLast
              ? status === 'flagged'
                ? 'var(--clay-600)'
                : status === 'borderline'
                ? 'var(--amber-600)'
                : 'var(--sage-600)'
              : 'var(--vault-500)';

            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={isLast ? 3 : 2}
                fill={dotColor}
              />
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`relative bg-surface rounded-lg border border-border/80 p-4 flex flex-col justify-between transition-[border-color,box-shadow] duration-100 ease-out shadow-xs hover:shadow-sm ${statusGlow} ${
        onClick
          ? 'cursor-pointer hover:border-border-strong'
          : ''
      } ${className}`}
    >
      {/* Header Row: Label & Status Chip */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <h4 className="text-body font-semibold text-primary leading-snug break-words flex-1 min-w-0" title={name}>
          {name}
        </h4>
        <div className="shrink-0 pt-0.5">
          <StatusChip status={status} confidence={confidence} />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="my-1.5 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-metric-lg font-bold text-primary tabular-nums tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-small text-tertiary font-sans font-medium">
            {unit}
          </span>
        )}
      </div>

      {/* Reference Range */}
      {referenceRange && (
        <div className="text-small text-tertiary mt-auto pt-2 border-t border-border/40">
          <span className="text-tertiary">Reference: </span>
          <span className="tabular-nums font-medium text-secondary">{referenceRange}</span>
        </div>
      )}

      {/* Inline Sparkline */}
      {renderSparkline()}

      {/* Trend Direction Arrow */}
      {deltaText && DeltaIcon && (
        <div className="flex items-center gap-1 text-caption text-secondary mt-1">
          <DeltaIcon className={`w-3.5 h-3.5 ${
            status === 'flagged'
              ? 'text-clay-600'
              : status === 'borderline'
              ? 'text-amber-600'
              : 'text-sage-600'
          }`} />
          <span className="tabular-nums text-tertiary">{deltaText}</span>
        </div>
      )}
    </div>
  );
};
