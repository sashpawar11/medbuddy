import crypto from 'crypto';
import {
  getDocumentById,
  listDocumentsForMember,
  getChunksCountForDocument,
  insertDocumentChunk,
  deleteDocumentChunks,
  getDatabase,
} from '../../db/database';
import { logger } from '../logger';

export interface ChunkInfo {
  id: string;
  documentId: string;
  memberId: string;
  chunkIndex: number;
  chunkText: string;
  pageNumber: number;
  documentDate?: string | null;
}

const TARGET_CHUNK_SIZE = 1400; // characters (~350 words)
const CHUNK_OVERLAP = 150;     // characters

export class DocumentChunkerService {
  /**
   * Extract a candidate date (YYYY-MM-DD) from clinical text or filename.
   */
  public extractDateFromText(text: string, fallbackDate?: string): string | null {
    // 1. Match ISO dates YYYY-MM-DD
    const isoMatch = text.match(/\b(20\d{2}|19\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // 2. Match DD/MM/YYYY or MM/DD/YYYY
    const slashMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2}|19\d{2})\b/);
    if (slashMatch) {
      return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
    }

    // 3. Fallback to doc created_at if available
    if (fallbackDate && fallbackDate.length >= 10) {
      return fallbackDate.slice(0, 10);
    }

    return null;
  }

  /**
   * Split document text into coherent clinical chunks preserving page numbers.
   */
  public splitIntoChunks(
    documentId: string,
    memberId: string,
    text: string,
    fallbackDate?: string
  ): ChunkInfo[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const docDate = this.extractDateFromText(text.slice(0, 2000), fallbackDate);
    const chunks: ChunkInfo[] = [];

    // Check for explicit page breaks (e.g. "--- Page 1 ---" or form feed)
    const pageBreakRegex = /(?:---+\s*Page\s+(\d+)\s*---+|\f)/i;
    const hasPageBreaks = pageBreakRegex.test(text);

    let rawPages: Array<{ pageNumber: number; content: string }> = [];

    if (hasPageBreaks) {
      const parts = text.split(/(?=---+\s*Page\s+\d+\s*---+|\f)/i);
      let currentPage = 1;
      for (const part of parts) {
        const pageMatch = part.match(/---+\s*Page\s+(\d+)\s*---+/i);
        if (pageMatch) {
          currentPage = parseInt(pageMatch[1], 10) || currentPage;
        }
        const cleanedContent = part.replace(/---+\s*Page\s+\d+\s*---+/i, '').trim();
        if (cleanedContent.length > 0) {
          rawPages.push({ pageNumber: currentPage, content: cleanedContent });
        }
      }
    } else {
      rawPages.push({ pageNumber: 1, content: text.trim() });
    }

    let globalChunkIndex = 0;

    for (const page of rawPages) {
      const pageText = page.content;
      if (pageText.length <= TARGET_CHUNK_SIZE) {
        const chunkId = `chk_${documentId.slice(0, 8)}_${globalChunkIndex}_${crypto.randomUUID().slice(0, 6)}`;
        chunks.push({
          id: chunkId,
          documentId,
          memberId,
          chunkIndex: globalChunkIndex++,
          chunkText: pageText,
          pageNumber: page.pageNumber,
          documentDate: docDate,
        });
        continue;
      }

      // Split pageText by paragraphs or line breaks to keep tables / lab lines together
      const paragraphs = pageText.split(/\n\s*\n/);
      let currentChunkText = '';

      for (const para of paragraphs) {
        const trimmedPara = para.trim();
        if (!trimmedPara) continue;

        if (currentChunkText.length + trimmedPara.length + 2 <= TARGET_CHUNK_SIZE) {
          currentChunkText += (currentChunkText ? '\n\n' : '') + trimmedPara;
        } else {
          // If current accumulator has content, flush it
          if (currentChunkText) {
            const chunkId = `chk_${documentId.slice(0, 8)}_${globalChunkIndex}_${crypto.randomUUID().slice(0, 6)}`;
            chunks.push({
              id: chunkId,
              documentId,
              memberId,
              chunkIndex: globalChunkIndex++,
              chunkText: currentChunkText,
              pageNumber: page.pageNumber,
              documentDate: docDate,
            });
            // Carry over overlap from previous chunk
            const overlapText = currentChunkText.slice(-CHUNK_OVERLAP);
            currentChunkText = overlapText + '\n\n' + trimmedPara;
          } else {
            // A single very long paragraph (e.g. dense table or raw dump)
            let start = 0;
            while (start < trimmedPara.length) {
              const end = Math.min(start + TARGET_CHUNK_SIZE, trimmedPara.length);
              const piece = trimmedPara.slice(start, end);
              const chunkId = `chk_${documentId.slice(0, 8)}_${globalChunkIndex}_${crypto.randomUUID().slice(0, 6)}`;
              chunks.push({
                id: chunkId,
                documentId,
                memberId,
                chunkIndex: globalChunkIndex++,
                chunkText: piece,
                pageNumber: page.pageNumber,
                documentDate: docDate,
              });
              start += (TARGET_CHUNK_SIZE - CHUNK_OVERLAP);
            }
            currentChunkText = '';
          }
        }
      }

      if (currentChunkText.trim().length > 0) {
        const chunkId = `chk_${documentId.slice(0, 8)}_${globalChunkIndex}_${crypto.randomUUID().slice(0, 6)}`;
        chunks.push({
          id: chunkId,
          documentId,
          memberId,
          chunkIndex: globalChunkIndex++,
          chunkText: currentChunkText.trim(),
          pageNumber: page.pageNumber,
          documentDate: docDate,
        });
      }
    }

    return chunks;
  }

  /**
   * Chunk a single document and persist chunks into document_chunks and FTS5.
   */
  public async chunkDocument(documentId: string): Promise<number> {
    const doc = getDocumentById(documentId);
    if (!doc) {
      logger.warn('ai', `Chunking skipped: document not found ${documentId}`);
      return 0;
    }

    if (!doc.extracted_text || doc.extracted_text.trim().length === 0) {
      return 0;
    }

    // Determine memberId from folder
    const db = getDatabase();
    const folderRow = db.prepare('SELECT member_id FROM folders WHERE id = ?').get(doc.folder_id) as { member_id: string } | undefined;
    if (!folderRow || !folderRow.member_id) {
      logger.warn('ai', `Chunking skipped: could not determine member for doc ${documentId}`);
      return 0;
    }
    const memberId = folderRow.member_id;

    // Remove existing chunks for this document to prevent duplicates
    deleteDocumentChunks(documentId);

    const chunks = this.splitIntoChunks(documentId, memberId, doc.extracted_text, doc.created_at);
    for (const chunk of chunks) {
      insertDocumentChunk({
        id: chunk.id,
        documentId: chunk.documentId,
        memberId: chunk.memberId,
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.chunkText,
        pageNumber: chunk.pageNumber,
        documentDate: chunk.documentDate,
      });
    }

    logger.info('ai', `Indexed ${chunks.length} chunks for document: ${doc.filename}`, {
      documentId,
      memberId,
      chars: doc.extracted_text.length,
    });

    return chunks.length;
  }

  /**
   * Ensure all unchunked documents for a given member profile are chunked.
   */
  public async ensureMemberDocumentsChunked(memberId: string): Promise<number> {
    const docs = listDocumentsForMember(memberId);
    let totalChunked = 0;

    for (const doc of docs) {
      if (doc.extracted_text && doc.extracted_text.trim().length > 0) {
        const count = getChunksCountForDocument(doc.id);
        if (count === 0) {
          const added = await this.chunkDocument(doc.id);
          totalChunked += added;
        }
      }
    }

    return totalChunked;
  }
}

export const documentChunker = new DocumentChunkerService();
