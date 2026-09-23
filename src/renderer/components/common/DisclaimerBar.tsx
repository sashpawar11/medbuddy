import React from 'react';
import { Info } from 'lucide-react';

interface DisclaimerBarProps {
  className?: string;
}

/**
 * Persistent Medical Disclaimer Bar (§9.14 in docs/Designv2.md)
 * - Slim, permanent, non-dismissible bar
 * - text-caption, color-text-tertiary, color-bg-recessed
 * - Outline info icon (1.75px stroke)
 */
export const DisclaimerBar: React.FC<DisclaimerBarProps> = ({ className = '' }) => {
  return (
    <div
      className={`w-full py-2.5 px-4 bg-surface-recessed border-t border-border flex items-center justify-center gap-2 text-caption text-tertiary select-none shrink-0 ${className}`}
      role="note"
      aria-label="Medical advice disclaimer"
    >
      <Info className="w-3.5 h-3.5 shrink-0 text-tertiary" strokeWidth={1.75} />
      <span>
        These summaries are informational only and not medical advice. Discuss findings with a healthcare provider.
      </span>
    </div>
  );
};
