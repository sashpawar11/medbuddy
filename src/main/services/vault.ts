import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app } from 'electron';
import { insertDocument, deleteDocument, getDocumentById } from '../db/database';
import type { DocumentItem } from '../../shared/types';
import { logger } from './logger';

export class VaultService {
  private vaultDir: string = '';

  public init() {
    this.vaultDir = path.join(app.getPath('userData'), 'vault', 'documents');
    if (!fs.existsSync(this.vaultDir)) {
      fs.mkdirSync(this.vaultDir, { recursive: true });
    }
    logger.info('vault', 'Vault initialized', { vaultDir: this.vaultDir });
  }

  public getVaultDir(): string {
    return this.vaultDir;
  }

  /**
   * Import a single file from the local file system into the encrypted/isolated vault.
   */
  public async importFile(sourcePath: string, folderId: string): Promise<DocumentItem> {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`File does not exist: ${sourcePath}`);
    }

    const stats = fs.statSync(sourcePath);
    const filename = path.basename(sourcePath);
    const ext = path.extname(filename).toLowerCase();
    const buffer = fs.readFileSync(sourcePath);

    // Compute SHA-256 content hash
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Safe internal filename to prevent directory traversal and name collisions
    const safeBase = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageFilename = `${contentHash.slice(0, 16)}_${safeBase}`;
    const destinationPath = path.join(this.vaultDir, storageFilename);

    if (!fs.existsSync(destinationPath)) {
      fs.writeFileSync(destinationPath, buffer);
    }

    // Determine mime/file type
    let fileType = 'application/octet-stream';
    if (ext === '.pdf') fileType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') fileType = 'image/jpeg';
    else if (ext === '.png') fileType = 'image/png';
    else if (ext === '.txt') fileType = 'text/plain';

    const doc = insertDocument({
      folder_id: folderId,
      filename,
      file_type: fileType,
      file_size: stats.size,
      storage_path: storageFilename,
      content_hash: contentHash,
      extracted_text: null,
    });

    logger.info('vault', `Imported document ${filename}`, {
      id: doc.id,
      size: stats.size,
      hash: contentHash.slice(0, 8),
    });

    return doc;
  }

  /**
   * Read document contents as a Data URL for safe rendering in the renderer process.
   */
  public readDocumentData(documentId: string): { mimeType: string; dataUrl: string; filename: string; text?: string | null } {
    const doc = getDocumentById(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const fullPath = path.join(this.vaultDir, doc.storage_path);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File missing on disk: ${doc.storage_path}`);
    }

    const buffer = fs.readFileSync(fullPath);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${doc.file_type};base64,${base64}`;

    return {
      mimeType: doc.file_type,
      dataUrl,
      filename: doc.filename,
      text: doc.extracted_text,
    };
  }

  /**
   * Delete a document from disk and database.
   */
  public deleteFile(documentId: string): void {
    const doc = deleteDocument(documentId);
    if (doc) {
      const fullPath = path.join(this.vaultDir, doc.storage_path);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (e) {
          logger.warn('vault', `Could not delete physical file: ${fullPath}`);
        }
      }
      logger.info('vault', `Deleted document ${doc.filename}`, { id: documentId });
    }
  }
}

export const vault = new VaultService();
