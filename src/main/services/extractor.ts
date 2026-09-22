import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { vault } from './vault';
import { updateDocumentExtractedText, getDocumentById } from '../db/database';
import type { DocumentItem } from '../../shared/types';
import { logger } from './logger';

export class ExtractorService {
  /**
   * Extract text from a document if not already extracted.
   */
  public async extractText(documentId: string): Promise<string> {
    const doc = getDocumentById(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Return cached extracted text if already present
    if (doc.extracted_text && doc.extracted_text.trim().length > 0) {
      return doc.extracted_text;
    }

    const fullPath = path.join(vault.getVaultDir(), doc.storage_path);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Document file missing on disk: ${doc.storage_path}`);
    }

    logger.info('extract', `Extracting text from ${doc.filename}`, { type: doc.file_type });

    let extracted = '';

    try {
      if (doc.file_type === 'application/pdf') {
        const dataBuffer = fs.readFileSync(fullPath);
        const pdfData = await pdfParse(dataBuffer);
        extracted = pdfData.text || '';
        if (extracted.trim().length === 0) {
          extracted = `[Scanned Medical Report / Non-text PDF: ${doc.filename}]\nFile size: ${(doc.file_size / 1024).toFixed(0)} KB.\nNote: This PDF does not contain an embedded digital text stream (likely a scan or photo-based report). Metadata and document reference preserved.`;
        }
      } else if (doc.file_type === 'text/plain') {
        extracted = fs.readFileSync(fullPath, 'utf8');
      } else if (doc.file_type.startsWith('image/')) {
        // Scanned image fallback placeholder with file metadata
        extracted = `[Scanned Medical Image: ${doc.filename}]\nFile size: ${(doc.file_size / 1024).toFixed(1)} KB. Multimodal vision or OCR extraction supported.`;
      } else {
        extracted = `[Document: ${doc.filename}] (Binary format: ${doc.file_type})`;
      }

      // Clean up whitespace
      extracted = extracted.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

      // Persist to database so subsequent runs are instant
      updateDocumentExtractedText(doc.id, extracted);

      logger.info('extract', `Extraction complete for ${doc.filename}`, {
        chars: extracted.length,
      });

      return extracted;
    } catch (err: any) {
      logger.error('extract', `Failed to extract text from ${doc.filename}`, {
        error: err.message || String(err),
      });
      const fallback = `[Extraction Notice: Unable to parse document ${doc.filename}. Error: ${err.message}]`;
      updateDocumentExtractedText(doc.id, fallback);
      return fallback;
    }
  }

  /**
   * Batch extracts text for multiple documents.
   */
  public async extractMultiple(documentIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const id of documentIds) {
      const text = await this.extractText(id);
      map.set(id, text);
    }
    return map;
  }
}

export const extractor = new ExtractorService();
