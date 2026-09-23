import { getDocumentById, updateDocumentExtractedText } from '../db/database';
import { vault } from './vault';
import { paddleOcrService } from './paddleOcr';
import { logger } from './logger';
import path from 'path';
import fs from 'fs';

const POLL_INTERVAL_MS = 500;
const POLL_MAX_WAIT_MS = 90_000; // 90 seconds max wait for in-flight OCR

export class ExtractorService {
  /**
   * Return extracted text for a document.
   *
   * Priority order:
   *   1. Already done (cached in DB) → instant return
   *   2. Currently processing → poll until done (up to 90s)
   *   3. Pending / failed → run inline as fallback (edge case for old docs)
   */
  public async extractText(documentId: string): Promise<string> {
    const doc = getDocumentById(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // ── Fast path: already extracted ────────────────────────────────────────
    if (doc.ocr_status === 'done' || doc.ocr_status === 'skipped') {
      if (doc.extracted_text && doc.extracted_text.trim().length > 0) {
        return doc.extracted_text;
      }
    }

    // ── Wait path: extraction in progress ───────────────────────────────────
    if (doc.ocr_status === 'processing') {
      return this.waitForCompletion(documentId);
    }

    // ── Inline fallback: pending / failed / legacy docs ─────────────────────
    logger.info('extract', `Inline extraction fallback for ${doc.filename}`, { status: doc.ocr_status });
    return this.extractInline(documentId);
  }

  /**
   * Poll until the document's ocr_status reaches a terminal state (done/failed/skipped).
   */
  private async waitForCompletion(documentId: string): Promise<string> {
    const deadline = Date.now() + POLL_MAX_WAIT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const doc = getDocumentById(documentId);
      if (!doc) break;
      if (doc.ocr_status === 'done' || doc.ocr_status === 'skipped') {
        return doc.extracted_text || '';
      }
      if (doc.ocr_status === 'failed') {
        return doc.extracted_text || `[Extraction failed for ${doc.filename}: ${doc.ocr_error || 'Unknown error'}]`;
      }
    }
    logger.warn('extract', `Timed out waiting for OCR on document: ${documentId}`);
    return `[Extraction Notice: OCR timed out for this document.]`;
  }

  /**
   * Inline synchronous extraction — runs PaddleOCR directly, skipping the queue.
   * Used as a fallback for documents that missed the queue (e.g. legacy imports).
   */
  private async extractInline(documentId: string): Promise<string> {
    const doc = getDocumentById(documentId);
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    const fullPath = path.join(vault.getVaultDir(), doc.storage_path);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Document file missing on disk: ${doc.storage_path}`);
    }

    try {
      const fileBuffer = fs.readFileSync(fullPath);
      const result = await paddleOcrService.extract(doc, fileBuffer);
      const text = result.text || `[Extraction Notice: No text could be extracted from ${doc.filename}]`;
      updateDocumentExtractedText(doc.id, text);
      return text;
    } catch (err: any) {
      logger.error('extract', `Inline extraction failed for ${doc.filename}`, { error: err.message });
      const fallback = `[Extraction Notice: Unable to parse document ${doc.filename}. Error: ${err.message}]`;
      updateDocumentExtractedText(doc.id, fallback);
      return fallback;
    }
  }

  /**
   * Batch extraction for multiple documents (used by orchestrator).
   * Each document benefits from the fast-path if already extracted.
   */
  public async extractMultiple(documentIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    // Run in parallel — most will be instant cache hits
    await Promise.all(
      documentIds.map(async (id) => {
        const text = await this.extractText(id);
        map.set(id, text);
      })
    );
    return map;
  }
}

export const extractor = new ExtractorService();
