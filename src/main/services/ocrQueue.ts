/**
 * OCR Queue
 *
 * A lightweight in-memory FIFO queue that processes documents through the two-stage
 * extraction pipeline immediately after import:
 *
 *   Stage 1 — PaddleOCR (PP-OCRv4 ONNX) — fast, local, no network
 *   Stage 2 — LLM Vision fallback — triggered only when Stage 1 confidence is low
 *
 * Key behaviour:
 * - Configurable concurrency (default 2 workers)
 * - Broadcasts OcrProgressEvent via IPC to all renderer windows
 * - On app restart, calls recoverPending() to re-enqueue interrupted documents
 */

import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';
import { getDocumentById, updateDocumentExtractedText, updateDocumentOcrStatus, getPendingOcrDocuments } from '../db/database';
import { vault } from './vault';
import { paddleOcrService, OCR_MIN_CHARS_THRESHOLD } from './paddleOcr';
import { llmVisionExtractor } from './llmVisionExtractor';
import { logger } from './logger';
import { documentChunker } from './ai/chunker';
import type { OcrProgressEvent } from '../../shared/types';

/** Maximum number of documents processed concurrently. */
const MAX_CONCURRENT_WORKERS = 2;

class OcrQueue {
  private queue: string[] = [];
  private activeCount = 0;
  private progressCallback?: (event: OcrProgressEvent) => void;

  // ─── Public API ────────────────────────────────────────────────────────────

  public setProgressCallback(cb: (event: OcrProgressEvent) => void): void {
    this.progressCallback = cb;
  }

  /**
   * Add a document to the end of the queue and start processing if capacity allows.
   * Safe to call multiple times with the same ID — duplicates are filtered.
   */
  public enqueue(documentId: string): void {
    if (this.queue.includes(documentId)) return;
    this.queue.push(documentId);
    this.pump();
  }

  /**
   * Called on app startup to re-enqueue any documents that were interrupted
   * mid-extraction in a previous session (status = 'pending' or 'processing').
   */
  public async recoverPending(): Promise<void> {
    const pending = getPendingOcrDocuments();
    if (pending.length === 0) return;

    logger.info('extract', `Recovering ${pending.length} interrupted OCR document(s)`);
    for (const doc of pending) {
      // Reset processing → pending so the status badge starts correctly
      if (doc.ocr_status === 'processing') {
        updateDocumentOcrStatus(doc.id, 'pending', null, null);
      }
      this.enqueue(doc.id);
    }
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private pump(): void {
    while (this.activeCount < MAX_CONCURRENT_WORKERS && this.queue.length > 0) {
      const docId = this.queue.shift()!;
      this.activeCount++;
      this.processOne(docId).finally(() => {
        this.activeCount--;
        this.pump(); // process next item when a slot frees up
      });
    }
  }

  private broadcast(event: OcrProgressEvent): void {
    try {
      this.progressCallback?.(event);
      // Also send directly to any open windows (belt-and-suspenders)
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('ocr:progress', event);
        }
      }
    } catch {
      // Never let broadcast errors crash the queue worker
    }
  }

  private async processOne(documentId: string): Promise<void> {
    const doc = getDocumentById(documentId);
    if (!doc) {
      logger.warn('extract', `OCR queue: document not found — skipping: ${documentId}`);
      return;
    }

    // Plain-text files need no OCR
    if (doc.file_type === 'text/plain') {
      const fullPath = path.join(vault.getVaultDir(), doc.storage_path);
      if (fs.existsSync(fullPath)) {
        const text = fs.readFileSync(fullPath, 'utf8');
        updateDocumentExtractedText(doc.id, text);
        updateDocumentOcrStatus(doc.id, 'skipped', null, null);
        this.broadcast({ documentId: doc.id, filename: doc.filename, status: 'skipped', progressPercent: 100 });
      }
      return;
    }

    // ── Stage 1: PaddleOCR ──────────────────────────────────────────────────
    this.broadcast({
      documentId: doc.id,
      filename: doc.filename,
      status: 'processing',
      stage: 'paddle',
      progressPercent: 5,
      detail: 'Initialising OCR engine…',
    });

    updateDocumentOcrStatus(doc.id, 'processing', 'paddle', null);

    let fileBuffer: Buffer;
    try {
      const fullPath = path.join(vault.getVaultDir(), doc.storage_path);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File missing on disk: ${doc.storage_path}`);
      }
      fileBuffer = fs.readFileSync(fullPath);
    } catch (err: any) {
      logger.error('extract', `Cannot read file for OCR: ${doc.filename}`, { error: err.message });
      updateDocumentOcrStatus(doc.id, 'failed', 'paddle', err.message);
      this.broadcast({ documentId: doc.id, filename: doc.filename, status: 'failed', detail: err.message });
      return;
    }

    let paddleResult: { text: string; confidence: number; pageCount?: number } = { text: '', confidence: 0 };
    try {
      paddleResult = await paddleOcrService.extract(doc, fileBuffer, (page, total) => {
        const pct = 5 + Math.round((page / total) * 55);
        this.broadcast({
          documentId: doc.id,
          filename: doc.filename,
          status: 'processing',
          stage: 'paddle',
          progressPercent: pct,
          detail: `Page ${page} of ${total}`,
        });
      });
    } catch (err: any) {
      logger.warn('extract', `PaddleOCR stage failed for ${doc.filename}: ${err.message}`);
      paddleResult = { text: '', confidence: 0, pageCount: undefined };
    }

    logger.info('extract', `PaddleOCR done: ${doc.filename}`, {
      chars: paddleResult.text.length,
      confidence: paddleResult.confidence.toFixed(2),
    });

    // ── Stage 2: LLM Vision fallback (if OCR quality is insufficient) ────────
    const needsLlmVision =
      (doc.file_type.startsWith('image/') || doc.file_type === 'application/pdf') &&
      (paddleResult.confidence < 0.5 || paddleResult.text.trim().length < OCR_MIN_CHARS_THRESHOLD);

    let finalText = paddleResult.text;
    let finalStage: 'paddle' | 'llm_vision' = 'paddle';
    let visionUnsupportedNote = '';

    if (needsLlmVision) {
      this.broadcast({
        documentId: doc.id,
        filename: doc.filename,
        status: 'processing',
        stage: 'llm_vision',
        progressPercent: 65,
        detail: 'Low OCR confidence — trying LLM Vision…',
      });

      try {
        let visionResult: { text: string; usedVision: boolean; visionUnsupported?: boolean };

        if (doc.file_type.startsWith('image/')) {
          visionResult = await llmVisionExtractor.extractFromImage(
            fileBuffer,
            doc.file_type,
            doc.filename,
            undefined,
            (elapsedSec) => {
              this.broadcast({
                documentId: doc.id,
                filename: doc.filename,
                status: 'processing',
                stage: 'llm_vision',
                progressPercent: Math.min(92, 65 + elapsedSec),
                detail: `LLM Vision: ${elapsedSec}s elapsed…`,
              });
            }
          );
        } else {
          // Scanned PDF
          visionResult = await llmVisionExtractor.extractFromScannedPdf(
            fileBuffer,
            doc.filename,
            undefined,
            (page, total) => {
              const pct = 65 + Math.round((page / total) * 28);
              this.broadcast({
                documentId: doc.id,
                filename: doc.filename,
                status: 'processing',
                stage: 'llm_vision',
                progressPercent: pct,
                detail: `LLM Vision: Page ${page} of ${total}`,
              });
            }
          );
        }

        if (visionResult.usedVision && visionResult.text.trim().length > paddleResult.text.trim().length) {
          finalText = visionResult.text;
          finalStage = 'llm_vision';
          logger.info('extract', `LLM Vision fallback succeeded for ${doc.filename}`, { chars: finalText.length });
        } else if (visionResult.visionUnsupported) {
          visionUnsupportedNote = '\n[Note: The configured AI model does not support vision inputs. OCR result used as-is.]';
          logger.warn('extract', `Vision fallback skipped — model does not support vision: ${doc.filename}`);
        }
      } catch (err: any) {
        logger.error('extract', `LLM Vision fallback error for ${doc.filename}`, { error: err.message });
        // Keep paddleResult.text as best effort
      }
    }

    // Apply vision unsupported note if relevant
    if (visionUnsupportedNote && finalText.trim().length < OCR_MIN_CHARS_THRESHOLD) {
      finalText = `[Extraction Notice: OCR produced insufficient text for ${doc.filename}.${visionUnsupportedNote}]`;
    } else if (finalText.trim().length === 0) {
      finalText = `[Extraction Notice: Unable to extract readable text from ${doc.filename}. File may be corrupted or use an unsupported format.]`;
    }

    // Persist results
    updateDocumentExtractedText(doc.id, finalText);
    updateDocumentOcrStatus(doc.id, 'done', finalStage, null);

    this.broadcast({
      documentId: doc.id,
      filename: doc.filename,
      status: 'done',
      stage: finalStage,
      progressPercent: 100,
    });

    logger.info('extract', `OCR complete: ${doc.filename}`, {
      stage: finalStage,
      chars: finalText.length,
    });

    // Automatically chunk and index the document for Profile RAG
    documentChunker.chunkDocument(doc.id).catch((err) => {
      logger.warn('extract', `Background chunking failed for ${doc.filename}: ${err.message}`);
    });
  }
}

export const ocrQueue = new OcrQueue();
