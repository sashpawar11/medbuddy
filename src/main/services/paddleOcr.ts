/**
 * PaddleOCR Service
 * Uses ppu-paddle-ocr (PP-OCRv4 via onnxruntime-node) for image/PDF OCR.
 *
 * Configurable constants — edit these to tune behaviour:
 */

/** Maximum PDF pages to OCR. Pages beyond this limit are skipped with a note. */
export const OCR_PDF_PAGE_CAP = 20;

/** Minimum extracted characters to consider OCR "successful" (triggers LLM Vision fallback if below). */
export const OCR_MIN_CHARS_THRESHOLD = 80;

/** Minimum ratio of printable-to-total chars; below this indicates garbled output. */
export const OCR_MIN_PRINTABLE_RATIO = 0.7;

/** Language for OCR (Tesseract-style lang codes; PaddleOCR uses 'en', 'ch', 'japan', etc.) */
export const OCR_LANGUAGE = 'en';

import path from 'path';
import { app } from 'electron';
import { logger } from './logger';
import type { DocumentItem } from '../../shared/types';

export interface OcrResult {
  text: string;
  /** Confidence in range 0–1. Below ~0.5 triggers LLM Vision fallback. */
  confidence: number;
  pageCount?: number;
}

/**
 * Assess extracted text quality.
 * Returns a confidence score 0–1.
 */
function assessConfidence(text: string): number {
  if (!text || text.trim().length < OCR_MIN_CHARS_THRESHOLD) return 0;
  const printable = (text.match(/[\x20-\x7E\u00A0-\uFFFF]/g) || []).length;
  const ratio = printable / text.length;
  if (ratio < OCR_MIN_PRINTABLE_RATIO) return 0.2;
  // Scale linearly: 80 chars → 0.5, 500+ chars → 1.0
  const charScore = Math.min(1, text.trim().length / 500);
  return Math.min(1, charScore * ratio);
}

class PaddleOcrService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ocrInstance: any = null;
  private initPromise: Promise<void> | null = null;

  /** Lazy-initialise PaddleOCR. Models are cached in userData/ocr-models on first use. */
  private async init(): Promise<void> {
    if (this.ocrInstance) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const modelDir = path.join(app.getPath('userData'), 'ocr-models');
        logger.info('extract', 'Initialising PaddleOCR (PP-OCRv4)…', { modelDir, lang: OCR_LANGUAGE });

        // Dynamic import so onnxruntime-node is only loaded when needed
        const paddleOcr = await import('ppu-paddle-ocr');
        // PaddleOcrService() takes no constructor args; call initialize() with model preset
        this.ocrInstance = new paddleOcr.PaddleOcrService();
        await this.ocrInstance.initialize(paddleOcr.V4_EN_MOBILE_MODEL);

        logger.info('extract', 'PaddleOCR engine ready');
      } catch (err: any) {
        logger.error('extract', 'Failed to initialise PaddleOCR', { error: err.message });
        throw err;
      }
    })();

    return this.initPromise;
  }

  /**
   * Run OCR on a raw image buffer (JPEG or PNG).
   */
  private async ocrImageBuffer(imageBuffer: Buffer): Promise<OcrResult> {
    await this.init();
    try {
      // PaddleOcrService.recognize() accepts a Buffer
      const results: Array<{ text: string; score?: number }> = await this.ocrInstance.recognize(imageBuffer);

      // results is an array of { text: string, score: number, box: number[][] }
      const lines: string[] = [];
      let totalScore = 0;
      let count = 0;
      for (const item of results || []) {
        if (item.text) {
          lines.push(item.text);
          totalScore += item.score ?? 0.9;
          count++;
        }
      }

      const text = lines.join('\n');
      const paddleConfidence = count > 0 ? totalScore / count : 0;
      const qualityConfidence = assessConfidence(text);
      const confidence = Math.min(paddleConfidence, qualityConfidence + 0.1);

      return { text, confidence };
    } catch (err: any) {
      logger.warn('extract', 'PaddleOCR image inference error', { error: err.message });
      return { text: '', confidence: 0 };
    }
  }

  /**
   * Extract text from a native-text PDF using pdf-parse.
   * Returns null if no embedded text found (scanned PDF).
   */
  private async tryNativePdf(buffer: Buffer): Promise<string | null> {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      const text = (data.text || '').trim();
      if (text.length >= OCR_MIN_CHARS_THRESHOLD) {
        return text;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Render each page of a scanned PDF to a PNG buffer and OCR it.
   * Respects OCR_PDF_PAGE_CAP.
   */
  private async ocrScannedPdf(
    buffer: Buffer,
    onProgress?: (page: number, total: number) => void
  ): Promise<OcrResult> {
    try {
      // Use pdfjs-dist (v4, node canvas mode) to render pages
      const pdfjsLib = await import('pdfjs-dist');
      const { createCanvas } = await import('canvas');

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdfDoc = await loadingTask.promise;

      const totalPages = pdfDoc.numPages;
      const pagesToProcess = Math.min(totalPages, OCR_PDF_PAGE_CAP);
      const pageTexts: string[] = [];
      let overallConfidence = 0;

      logger.info('extract', `OCR scanning PDF: ${pagesToProcess} of ${totalPages} page(s)`);

      if (totalPages > OCR_PDF_PAGE_CAP) {
        pageTexts.push(
          `[Note: This PDF has ${totalPages} pages. Only the first ${OCR_PDF_PAGE_CAP} pages were processed.]`
        );
      }

      for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
        onProgress?.(pageNum, pagesToProcess);

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // 2x scale → ~200 DPI

        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d') as any;

        await (page.render({ canvasContext: context, viewport } as any)).promise;

        const imageBuffer = canvas.toBuffer('image/png');
        const result = await this.ocrImageBuffer(imageBuffer);

        if (result.text.trim()) {
          pageTexts.push(`--- Page ${pageNum} ---\n${result.text}`);
          overallConfidence += result.confidence;
        }
      }

      const finalText = pageTexts.join('\n\n');
      const avgConfidence = pagesToProcess > 0 ? overallConfidence / pagesToProcess : 0;

      return {
        text: finalText,
        confidence: assessConfidence(finalText) * 0.7 + avgConfidence * 0.3,
        pageCount: pagesToProcess,
      };
    } catch (err: any) {
      logger.error('extract', 'Scanned PDF OCR failed', { error: err.message });
      return { text: '', confidence: 0 };
    }
  }

  /**
   * Primary entry point: extract text from any supported document.
   * Routes to the appropriate strategy based on MIME type.
   */
  public async extract(
    doc: DocumentItem,
    fileBuffer: Buffer,
    onProgress?: (page: number, total: number) => void
  ): Promise<OcrResult> {
    const { file_type, filename } = doc;

    // Plain text — read directly, no OCR needed
    if (file_type === 'text/plain') {
      const text = fileBuffer.toString('utf8');
      return { text, confidence: 1, pageCount: 1 };
    }

    // PDF — try native text layer first, fall back to page-level OCR
    if (file_type === 'application/pdf') {
      const nativeText = await this.tryNativePdf(fileBuffer);
      if (nativeText) {
        logger.info('extract', `PDF native text layer extracted: ${filename}`, { chars: nativeText.length });
        return { text: nativeText, confidence: assessConfidence(nativeText), pageCount: 1 };
      }
      logger.info('extract', `No native text layer in ${filename} — running page OCR`);
      return this.ocrScannedPdf(fileBuffer, onProgress);
    }

    // Image (JPEG / PNG / etc.)
    if (file_type.startsWith('image/')) {
      return this.ocrImageBuffer(fileBuffer);
    }

    // Unsupported binary — return a metadata stub and mark as skipped
    return {
      text: `[Document: ${filename}] (Binary format: ${file_type})`,
      confidence: 1, // No fallback needed for unrecognised binaries
    };
  }
}

export const paddleOcrService = new PaddleOcrService();
