/**
 * Google Drive OAuth has been migrated to local & cloud-synced folder backup.
 * This file re-exports localVaultSync for backward compatibility.
 */
export { localVaultSync, localVaultSync as googleDriveSync, LocalVaultSyncService, LocalVaultSyncService as GoogleDriveSyncService } from './localVaultSync';
