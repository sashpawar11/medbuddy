import { useState, useEffect } from 'react';
import type { OcrProgressEvent } from '../../shared/types';

/**
 * Subscribes to live per-document OCR progress events from the main process.
 * Returns a Map of documentId → latest OcrProgressEvent for use in any component.
 *
 * Usage:
 *   const ocrProgress = useOcrProgress();
 *   const event = ocrProgress.get(doc.id);
 */
export function useOcrProgress(): Map<string, OcrProgressEvent> {
  const [progress, setProgress] = useState<Map<string, OcrProgressEvent>>(new Map());

  useEffect(() => {
    const unsubscribe = window.medbuddy.onOcrProgress((event) => {
      setProgress((prev) => {
        const next = new Map(prev);
        next.set(event.documentId, event);
        return next;
      });
    });
    return unsubscribe;
  }, []);

  return progress;
}
