import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warn' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

/**
 * Toast notification per §9.10:
 * - Bottom-right stack, shadow-lg, radius-md, color-bg-surface, max-width 360px
 * - Left edge 3px accent colored by type (sage/amber/clay/vault-neutral)
 * - Lucide outline-only icons (1.75px stroke)
 */
export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const accentClasses: Record<ToastMessage['type'], { border: string; icon: React.ReactNode }> = {
    success: {
      border: 'border-l-sage-600',
      icon: <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" strokeWidth={1.75} />,
    },
    error: {
      border: 'border-l-clay-600',
      icon: <AlertOctagon className="w-4 h-4 text-clay-600 shrink-0" strokeWidth={1.75} />,
    },
    warn: {
      border: 'border-l-amber-600',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={1.75} />,
    },
    info: {
      border: 'border-l-vault-600',
      icon: <Info className="w-4 h-4 text-vault-600 shrink-0" strokeWidth={1.75} />,
    },
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-[360px] w-full pointer-events-none select-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const item = accentClasses[t.type] || accentClasses.info;

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 bg-surface rounded-md border border-border border-l-[3px] ${item.border} shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2`}
          >
            <div className="mt-0.5">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-body font-semibold text-primary leading-snug">{t.title}</h4>
              {t.message && (
                <p className="text-small text-secondary mt-0.5 leading-relaxed break-words">{t.message}</p>
              )}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-tertiary hover:text-primary p-1 rounded-sm hover:bg-surface-hover transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
