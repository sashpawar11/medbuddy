import React, { useState, useEffect } from 'react';
import { X, Terminal, Trash2, Copy, Check, Filter, RefreshCw } from 'lucide-react';
import type { AppLogEntry } from '../../../shared/types';
import { Button } from '../common/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AppLogEntry[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const cat = filterCategory === 'all' ? undefined : filterCategory;
      const res = await window.medbuddy.getLogs(150, cat);
      setLogs(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchLogs();

    const unsubscribe = window.medbuddy.onLogEmitted((entry) => {
      if (filterCategory === 'all' || entry.category === filterCategory) {
        setLogs((prev) => [entry, ...prev.slice(0, 149)]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, filterCategory]);

  if (!isOpen) return null;

  const handleCopyLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category}] ${l.message} ${l.details || ''}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = async () => {
    if (confirm('Clear all diagnostic logs?')) {
      await window.medbuddy.clearLogs();
      setLogs([]);
    }
  };

  const getLevelColor = (level: string) => {
    if (level === 'error') return 'text-clay-600 font-semibold';
    if (level === 'warn') return 'text-amber-600 font-semibold';
    return 'text-vault-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-6 animate-fade-in">
      <div className="bg-surface border border-border rounded-lg w-full max-w-4xl h-[640px] flex flex-col shadow-md select-none font-sans animate-modal-enter">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-surface-recessed border border-border flex items-center justify-center text-primary">
              <Terminal className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-body font-semibold text-primary">
                Diagnostics &amp; Extraction Logs
              </h3>
              <p className="text-caption text-tertiary">
                Local-only operational event logging for AI parsing and pipeline diagnostics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLogs}
              icon={copied ? <Check className="w-3.5 h-3.5 text-sage-600" strokeWidth={2} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />}
            >
              {copied ? 'Copied' : 'Copy Logs'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClear}
              icon={<Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
              title="Clear Logs"
            >
              Clear
            </Button>
            <button
              onClick={onClose}
              className="text-tertiary hover:text-primary p-1 rounded-sm hover:bg-surface-hover transition-colors ml-1"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-4 py-2 border-b border-border bg-surface-recessed flex items-center justify-between text-caption shrink-0">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-tertiary mr-1" strokeWidth={1.75} />
            {['all', 'ai', 'extract', 'db', 'vault', 'ipc'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded-sm font-mono uppercase text-caption transition-colors ${
                  filterCategory === cat
                    ? 'bg-vault-600 text-white font-medium'
                    : 'text-secondary hover:text-primary bg-surface border border-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 text-caption text-secondary hover:text-primary transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            Refresh
          </button>
        </div>

        {/* Monospace Console View */}
        <div className="flex-1 bg-app p-4 overflow-y-auto font-mono text-caption leading-relaxed divide-y divide-border select-text">
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-tertiary font-sans text-small">
              No log events recorded in this category.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="py-1.5 flex items-start gap-2.5">
                <span className="text-tertiary shrink-0 tabular-nums">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 uppercase ${getLevelColor(log.level)}`}>
                  [{log.level}]
                </span>
                <span className="text-secondary font-medium shrink-0 uppercase">[{log.category}]</span>
                <span className="text-primary flex-1 break-words">{log.message}</span>
                {log.details && (
                  <span className="text-tertiary truncate max-w-xs">{log.details}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
