// Data domain models matching PRD §7.4 & §9

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string; // 'Self' | 'Spouse' | 'Parent' | 'Child' | 'Other'
  dob?: string;
  avatar_color: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  member_id: string;
  parent_folder_id: string | null;
  name: string;
  created_at: string;
  document_count?: number;
}

export type OcrStatus = 'pending' | 'processing' | 'done' | 'failed' | 'skipped';
export type OcrStage = 'paddle' | 'llm_vision';

export interface DocumentItem {
  id: string;
  folder_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  content_hash: string;
  extracted_text?: string | null;
  tags?: string[];
  ocr_status: OcrStatus;
  ocr_stage?: OcrStage | null;
  ocr_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderProfile {
  id: string;
  name: string;
  kind: 'local' | 'cloud';
  provider_type: 'lm-studio' | 'ollama' | 'openai-compatible' | 'openai';
  base_url: string;
  model: string;
  api_key?: string;
  timeout_seconds?: number;
  is_default: number; // 0 or 1
  created_at: string;
}

export interface StructuredMetric {
  name: string;
  value: number | string;
  unit: string;
  referenceRange?: string;
  status: 'normal' | 'borderline' | 'flagged';
  history?: Array<{
    date: string;
    value: number | string;
  }>;
  sourceDocumentIds?: string[];
}

export interface StructuredFlag {
  title: string;
  severity: 'low' | 'moderate' | 'high';
  explanation: string;
  relatedMetric?: string;
}

export interface StructuredHighlightMarker {
  marker: string;
  status: 'normal' | 'borderline' | 'flagged';
  note: string;
  value?: number | string;
}

export interface StructuredAnomaly {
  title: string;
  category: 'discrepancy' | 'sharp_trend' | 'missing_followup' | 'critical_outlier' | 'scan_alert' | 'general';
  observation: string;
  pinpointNotes: string[];
  severity: 'low' | 'moderate' | 'high';
  relatedDocuments?: string[];
}

export interface StructuredDiscussionPoint {
  topic: string;
  question: string;
  urgency: 'routine' | 'priority' | 'follow_up';
  relatedMarkers?: string[];
  rationale?: string;
}

export interface StructuredAnalysisResult {
  schemaVersion: string;
  summary: string;
  keyHighlights?: string[];
  highlightedMarkers?: StructuredHighlightMarker[];
  documentDateRange?: {
    earliest?: string;
    latest?: string;
  };
  metrics: StructuredMetric[];
  flags: StructuredFlag[];
  anomalies?: StructuredAnomaly[];
  recommendations: string[];
  discussionPoints?: StructuredDiscussionPoint[];
  extractedEntities: {
    reportTypes?: string[];
    providers?: string[];
  };
  sourceDocuments: Array<{
    id: string;
    filename: string;
  }>;
  confidence: 'high' | 'medium' | 'low';
}

export interface AnalysisRecord {
  id: string;
  cache_key: string;
  scope_type: 'file' | 'selection' | 'folder';
  scope_id: string;
  scope_name?: string;
  member_id?: string | null;
  member_name?: string | null;
  member_color?: string | null;
  provider_profile_id: string;
  provider_name?: string;
  model_name?: string;
  prompt_version: string;
  result_json: StructuredAnalysisResult;
  source_documents: DocumentItem[];
  created_at: string;
}

export interface AppLogEntry {
  id: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: 'ai' | 'extract' | 'db' | 'vault' | 'ipc' | 'app';
  message: string;
  details?: string | null;
  timestamp: string;
}

export type AIProgressStage = 'extracting' | 'preparing_prompt' | 'inferring' | 'validating' | 'retrying' | 'complete' | 'error';

export interface AIProgressEvent {
  stage: AIProgressStage;
  message: string;
  progressPercent?: number;
  currentDocument?: string;
  detail?: string;
}

/** Per-document OCR progress broadcast from the main process via IPC. */
export interface OcrProgressEvent {
  documentId: string;
  filename: string;
  status: OcrStatus;
  stage?: OcrStage;
  progressPercent?: number; // 0–100 within this document (page-level progress)
  detail?: string;          // e.g. "Page 3 of 8" or "LLM Vision: transcribing…"
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  availableModels?: string[];
}

// Google Drive Sync Domain Models
export type SyncScope = 'all' | 'profile' | 'folders';
export type SyncMountType = 'cloud' | 'local_mount';

export interface GoogleSyncSettings {
  provider: 'google_drive';
  isSignedIn: boolean;
  userEmail: string | null;
  userName: string | null;
  userAvatar: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  mountType: SyncMountType;
  driveFolderId: string | null;
  driveFolderName: string;
  localMountPath: string | null;
  syncScope: SyncScope;
  selectedMemberId: string | null;
  selectedFolderIds: string[];
  autoSync: boolean;
  lastSyncTime: string | null;
  lastSyncStatus: 'idle' | 'in_progress' | 'success' | 'error';
  lastSyncError: string | null;
}

export type SyncStage =
  | 'idle'
  | 'initializing'
  | 'authenticating'
  | 'connecting'
  | 'mounting'
  | 'scanning'
  | 'uploading'
  | 'completed'
  | 'error';

export interface SyncProgressEvent {
  stage: SyncStage;
  message: string;
  progressPercent: number;
  totalFiles: number;
  syncedFiles: number;
  currentFile?: string;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  syncedAt: string;
}

export interface SyncMountTestResult {
  success: boolean;
  message: string;
  folderId?: string;
  mountPath?: string;
}

export interface ProposedOrganization {
  documentId: string;
  originalFilename: string;
  prefix: string;
  reportName: string;
  detectedDate: string;
  proposedFilename: string;
  tags: string[];
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string;
}

export interface OrganizeApplyPayload {
  documentId: string;
  filename: string;
  tags: string[];
}

// Window API exposed to renderer
export interface MedBuddyAPI {
  // Members
  listMembers: () => Promise<FamilyMember[]>;
  createMember: (member: Omit<FamilyMember, 'id' | 'created_at' | 'updated_at'>) => Promise<FamilyMember>;
  updateMember: (id: string, updates: Partial<FamilyMember>) => Promise<FamilyMember>;
  deleteMember: (id: string) => Promise<void>;

  // Folders
  listFolders: (memberId: string) => Promise<Folder[]>;
  createFolder: (memberId: string, name: string, parentFolderId?: string | null) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;

  // Documents
  listDocuments: (folderId: string) => Promise<DocumentItem[]>;
  importDocuments: (folderId: string, filePaths: string[]) => Promise<DocumentItem[]>;
  readDocumentData: (documentId: string) => Promise<{ mimeType: string; dataUrl: string; filename: string; text?: string | null }>;
  deleteDocument: (documentId: string) => Promise<void>;
  openFileDialog: () => Promise<string[]>;
  reRunOcr: (documentId: string) => Promise<void>;
  onOcrProgress: (callback: (event: OcrProgressEvent) => void) => () => void;
  organizeDocumentsPreview: (documentIds: string[], providerProfileId?: string) => Promise<ProposedOrganization[]>;
  applyDocumentOrganization: (updates: OrganizeApplyPayload[]) => Promise<boolean>;

  // Providers
  listProviders: () => Promise<ProviderProfile[]>;
  saveProvider: (profile: Omit<ProviderProfile, 'id' | 'created_at'> & { id?: string }) => Promise<ProviderProfile>;
  testConnection: (profile: Partial<ProviderProfile>) => Promise<ConnectionTestResult>;
  deleteProvider: (id: string) => Promise<void>;

  // Analysis
  runAnalysis: (params: {
    scopeType: 'file' | 'selection' | 'folder';
    scopeId: string;
    documentIds: string[];
    providerProfileId: string;
    forceRefresh?: boolean;
  }) => Promise<AnalysisRecord>;
  getAnalysis: (id: string) => Promise<AnalysisRecord | null>;
  listAnalyses: (limit?: number) => Promise<AnalysisRecord[]>;
  deleteAnalysis: (id: string) => Promise<void>;
  onAIProgress: (callback: (event: AIProgressEvent) => void) => () => void;

  // Google Drive Sync
  getSyncSettings: () => Promise<GoogleSyncSettings>;
  saveSyncSettings: (settings: Partial<GoogleSyncSettings>) => Promise<GoogleSyncSettings>;
  startGoogleOAuth: (params?: { clientId?: string; clientSecret?: string; useDemo?: boolean }) => Promise<{ success: boolean; user?: { name: string; email: string; avatar?: string }; error?: string }>;
  disconnectGoogleDrive: () => Promise<void>;
  testDriveMount: (config: { mountType: SyncMountType; driveFolderName?: string; localMountPath?: string }) => Promise<SyncMountTestResult>;
  selectLocalMountFolder: () => Promise<string | null>;
  startSync: (options?: { scope?: SyncScope; memberId?: string; folderIds?: string[] }) => Promise<SyncResult>;
  onSyncProgress: (callback: (event: SyncProgressEvent) => void) => () => void;

  // Logs
  getLogs: (limit?: number, category?: string) => Promise<AppLogEntry[]>;
  clearLogs: () => Promise<void>;
  onLogEmitted: (callback: (entry: AppLogEntry) => void) => () => void;
}

declare global {
  interface Window {
    medbuddy: MedBuddyAPI;
  }
}
