import React, { useState, useEffect } from 'react';
import { X, FileText, Eye, AlignLeft } from 'lucide-react';
import type { DocumentItem } from '../../../shared/types';

interface Props {
  document: DocumentItem | null;
  onClose: () => void;
}

/**
 * Detail Panel per §5.2 & Tabs per §9.8:
 * - 380px fixed width, collapsible
 * - Underline style tabs: active has primary text + 2px vault-600 underline
 */
export const DocumentPreview: React.FC<Props> = ({ document, onClose }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'text'>('preview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document) {
      setDataUrl(null);
      setExtractedText(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    window.medbuddy
      .readDocumentData(document.id)
      .then((data) => {
        if (!isMounted) return;
        setDataUrl(data.dataUrl);
        setExtractedText(data.text || null);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load document preview');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [document]);

  if (!document) return null;

  const isPdf = document.file_type.includes('pdf');
  const isImage = document.file_type.includes('image');

  return (
    <aside className="w-[380px] bg-surface border-l border-border flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-200 select-none font-sans">
      {/* Detail Panel Header */}
      <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="min-w-0 pr-2">
          <h3 className="text-body font-semibold text-primary truncate" title={document.filename}>
            {document.filename}
          </h3>
          <div className="flex items-center gap-2 text-caption text-tertiary font-mono">
            <span className="tabular-nums">{(document.file_size / 1024).toFixed(0)} KB</span>
            <span>•</span>
            <span className="uppercase">{document.file_type.split('/')[1] || 'FILE'}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-tertiary hover:text-primary p-1 rounded-sm hover:bg-surface-hover transition-colors"
          title="Close Preview (Esc)"
        >
          <X className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Tabs per §9.8: Underline style */}
      <div className="flex border-b border-border bg-surface-recessed px-4 text-small">
        <button
          onClick={() => setActiveTab('preview')}
          className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 font-medium transition-colors ${
            activeTab === 'preview'
              ? 'text-primary border-vault-600'
              : 'text-secondary border-transparent hover:border-ink-300 hover:text-primary'
          }`}
        >
          <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
          Document View
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 font-medium transition-colors ${
            activeTab === 'text'
              ? 'text-primary border-vault-600'
              : 'text-secondary border-transparent hover:border-ink-300 hover:text-primary'
          }`}
        >
          <AlignLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Extracted Text
        </button>
      </div>

      {/* Content View */}
      <div className="flex-1 overflow-hidden relative p-4 flex flex-col bg-app">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-small text-tertiary">
            Loading preview…
          </div>
        ) : error ? (
          <div className="p-3 rounded-sm bg-clay-100 border border-clay-300 text-clay-600 text-caption">
            {error}
          </div>
        ) : activeTab === 'preview' ? (
          <div className="flex-1 bg-surface rounded-sm border border-border overflow-hidden flex items-center justify-center">
            {isPdf && dataUrl ? (
              <iframe
                src={dataUrl}
                title={document.filename}
                className="w-full h-full border-none bg-app"
              />
            ) : isImage && dataUrl ? (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-3">
                <img
                  src={dataUrl}
                  alt={document.filename}
                  className="max-w-full max-h-full object-contain rounded-sm"
                />
              </div>
            ) : (
              <div className="text-center p-6 text-secondary">
                <FileText className="w-8 h-8 mx-auto mb-2 text-tertiary opacity-40" strokeWidth={1.75} />
                <p className="text-small font-medium text-primary">Preview unavailable for this format</p>
                <p className="text-caption text-tertiary mt-1">
                  Inspect the "Extracted Text" tab to review parsed clinical contents.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 bg-surface border border-border rounded-sm p-3.5 overflow-y-auto font-mono text-small text-primary leading-relaxed whitespace-pre-wrap select-text">
            {extractedText || (
              <span className="text-tertiary italic font-sans text-small">
                No text extracted yet. Text is automatically parsed when running an analysis.
              </span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
