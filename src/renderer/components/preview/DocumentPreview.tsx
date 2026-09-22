import React, { useState, useEffect } from 'react';
import { X, FileText, Image as ImageIcon, Eye, AlignLeft, HardDrive, Calendar } from 'lucide-react';
import type { DocumentItem } from '../../../shared/types';

interface Props {
  document: DocumentItem | null;
  onClose: () => void;
}

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
    <div className="w-[460px] bg-surface border-l border-hairline flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-hairline flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <h3 className="text-xs font-semibold text-ink truncate">{document.filename}</h3>
          <div className="flex items-center gap-2 text-[11px] text-mute font-mono mt-0.5">
            <span>{(document.file_size / 1024).toFixed(0)} KB</span>
            <span>•</span>
            <span>{document.file_type.split('/')[1]?.toUpperCase() || 'DOC'}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-stone hover:text-ink transition-colors p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-hairline bg-surface-elevated/40 text-xs">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'preview' ? 'text-ink border-b-2 border-primary font-medium bg-surface-card/50' : 'text-mute hover:text-ink'}`}
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'text' ? 'text-ink border-b-2 border-primary font-medium bg-surface-card/50' : 'text-mute hover:text-ink'}`}
        >
          <AlignLeft className="w-3.5 h-3.5" />
          Extracted Text
        </button>
      </div>

      {/* Content View */}
      <div className="flex-1 overflow-hidden relative p-4 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-mute">
            Loading preview...
          </div>
        ) : error ? (
          <div className="p-4 rounded bg-accent-red-soft border border-hairline text-accent-red text-xs">
            {error}
          </div>
        ) : activeTab === 'preview' ? (
          <div className="flex-1 bg-surface-elevated rounded-md border border-hairline overflow-hidden flex items-center justify-center">
            {isPdf && dataUrl ? (
              <iframe
                src={dataUrl}
                title={document.filename}
                className="w-full h-full border-none bg-canvas"
              />
            ) : isImage && dataUrl ? (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
                <img
                  src={dataUrl}
                  alt={document.filename}
                  className="max-w-full max-h-full object-contain rounded"
                />
              </div>
            ) : (
              <div className="text-center p-6 text-mute">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-stone" />
                <p className="text-xs">Preview unavailable for this format</p>
                <p className="text-[11px] text-stone mt-1">Switch to 'Extracted Text' tab to inspect raw content.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 bg-canvas border border-hairline rounded-md p-3 overflow-y-auto font-mono text-xs text-body leading-relaxed whitespace-pre-wrap select-text">
            {extractedText || (
              <span className="text-stone italic">
                No text extracted yet. Text will be automatically extracted upon running an AI analysis.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
