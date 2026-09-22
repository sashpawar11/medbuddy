import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg bg-surface-card border border-hairline-strong shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="shrink-0 mt-0.5">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-accent-green" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 text-accent-red" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-accent-blue" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-ink">{t.title}</h4>
            {t.message && <p className="text-xs text-mute mt-0.5 break-words">{t.message}</p>}
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-stone hover:text-ink transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
