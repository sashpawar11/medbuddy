import React, { useState, useEffect } from 'react';
import { X, Terminal, Trash2, Copy, Check, Filter, RefreshCw } from 'lucide-react';
import type { AppLogEntry } from '../../../shared/types';
import { Keycap } from '../common/Keycap';

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

    // Subscribe to live log emissions
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
    if (confirm('Clear all logs?')) {
      await window.medbuddy.clearLogs();
      setLogs([]);
    }
  };

  const getLevelColor = (level: string) => {
    if (level === 'error') return 'text-accent-red';
    if (level === 'warn') return 'text-accent-yellow';
    return 'text-accent-blue';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-6">
      <div className="bg-surface border border-hairline rounded-lg w-full max-w-4xl h-[640px] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-surface-elevated border border-hairline flex items-center justify-center text-ink">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-ink uppercase tracking-wider font-mono">
                System Diagnostics & AI Logs
              </h3>
              <p className="text-[11px] text-mute">
                Privacy-sanitized operational logs for debugging AI and extraction tasks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-mute hover:text-ink bg-surface-elevated border border-hairline rounded-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Logs'}
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 text-mute hover:text-accent-red bg-surface-elevated border border-hairline rounded-md transition-colors"
              title="Clear Logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="p-1 text-mute hover:text-ink transition-colors ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-4 py-2 border-b border-hairline bg-surface-elevated/40 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-stone" />
            {['all', 'ai', 'extract', 'db', 'vault', 'ipc'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded-xs font-mono uppercase text-[10px] transition-colors ${filterCategory === cat ? 'bg-primary text-primary-text font-bold' : 'text-mute hover:text-ink bg-surface-elevated border border-hairline'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={fetchLogs}
            className="flex items-center gap-1 text-[11px] text-mute hover:text-ink"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Log Viewer Console */}
        <div className="flex-1 bg-canvas p-4 overflow-y-auto font-mono text-[11px] leading-relaxed divide-y divide-hairline/40 select-text">
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-stone">
              No logs recorded in this category.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="py-1.5 flex items-start gap-2.5">
                <span className="text-stone shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`font-semibold shrink-0 uppercase ${getLevelColor(log.level)}`}>
                  [{log.level}]
                </span>
                <span className="text-mute font-medium shrink-0 uppercase">[{log.category}]</span>
                <span className="text-ink flex-1 break-words">{log.message}</span>
                {log.details && (
                  <span className="text-stone truncate max-w-xs">{log.details}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
