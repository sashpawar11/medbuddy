import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { shell } from 'electron';
import {
  getSyncSettings,
  saveSyncSettings,
  getSyncTokens,
  saveSyncTokens,
  recordSyncItem,
  getSyncItem,
  listMembers,
  listFolders,
  listDocuments,
  listAllDocuments,
  listDocumentsForMember,
  getDatabase,
} from '../../db/database';
import { vault } from '../vault';
import { logger } from '../logger';
import type {
  GoogleSyncSettings,
  SyncScope,
  SyncMountType,
  SyncProgressEvent,
  SyncResult,
  SyncMountTestResult,
  FamilyMember,
  Folder,
  DocumentItem,
} from '../../../shared/types';

export class GoogleDriveSyncService {
  private progressCallback: ((event: SyncProgressEvent) => void) | null = null;
  private isSyncing: boolean = false;
  private loopbackServer: http.Server | null = null;

  public setProgressCallback(cb: ((event: SyncProgressEvent) => void) | null) {
    this.progressCallback = cb;
  }

  private emitProgress(event: SyncProgressEvent) {
    if (this.progressCallback) {
      try {
        this.progressCallback(event);
      } catch (e) {
        // Ignore listener error
      }
    }
  }

  /**
   * Initiate Google OAuth 2.0 flow or Demo account connection.
   */
  public async startOAuth(params?: {
    clientId?: string;
    clientSecret?: string;
    useDemo?: boolean;
  }): Promise<{ success: boolean; user?: { name: string; email: string; avatar?: string }; error?: string }> {
    const currentSettings = getSyncSettings();
    const clientId = params?.clientId || currentSettings.clientId;
    const clientSecret = params?.clientSecret || currentSettings.clientSecret;

    // 1. Explicit Demo Mode for Sandbox / Test / Offline environment
    if (params?.useDemo) {
      logger.info('vault', 'Connecting via Google Drive Demo Mode');
      const demoUser = {
        name: 'Demo Account (Eleanor Vance)',
        email: 'demo.patient@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=face',
      };

      saveSyncSettings({
        isSignedIn: true,
        userName: demoUser.name,
        userEmail: demoUser.email,
        userAvatar: demoUser.avatar,
        lastSyncStatus: 'idle',
        lastSyncError: null,
      });

      saveSyncTokens({
        accessToken: 'mock_access_token_' + crypto.randomUUID(),
        refreshToken: 'mock_refresh_token_' + crypto.randomUUID(),
        tokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      return {
        success: true,
        user: demoUser,
      };
    }

    // 2. Real Google OAuth 2.0 with local loopback server
    if (!clientId || !clientId.trim()) {
      return {
        success: false,
        error: 'Google OAuth Client ID is required to sign in with your Google account. Please enter your Google Cloud Client ID below (or choose "Use Demo Account" for sandbox testing).',
      };
    }

    // Save Client ID and Client Secret
    saveSyncSettings({
      clientId: clientId.trim(),
      clientSecret: clientSecret ? clientSecret.trim() : null,
    });

    return new Promise((resolve) => {
      // Find an available port on 127.0.0.1
      const server = http.createServer();
      this.loopbackServer = server;

      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        const port = address.port;
        const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;

        const authUrl =
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(clientId.trim())}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}&` +
          `access_type=offline&` +
          `prompt=${encodeURIComponent('select_account consent')}`;

        logger.info('vault', `Starting Google OAuth loopback server on port ${port}`, { redirectUri });

        // Timeout handler (5 minutes)
        const timeoutId = setTimeout(() => {
          server.close();
          resolve({
            success: false,
            error: 'Google OAuth sign-in timed out. Please try again.',
          });
        }, 5 * 60 * 1000);

        server.on('request', async (req, res) => {
          try {
            const reqUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`);
            if (reqUrl.pathname === '/oauth2callback') {
              const code = reqUrl.searchParams.get('code');
              const error = reqUrl.searchParams.get('error');

              if (error) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                  <html>
                    <body style="background:#07080a;color:#f4f4f6;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
                      <div style="text-align:center;padding:32px;background:#0d0d0d;border:1px solid #242728;border-radius:12px;">
                        <h2 style="color:#ff6161;">Authentication Cancelled</h2>
                        <p style="color:#9c9c9d;">${error}</p>
                        <p style="font-size:12px;color:#6a6b6c;">You can return to MedBuddy now.</p>
                      </div>
                    </body>
                  </html>
                `);
                clearTimeout(timeoutId);
                server.close();
                resolve({ success: false, error: `Google OAuth error: ${error}` });
                return;
              }

              if (!code) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Missing authorization code');
                return;
              }

              // Exchange authorization code for tokens
              const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  code,
                  client_id: clientId,
                  client_secret: clientSecret || '',
                  redirect_uri: redirectUri,
                  grant_type: 'authorization_code',
                }),
              });

              if (!tokenResponse.ok) {
                const errText = await tokenResponse.text();
                throw new Error(`Token exchange failed (${tokenResponse.status}): ${errText}`);
              }

              const tokenData: any = await tokenResponse.json();
              const accessToken = tokenData.access_token;
              const refreshToken = tokenData.refresh_token;
              const expiresIn = tokenData.expires_in || 3600;
              const expiryDate = new Date(Date.now() + expiresIn * 1000).toISOString();

              saveSyncTokens({
                accessToken,
                refreshToken: refreshToken || null,
                tokenExpiry: expiryDate,
              });

              // Fetch User Profile
              let userName = 'Google User';
              let userEmail = 'user@gmail.com';
              let userAvatar: string | null = null;

              try {
                const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (profileRes.ok) {
                  const profileData: any = await profileRes.json();
                  userName = profileData.name || userName;
                  userEmail = profileData.email || userEmail;
                  userAvatar = profileData.picture || null;
                }
              } catch (profileErr) {
                logger.warn('vault', 'Could not fetch user profile details', { err: String(profileErr) });
              }

              saveSyncSettings({
                isSignedIn: true,
                userName,
                userEmail,
                userAvatar,
                lastSyncStatus: 'idle',
                lastSyncError: null,
              });

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="background:#07080a;color:#f4f4f6;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
                    <div style="text-align:center;padding:32px;background:#0d0d0d;border:1px solid #242728;border-radius:12px;max-width:400px;">
                      <div style="width:48px;height:48px;border-radius:24px;background:#59d499;color:#000;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;margin-bottom:16px;">✓</div>
                      <h2 style="margin:0 0 8px 0;font-size:18px;">Connected to Google Drive</h2>
                      <p style="color:#cdcdcd;font-size:14px;margin:0 0 16px 0;">Signed in as <strong>${userEmail}</strong></p>
                      <p style="color:#6a6b6c;font-size:12px;margin:0;">You can close this tab and return to MedBuddy.</p>
                    </div>
                  </body>
                </html>
              `);

              clearTimeout(timeoutId);
              server.close();
              resolve({
                success: true,
                user: { name: userName, email: userEmail, avatar: userAvatar || undefined },
              });
            }
          } catch (err: any) {
            clearTimeout(timeoutId);
            server.close();
            resolve({
              success: false,
              error: err.message || 'OAuth handling failed',
            });
          }
        });

        // Open external browser for Google login
        shell.openExternal(authUrl);
      });
    });
  }

  /**
   * Disconnect Google Drive account.
   */
  public async disconnect(): Promise<void> {
    saveSyncTokens({
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
    });
    saveSyncSettings({
      isSignedIn: false,
      userEmail: null,
      userName: null,
      userAvatar: null,
      lastSyncStatus: 'idle',
      lastSyncError: null,
    });
    logger.info('vault', 'Google Drive disconnected');
  }

  /**
   * Get valid access token, auto-refreshing if expired.
   */
  private async getValidAccessToken(): Promise<string | null> {
    const tokens = getSyncTokens();
    if (!tokens.accessToken) return null;

    // Check expiry
    if (tokens.tokenExpiry) {
      const expiry = new Date(tokens.tokenExpiry).getTime();
      const now = Date.now();
      // If expires within 2 minutes and we have a refresh token
      if (expiry - now < 120 * 1000 && tokens.refreshToken) {
        const settings = getSyncSettings();
        if (settings.clientId) {
          try {
            const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: settings.clientId,
                client_secret: settings.clientSecret || '',
                refresh_token: tokens.refreshToken,
                grant_type: 'refresh_token',
              }),
            });

            if (refreshRes.ok) {
              const data: any = await refreshRes.json();
              const newAccessToken = data.access_token;
              const expiresIn = data.expires_in || 3600;
              const newExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

              saveSyncTokens({
                accessToken: newAccessToken,
                tokenExpiry: newExpiry,
              });
              return newAccessToken;
            }
          } catch (e) {
            logger.warn('vault', 'Failed to refresh Google OAuth token', { error: String(e) });
          }
        }
      }
    }

    return tokens.accessToken;
  }

  /**
   * Test mounting Google Drive remote folder or local path.
   */
  public async testDriveMount(config: {
    mountType: SyncMountType;
    driveFolderName?: string;
    localMountPath?: string;
  }): Promise<SyncMountTestResult> {
    const settings = getSyncSettings();
    const mountType = config.mountType || settings.mountType;

    if (mountType === 'local_mount') {
      const localPath = config.localMountPath || settings.localMountPath;
      if (!localPath) {
        return {
          success: false,
          message: 'Please specify a local Google Drive mount directory path.',
        };
      }

      try {
        if (!fs.existsSync(localPath)) {
          fs.mkdirSync(localPath, { recursive: true });
        }

        // Test write permission
        const testFile = path.join(localPath, `.medbuddy_mount_test_${Date.now()}.tmp`);
        fs.writeFileSync(testFile, 'medbuddy_test');
        fs.unlinkSync(testFile);

        saveSyncSettings({
          mountType: 'local_mount',
          localMountPath: localPath,
        });

        return {
          success: true,
          message: `Local Google Drive folder mounted and verified: ${localPath}`,
          mountPath: localPath,
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Cannot write to local folder: ${err.message}`,
        };
      }
    }

    // Cloud Mount
    const folderName = config.driveFolderName || settings.driveFolderName || 'MedBuddy Vault';
    const accessToken = await this.getValidAccessToken();

    // Check if in demo / test mode
    if (!accessToken || accessToken.startsWith('mock_')) {
      const mockFolderId = 'mock_drive_vault_' + crypto.randomUUID().slice(0, 8);
      saveSyncSettings({
        mountType: 'cloud',
        driveFolderName: folderName,
        driveFolderId: mockFolderId,
      });

      return {
        success: true,
        message: `Mounted Cloud Google Drive Vault: "${folderName}" (Demo/Connected)`,
        folderId: mockFolderId,
      };
    }

    // Live Google Drive API folder check/creation
    try {
      const folderId = await this.getOrCreateCloudFolder(folderName, 'root', accessToken);
      saveSyncSettings({
        mountType: 'cloud',
        driveFolderName: folderName,
        driveFolderId: folderId,
      });

      return {
        success: true,
        message: `Mounted Google Drive Vault: "${folderName}"`,
        folderId,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Google Drive folder mount failed: ${err.message}`,
      };
    }
  }

  /**
   * Get or create a folder in Google Drive via Drive API v3.
   */
  private async getOrCreateCloudFolder(name: string, parentId: string, accessToken: string): Promise<string> {
    // 1. Search for existing folder
    const query = `name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data: any = await res.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // 2. Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create remote folder "${name}": ${errText}`);
    }

    const createdData: any = await createRes.json();
    return createdData.id;
  }

  /**
   * Upload or update a file in Google Drive via Drive API v3 multipart upload.
   */
  private async uploadCloudFile(
    filePath: string,
    filename: string,
    mimeType: string,
    parentFolderId: string,
    accessToken: string
  ): Promise<string> {
    const fileContent = fs.readFileSync(filePath);
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: filename,
      parents: [parentFolderId],
    };

    const multipartBody = Buffer.concat([
      Buffer.from(
        delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${mimeType}\r\n\r\n`
      ),
      fileContent,
      Buffer.from(closeDelimiter),
    ]);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length),
      },
      body: multipartBody,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Failed to upload file "${filename}": ${errText}`);
    }

    const data: any = await uploadRes.json();
    return data.id;
  }

  /**
   * Execute Sync to Google Drive.
   * Supports:
   * - Sync all profiles at once (scope = 'all')
   * - Sync specific profile (scope = 'profile', memberId)
   * - Sync specific folders (scope = 'folders', folderIds)
   */
  public async startSync(options?: {
    scope?: SyncScope;
    memberId?: string;
    folderIds?: string[];
  }): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('A sync operation is already in progress.');
    }

    this.isSyncing = true;
    const settings = getSyncSettings();
    const scope = options?.scope || settings.syncScope || 'all';
    const targetMemberId = options?.memberId || settings.selectedMemberId;
    const targetFolderIds = options?.folderIds || settings.selectedFolderIds || [];

    const errors: string[] = [];
    let syncedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    try {
      this.emitProgress({
        stage: 'initializing',
        message: 'Initializing Google Drive sync...',
        progressPercent: 5,
        totalFiles: 0,
        syncedFiles: 0,
      });

      // Save active scope settings
      saveSyncSettings({
        syncScope: scope,
        selectedMemberId: targetMemberId || null,
        selectedFolderIds: targetFolderIds,
        lastSyncStatus: 'in_progress',
        lastSyncError: null,
      });

      // Verify mounting destination
      const mountType = settings.mountType;
      let driveRootId = settings.driveFolderId;
      const localMountPath = settings.localMountPath;
      const accessToken = await this.getValidAccessToken();

      this.emitProgress({
        stage: 'mounting',
        message: mountType === 'local_mount'
          ? `Mounting local Google Drive path: ${localMountPath || 'default'}`
          : `Connecting to Google Drive Vault: "${settings.driveFolderName}"`,
        progressPercent: 15,
        totalFiles: 0,
        syncedFiles: 0,
      });

      if (mountType === 'cloud') {
        if (!settings.isSignedIn && !accessToken) {
          throw new Error('Please sign in to Google Drive before syncing.');
        }

        // Auto-mount if needed
        if (!driveRootId) {
          const mountResult = await this.testDriveMount({
            mountType: 'cloud',
            driveFolderName: settings.driveFolderName,
          });
          if (!mountResult.success) {
            throw new Error(mountResult.message);
          }
          driveRootId = mountResult.folderId || 'mock_root';
        }
      } else {
        if (!localMountPath) {
          throw new Error('Local Google Drive mount path is not configured.');
        }
        if (!fs.existsSync(localMountPath)) {
          fs.mkdirSync(localMountPath, { recursive: true });
        }
      }

      // Step 2: Gather target documents according to scope
      this.emitProgress({
        stage: 'scanning',
        message: `Scanning files for sync scope: ${scope}...`,
        progressPercent: 25,
        totalFiles: 0,
        syncedFiles: 0,
      });

      const members = listMembers();
      const memberMap = new Map<string, FamilyMember>();
      members.forEach((m) => memberMap.set(m.id, m));

      // Gather folders and documents
      let targetDocuments: DocumentItem[] = [];
      const folderMap = new Map<string, Folder>();

      if (scope === 'all') {
        for (const m of members) {
          const fList = listFolders(m.id);
          fList.forEach((f) => folderMap.set(f.id, f));
        }
        targetDocuments = listAllDocuments();
      } else if (scope === 'profile') {
        if (!targetMemberId) {
          throw new Error('No profile selected for profile-level sync.');
        }
        const fList = listFolders(targetMemberId);
        fList.forEach((f) => folderMap.set(f.id, f));
        targetDocuments = listDocumentsForMember(targetMemberId);
      } else if (scope === 'folders') {
        if (targetFolderIds.length === 0) {
          throw new Error('No folders selected for folder-level sync.');
        }
        for (const fid of targetFolderIds) {
          const docs = listDocuments(fid);
          targetDocuments.push(...docs);
          // Look up folder info
          for (const m of members) {
            const fList = listFolders(m.id);
            const found = fList.find((f) => f.id === fid);
            if (found) folderMap.set(fid, found);
          }
        }
      }

      const totalFiles = targetDocuments.length;
      logger.info('vault', `Sync scope [${scope}] found ${totalFiles} documents to process`);

      if (totalFiles === 0) {
        this.emitProgress({
          stage: 'completed',
          message: 'Sync complete. No documents found in chosen scope.',
          progressPercent: 100,
          totalFiles: 0,
          syncedFiles: 0,
        });

        const syncedAt = new Date().toISOString();
        saveSyncSettings({
          lastSyncTime: syncedAt,
          lastSyncStatus: 'success',
          lastSyncError: null,
        });

        return {
          success: true,
          syncedCount: 0,
          skippedCount: 0,
          failedCount: 0,
          errors: [],
          syncedAt,
        };
      }

      // Step 3: Process and upload documents
      const vaultDir = vault.getVaultDir();
      const cloudFolderCache = new Map<string, string>(); // pathKey -> remoteFolderId

      for (let i = 0; i < targetDocuments.length; i++) {
        const doc = targetDocuments[i];
        const progressPercent = Math.round(25 + ((i + 1) / totalFiles) * 70);

        this.emitProgress({
          stage: 'uploading',
          message: `Syncing (${i + 1}/${totalFiles}): ${doc.filename}`,
          progressPercent,
          totalFiles,
          syncedFiles: syncedCount + skippedCount,
          currentFile: doc.filename,
        });

        const folder = folderMap.get(doc.folder_id);
        const folderName = folder ? folder.name : 'General';
        const member = folder ? memberMap.get(folder.member_id) : null;
        const memberName = member ? member.name : 'Default';

        // Check if physical file exists
        const localFilePath = path.join(vaultDir, doc.storage_path);
        if (!fs.existsSync(localFilePath)) {
          logger.warn('vault', `File missing on disk during sync: ${doc.filename}`);
          errors.push(`File missing on disk: ${doc.filename}`);
          failedCount++;
          continue;
        }

        // Check incremental sync cache
        const syncItem = getSyncItem(doc.id);
        if (syncItem && syncItem.content_hash === doc.content_hash && syncItem.status === 'synced') {
          skippedCount++;
          continue;
        }

        // Perform Upload according to mount type
        try {
          if (mountType === 'local_mount') {
            // Local Google Drive sync directory
            const destDir = path.join(localMountPath!, memberName, folderName);
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            const destFilePath = path.join(destDir, doc.filename);
            fs.copyFileSync(localFilePath, destFilePath);

            recordSyncItem({
              item_type: 'document',
              local_id: doc.id,
              remote_id: destFilePath,
              content_hash: doc.content_hash,
              status: 'synced',
            });
            syncedCount++;
          } else {
            // Cloud Google Drive API sync
            if (!accessToken || accessToken.startsWith('mock_')) {
              // Simulated cloud sync for demo/mock mode
              await new Promise((r) => setTimeout(r, 60)); // realistic slight delay
              const mockRemoteId = 'mock_drive_file_' + crypto.randomUUID().slice(0, 10);
              recordSyncItem({
                item_type: 'document',
                local_id: doc.id,
                remote_id: mockRemoteId,
                content_hash: doc.content_hash,
                status: 'synced',
              });
              syncedCount++;
            } else {
              // Real Google Drive API calls
              // 1. Ensure Member Folder exists in Drive
              const memberFolderKey = `member:${memberName}`;
              let memberFolderId = cloudFolderCache.get(memberFolderKey);
              if (!memberFolderId) {
                memberFolderId = await this.getOrCreateCloudFolder(memberName, driveRootId!, accessToken);
                cloudFolderCache.set(memberFolderKey, memberFolderId);
              }

              // 2. Ensure Medical Category Folder exists in Drive
              const subfolderKey = `${memberFolderKey}:${folderName}`;
              let subfolderId = cloudFolderCache.get(subfolderKey);
              if (!subfolderId) {
                subfolderId = await this.getOrCreateCloudFolder(folderName, memberFolderId, accessToken);
                cloudFolderCache.set(subfolderKey, subfolderId);
              }

              // 3. Upload Document
              const remoteFileId = await this.uploadCloudFile(
                localFilePath,
                doc.filename,
                doc.file_type,
                subfolderId,
                accessToken
              );

              recordSyncItem({
                item_type: 'document',
                local_id: doc.id,
                remote_id: remoteFileId,
                content_hash: doc.content_hash,
                status: 'synced',
              });
              syncedCount++;
            }
          }
        } catch (fileErr: any) {
          logger.error('vault', `Failed to sync file ${doc.filename}: ${fileErr.message}`);
          errors.push(`${doc.filename}: ${fileErr.message}`);
          failedCount++;
          recordSyncItem({
            item_type: 'document',
            local_id: doc.id,
            remote_id: '',
            content_hash: doc.content_hash,
            status: 'failed',
            error_message: fileErr.message,
          });
        }
      }

      const syncedAt = new Date().toISOString();
      const isSuccess = failedCount === 0;

      saveSyncSettings({
        lastSyncTime: syncedAt,
        lastSyncStatus: isSuccess ? 'success' : 'error',
        lastSyncError: errors.length > 0 ? errors.join(', ') : null,
      });

      this.emitProgress({
        stage: isSuccess ? 'completed' : 'error',
        message: isSuccess
          ? `Sync complete! Synced ${syncedCount} new/updated document(s), ${skippedCount} up-to-date.`
          : `Sync completed with ${failedCount} errors. Synced ${syncedCount}, skipped ${skippedCount}.`,
        progressPercent: 100,
        totalFiles,
        syncedFiles: syncedCount + skippedCount,
        error: errors.length > 0 ? errors[0] : undefined,
      });

      logger.info('vault', 'Sync finished', {
        syncedCount,
        skippedCount,
        failedCount,
        scope,
      });

      return {
        success: isSuccess,
        syncedCount,
        skippedCount,
        failedCount,
        errors,
        syncedAt,
      };
    } catch (err: any) {
      logger.error('vault', `Sync fatal error: ${err.message}`);
      saveSyncSettings({
        lastSyncStatus: 'error',
        lastSyncError: err.message,
      });

      this.emitProgress({
        stage: 'error',
        message: `Sync failed: ${err.message}`,
        progressPercent: 100,
        totalFiles: 0,
        syncedFiles: 0,
        error: err.message,
      });

      return {
        success: false,
        syncedCount,
        skippedCount,
        failedCount: failedCount + 1,
        errors: [err.message, ...errors],
        syncedAt: new Date().toISOString(),
      };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const googleDriveSync = new GoogleDriveSyncService();
