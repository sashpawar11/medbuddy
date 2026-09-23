/**
 * LLM Vision Extractor
 *
 * Sends an image as a base64-encoded data URL to the user's configured local vision
 * model via the existing OpenAI-compatible chat completions endpoint.
 *
 * This is Stage 2 of the extraction pipeline — invoked only when PaddleOCR returns
 * low-confidence results (e.g. degraded scans, heavy handwriting, stamps over text).
 *
 * Reuses the existing AIProviderService — no new infrastructure required.
 */

import path from 'path';
import { app } from 'electron';
import { aiProvider } from './ai/provider';
import { listProviders, getProviderById } from '../db/database';
import type { ProviderProfile } from '../../shared/types';
import { logger } from './logger';
import { OCR_PDF_PAGE_CAP } from './paddleOcr';

/** Maximum PDF pages to send to LLM Vision (respects the same cap as PaddleOCR). */
const LLM_VISION_PAGE_CAP = OCR_PDF_PAGE_CAP;

/**
 * The focused transcription prompt sent to the vision model.
 * Deliberately avoids summarisation — we want verbatim text.
 */
const VISION_OCR_PROMPT = `You are a medical document transcription assistant.
Your task is to carefully read every piece of text in the attached medical document image and return a complete, verbatim transcription.

Include:
- All printed text, handwritten notes, and stamps
- Lab values with their units and reference ranges
- Doctor names, hospital names, dates
- Table data (preserve rows and column labels)
- Medication names and dosages in prescriptions

Do NOT summarise, interpret, or reformat. Output ONLY the transcribed text exactly as it appears in the document, preserving line breaks and structure where possible.`;

export interface LlmVisionResult {
  text: string;
  usedVision: boolean;
  /** True if the configured model does not appear to support vision inputs */
  visionUnsupported?: boolean;
}

class LlmVisionExtractor {
  /**
   * Resolve the best available provider profile for vision extraction.
   * Prefers the user's default provider (they know what models they have).
   */
  private resolveProfile(preferredProfileId?: string): ProviderProfile | null {
    if (preferredProfileId) {
      const p = getProviderById(preferredProfileId);
      if (p) return p;
    }
    const all = listProviders();
    return all.find((p) => p.is_default === 1) || all[0] || null;
  }

  /**
   * Send a single image buffer to the LLM vision model and return its transcription.
   */
  private async transcribeImage(
    imageBuffer: Buffer,
    mimeType: string,
    profile: ProviderProfile,
    label: string,
    onProgress?: (elapsedSec: number) => void
  ): Promise<{ text: string; visionUnsupported: boolean }> {
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    try {
      const resp = await aiProvider.chatCompletion({
        profile,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: VISION_OCR_PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } },
            ] as any,
          },
        ],
        temperature: 0.0,
        timeoutMs: 120_000, // 2 min per page/image
        onHeartbeat: onProgress ? (sec) => onProgress(sec) : undefined,
      });

      return { text: resp.content.trim(), visionUnsupported: false };
    } catch (err: any) {
      const msg: string = err.message || '';
      // Detect models that explicitly reject vision inputs
      const isUnsupported =
        msg.includes('does not support') ||
        msg.includes('image_url') ||
        (err as any).statusCode === 400 ||
        (err as any).statusCode === 422;

      if (isUnsupported) {
        logger.warn('extract', `Provider "${profile.name}" (${profile.model}) does not support vision inputs. Skipping LLM Vision fallback.`);
        return { text: '', visionUnsupported: true };
      }

      logger.error('extract', `LLM Vision transcription failed for ${label}`, { error: msg });
      return { text: '', visionUnsupported: false };
    }
  }

  /**
   * Extract text from an image (JPEG/PNG) buffer via LLM Vision.
   */
  public async extractFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    filename: string,
    preferredProfileId?: string,
    onProgress?: (elapsedSec: number) => void
  ): Promise<LlmVisionResult> {
    const profile = this.resolveProfile(preferredProfileId);
    if (!profile) {
      logger.warn('extract', 'No AI provider configured — skipping LLM Vision fallback');
      return { text: '', usedVision: false };
    }

    logger.info('extract', `LLM Vision extraction: ${filename}`, { model: profile.model });
    const { text, visionUnsupported } = await this.transcribeImage(
      imageBuffer,
      mimeType,
      profile,
      filename,
      onProgress
    );

    return { text, usedVision: !visionUnsupported && text.length > 0, visionUnsupported };
  }

  /**
   * Extract text from a scanned PDF by rendering each page image and sending to LLM Vision.
   * Uses pdfjs-dist to render pages; respects LLM_VISION_PAGE_CAP.
   */
  public async extractFromScannedPdf(
    pdfBuffer: Buffer,
    filename: string,
    preferredProfileId?: string,
    onProgress?: (page: number, total: number) => void
  ): Promise<LlmVisionResult> {
    const profile = this.resolveProfile(preferredProfileId);
    if (!profile) {
      logger.warn('extract', 'No AI provider configured — skipping LLM Vision PDF fallback');
      return { text: '', usedVision: false };
    }

    try {
      const pdfjsLib = await import('pdfjs-dist');
      const { createCanvas } = await import('canvas');

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
      const pdfDoc = await loadingTask.promise;

      const totalPages = pdfDoc.numPages;
      const pagesToProcess = Math.min(totalPages, LLM_VISION_PAGE_CAP);

      const pageTexts: string[] = [];
      if (totalPages > LLM_VISION_PAGE_CAP) {
        pageTexts.push(
          `[Note: PDF has ${totalPages} pages; LLM Vision processed the first ${LLM_VISION_PAGE_CAP}.]`
        );
      }

      let visionUnsupported = false;

      for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
        onProgress?.(pageNum, pagesToProcess);

        if (visionUnsupported) break;

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d') as any;
        await (page.render({ canvasContext: context, viewport } as any)).promise;

        const imageBuffer = canvas.toBuffer('image/png');
        const { text, visionUnsupported: unsupported } = await this.transcribeImage(
          imageBuffer,
          'image/png',
          profile,
          `${filename} p.${pageNum}`,
          undefined
        );

        if (unsupported) {
          visionUnsupported = true;
          break;
        }

        if (text.trim()) {
          pageTexts.push(`--- Page ${pageNum} ---\n${text}`);
        }
      }

      const finalText = pageTexts.join('\n\n');
      return {
        text: finalText,
        usedVision: !visionUnsupported && finalText.trim().length > 0,
        visionUnsupported,
      };
    } catch (err: any) {
      logger.error('extract', `LLM Vision PDF extraction failed for ${filename}`, { error: err.message });
      return { text: '', usedVision: false };
    }
  }
}

export const llmVisionExtractor = new LlmVisionExtractor();
