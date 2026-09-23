import React from 'react';
import type { ClinicalStatus } from '../common/StatusChip';

interface RangeBarProps {
  value: number | string;
  referenceRange?: string;
  status: ClinicalStatus;
  unit?: string;
  className?: string;
}

interface ParsedRange {
  type: 'upper' | 'lower' | 'interval' | 'text';
  low?: number;
  high?: number;
  threshold?: number;
  raw: string;
}

function parseReference(ref?: string): ParsedRange | null {
  if (!ref) return null;
  const clean = ref.trim();

  // Pattern: < 20 or <= 20 or <20
  const upperMatch = clean.match(/^<\s*=?\s*([0-9.]+)/i);
  if (upperMatch) {
    const val = parseFloat(upperMatch[1]);
    if (!isNaN(val)) {
      return { type: 'upper', threshold: val, high: val, raw: clean };
    }
  }

  // Pattern: > 60 or >= 60 or >60
  const lowerMatch = clean.match(/^>\s*=?\s*([0-9.]+)/i);
  if (lowerMatch) {
    const val = parseFloat(lowerMatch[1]);
    if (!isNaN(val)) {
      return { type: 'lower', threshold: val, low: val, raw: clean };
    }
  }

  // Pattern: 12.0 - 18.0 or 12.0-18.0 or 12.0 to 18.0 or 70-110
  const intervalMatch = clean.match(/^([0-9.]+)\s*(?:-|–|to)\s*([0-9.]+)/i);
  if (intervalMatch) {
    const low = parseFloat(intervalMatch[1]);
    const high = parseFloat(intervalMatch[2]);
    if (!isNaN(low) && !isNaN(high) && high > low) {
      return { type: 'interval', low, high, raw: clean };
    }
  }

  return { type: 'text', raw: clean };
}

export const BiomarkerRangeBar: React.FC<RangeBarProps> = ({
  value,
  referenceRange,
  status,
  className = '',
}) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  const isNumeric = !isNaN(numericValue);
  const parsedRange = parseReference(referenceRange);

  // Fallback for non-numeric or unparseable ranges
  if (!isNumeric || !parsedRange || parsedRange.type === 'text') {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="h-2 w-full rounded-full bg-surface-recessed border border-border overflow-hidden">
          <div
            className={`h-full rounded-full ${
              status === 'flagged'
                ? 'bg-clay-600 w-3/4'
                : status === 'borderline'
                ? 'bg-amber-600 w-1/2'
                : 'bg-sage-600 w-1/3'
            }`}
          />
        </div>
      </div>
    );
  }

  // Compute visual scale bounds
  let scaleMin = 0;
  let scaleMax = 100;
  let thresholdPct = 50;
  let lowPct = 30;
  let highPct = 70;
  let valuePct = 50;

  if (parsedRange.type === 'upper' && parsedRange.threshold !== undefined) {
    const th = parsedRange.threshold;
    scaleMin = 0;
    scaleMax = Math.max(th * 1.6, numericValue * 1.15, th + 10);
    thresholdPct = Math.round((th / scaleMax) * 100);
    valuePct = Math.round((numericValue / scaleMax) * 100);
  } else if (parsedRange.type === 'lower' && parsedRange.threshold !== undefined) {
    const th = parsedRange.threshold;
    scaleMin = Math.max(0, Math.min(th * 0.4, numericValue * 0.8));
    scaleMax = Math.max(th * 1.5, numericValue * 1.2);
    const span = scaleMax - scaleMin || 1;
    thresholdPct = Math.round(((th - scaleMin) / span) * 100);
    valuePct = Math.round(((numericValue - scaleMin) / span) * 100);
  } else if (parsedRange.type === 'interval' && parsedRange.low !== undefined && parsedRange.high !== undefined) {
    const low = parsedRange.low;
    const high = parsedRange.high;
    const span = high - low;
    scaleMin = Math.max(0, Math.min(low - span * 0.4, numericValue * 0.85));
    scaleMax = Math.max(high + span * 0.4, numericValue * 1.15);
    const totalSpan = scaleMax - scaleMin || 1;
    lowPct = Math.round(((low - scaleMin) / totalSpan) * 100);
    highPct = Math.round(((high - scaleMin) / totalSpan) * 100);
    valuePct = Math.round(((numericValue - scaleMin) / totalSpan) * 100);
  }

  // Clamp percentages to avoid overflowing container edges
  const clampedValPct = Math.max(6, Math.min(94, valuePct));
  const clampedThresholdPct = Math.max(8, Math.min(92, thresholdPct));
  const clampedLowPct = Math.max(8, Math.min(45, lowPct));
  const clampedHighPct = Math.max(55, Math.min(92, highPct));

  // Colors purely for text/stroke without solid background blocks
  const statusColorClass =
    status === 'flagged'
      ? 'text-clay-600 dark:text-clay-400'
      : status === 'borderline'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-sage-600 dark:text-sage-400';

  const dotFillColor =
    status === 'flagged'
      ? 'bg-clay-600'
      : status === 'borderline'
      ? 'bg-amber-600'
      : 'bg-sage-600';

  return (
    <div className={`relative pt-5 pb-6 select-none ${className}`}>
      {/* Reference label/tick above bar */}
      {parsedRange.type === 'upper' && (
        <div
          className="absolute top-0 text-[10.5px] font-mono text-tertiary transform -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${clampedThresholdPct}%` }}
        >
          &lt;{parsedRange.threshold}
        </div>
      )}
      {parsedRange.type === 'lower' && (
        <div
          className="absolute top-0 text-[10.5px] font-mono text-tertiary transform -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${clampedThresholdPct}%` }}
        >
          &gt;{parsedRange.threshold}
        </div>
      )}
      {parsedRange.type === 'interval' && (
        <>
          <div
            className="absolute top-0 text-[10.5px] font-mono text-tertiary transform -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${clampedLowPct}%` }}
          >
            {parsedRange.low}
          </div>
          <div
            className="absolute top-0 text-[10.5px] font-mono text-tertiary transform -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${clampedHighPct}%` }}
          >
            {parsedRange.high}
          </div>
        </>
      )}

      {/* Main Track Bar */}
      <div className="relative h-2 w-full rounded-full bg-ink-200 dark:bg-ink-800 overflow-hidden">
        {parsedRange.type === 'upper' && (
          <div className="h-full w-full flex">
            {/* Normal healthy portion (green) */}
            <div
              className="h-full bg-sage-300 dark:bg-sage-600/70"
              style={{ width: `${clampedThresholdPct}%` }}
            />
            {/* Out-of-range elevated portion */}
            <div
              className={`h-full flex-1 ${
                status === 'borderline'
                  ? 'bg-amber-300 dark:bg-amber-600/70'
                  : 'bg-clay-300 dark:bg-clay-600/70'
              }`}
            />
          </div>
        )}

        {parsedRange.type === 'lower' && (
          <div className="h-full w-full flex">
            {/* Low out-of-range portion */}
            <div
              className={`h-full ${
                status === 'borderline'
                  ? 'bg-amber-300 dark:bg-amber-600/70'
                  : 'bg-clay-300 dark:bg-clay-600/70'
              }`}
              style={{ width: `${clampedThresholdPct}%` }}
            />
            {/* Normal healthy portion */}
            <div className="h-full flex-1 bg-sage-300 dark:bg-sage-600/70" />
          </div>
        )}

        {parsedRange.type === 'interval' && (
          <div className="h-full w-full flex">
            {/* Low out-of-range zone */}
            <div
              className="h-full bg-clay-300 dark:bg-clay-600/70"
              style={{ width: `${clampedLowPct}%` }}
            />
            {/* Normal zone */}
            <div
              className="h-full bg-sage-300 dark:bg-sage-600/70"
              style={{ width: `${clampedHighPct - clampedLowPct}%` }}
            />
            {/* High out-of-range zone */}
            <div className="h-full flex-1 bg-clay-300 dark:bg-clay-600/70" />
          </div>
        )}
      </div>

      {/* Threshold tick lines (vertical dashed indicator) */}
      {(parsedRange.type === 'upper' || parsedRange.type === 'lower') && (
        <div
          className="absolute top-4 bottom-4 w-[1px] border-r border-dashed border-ink-400 dark:border-ink-500 pointer-events-none"
          style={{ left: `${clampedThresholdPct}%` }}
        />
      )}
      {parsedRange.type === 'interval' && (
        <>
          <div
            className="absolute top-4 bottom-4 w-[1px] border-r border-dashed border-ink-400 dark:border-ink-500 pointer-events-none"
            style={{ left: `${clampedLowPct}%` }}
          />
          <div
            className="absolute top-4 bottom-4 w-[1px] border-r border-dashed border-ink-400 dark:border-ink-500 pointer-events-none"
            style={{ left: `${clampedHighPct}%` }}
          />
        </>
      )}

      {/* Refined SVG Value Pointer & Callout */}
      <div
        className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10"
        style={{ left: `${clampedValPct}%` }}
      >
        {/* Circular indicator pin on track */}
        <div className={`w-3 h-3 rounded-full border-2 border-surface dark:border-ink-900 shadow-xs ${dotFillColor}`} />

        {/* Crisp upward pointing micro caret */}
        <svg
          className={`w-2 h-1.5 -mt-0.5 ${statusColorClass} fill-current`}
          viewBox="0 0 8 6"
        >
          <polygon points="4,0 8,6 0,6" />
        </svg>

        {/* Clean numeric value label - NO background box, pure typography */}
        <span
          className={`text-[11px] font-bold font-mono tabular-nums leading-tight mt-0.5 ${statusColorClass}`}
        >
          {numericValue}
        </span>
      </div>
    </div>
  );
};
