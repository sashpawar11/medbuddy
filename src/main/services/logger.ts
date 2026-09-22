import fs from 'fs';
import path from 'path';
import { app, BrowserWindow } from 'electron';
import type { AppLogEntry } from '../../shared/types';
import { getDatabase } from '../db/database';

class LoggerService {
  private logFilePath: string = '';
  private initialized = false;

  public init() {
    if (this.initialized) return;
    try {
      const logDir = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      this.logFilePath = path.join(logDir, 'medbuddy.log');
      this.initialized = true;
      this.info('app', 'Logger initialized', { logPath: this.logFilePath });
    } catch (err) {
      console.error('Failed to initialize file logger:', err);
    }
  }

  private writeToFile(entry: AppLogEntry) {
    if (!this.logFilePath) return;
    try {
      const line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message} ${entry.details ? JSON.stringify(entry.details) : ''}\n`;
      fs.appendFileSync(this.logFilePath, line, 'utf8');
    } catch (e) {
      // Don't throw on log write error
    }
  }

  private writeToDatabase(entry: Omit<AppLogEntry, 'id'>) {
    try {
      const db = getDatabase();
      if (!db) return;
      const stmt = db.prepare(
        'INSERT INTO app_logs (level, category, message, details, timestamp) VALUES (?, ?, ?, ?, ?)'
      );
      const res = stmt.run(
        entry.level,
        entry.category,
        entry.message,
        entry.details || null,
        entry.timestamp
      );
      return Number(res.lastInsertRowid);
    } catch (e) {
      // Ignore during early startup before DB is ready
      return 0;
    }
  }

  private broadcast(entry: AppLogEntry) {
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('log:emitted', entry);
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  public log(level: AppLogEntry['level'], category: AppLogEntry['category'], message: string, details?: any) {
    const timestamp = new Date().toISOString();
    const sanitizedDetails = details ? this.sanitize(details) : null;
    const detailsStr = sanitizedDetails ? (typeof sanitizedDetails === 'string' ? sanitizedDetails : JSON.stringify(sanitizedDetails)) : null;

    const entryWithoutId = {
      level,
      category,
      message,
      details: detailsStr,
      timestamp,
    };

    console.log(`[${level.toUpperCase()}] [${category}] ${message}`, detailsStr || '');

    const id = this.writeToDatabase(entryWithoutId) || Date.now();
    const fullEntry: AppLogEntry = { id, ...entryWithoutId };

    this.writeToFile(fullEntry);
    this.broadcast(fullEntry);
  }

  public info(category: AppLogEntry['category'], message: string, details?: any) {
    this.log('info', category, message, details);
  }

  public warn(category: AppLogEntry['category'], message: string, details?: any) {
    this.log('warn', category, message, details);
  }

  public error(category: AppLogEntry['category'], message: string, details?: any) {
    this.log('error', category, message, details);
  }

  public debug(category: AppLogEntry['category'], message: string, details?: any) {
    this.log('debug', category, message, details);
  }

  /**
   * Sanitizes payloads to ensure sensitive personal medical records and patient names are not logged in plaintext.
   */
  private sanitize(data: any): any {
    if (!data) return data;
    if (typeof data === 'string') {
      // Mask possible API keys or tokens
      return data.replace(/(Bearer\s+)[A-Za-z0-9_\-\.]{8,}/gi, '$1[REDACTED]')
                 .replace(/(api[-_]?key["']?\s*[:=]\s*["']?)[A-Za-z0-9_\-\.]{8,}/gi, '$1[REDACTED]');
    }
    if (typeof data === 'object') {
      try {
        const copy = JSON.parse(JSON.stringify(data));
        if (copy.api_key) copy.api_key = '[REDACTED]';
        if (copy.apiKey) copy.apiKey = '[REDACTED]';
        if (copy.extractedText && typeof copy.extractedText === 'string') {
          copy.extractedText = `[TEXT_LEN:${copy.extractedText.length}]`;
        }
        return copy;
      } catch {
        return '[Unserializable Object]';
      }
    }
    return data;
  }
}

export const logger = new LoggerService();
