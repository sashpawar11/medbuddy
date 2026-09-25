import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { initDatabase, getDatabase, listMembers, createMember, listFolders, createFolder, insertDocument, listDocuments, listProviders, saveProvider, storeAnalysisResult, getAnalysisByCacheKey, getAnalysisById, deleteAnalysisById, listAppLogs } from '../src/main/db/database';
import { StructuredAnalysisResultSchema, sanitizeJsonResponse } from '../src/shared/schema';
import { AIOrchestrator } from '../src/main/services/ai/orchestrator';
import { logger } from '../src/main/services/logger';

async function runTests() {
  console.log('🧪 Starting MedBuddy Phase 1 Automated Integration Tests...');

  // Setup temp directory for testing
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medbuddy-test-'));
  const testDbPath = path.join(tempDir, 'test-medbuddy.db');

  console.log(`📁 Test database at: ${testDbPath}`);

  // 1. Initialize SQLite Database
  const db = initDatabase(testDbPath);
  assert(db !== null, 'Database instance should be initialized');

  // Verify Pragmas
  const wal = db.pragma('journal_mode', { simple: true });
  assert.strictEqual(wal, 'wal', 'Journal mode should be WAL');

  const fk = db.pragma('foreign_keys', { simple: true });
  assert.strictEqual(fk, 1, 'Foreign keys should be ON');

  console.log('✅ SQLite initialized with WAL mode and Foreign Keys');

  // 2. Verify default seeded providers
  const providers = listProviders();
  assert(providers.length >= 2, 'Should seed default LM Studio and Ollama profiles');
  const lmStudio = providers.find((p) => p.provider_type === 'lm-studio');
  assert(lmStudio !== undefined, 'LM Studio profile should exist');
  assert.strictEqual(lmStudio?.base_url, 'http://localhost:1234/v1');
  console.log('✅ Default local AI profiles verified (LM Studio & Ollama)');

  // 3. Member CRUD
  const member = createMember({
    name: 'Eleanor Vance',
    relationship: 'Self',
    dob: '1984-06-12',
    avatar_color: '#57c1ff',
  });
  assert(member.id.startsWith('mem_'), 'Member ID should have mem_ prefix');
  assert.strictEqual(member.name, 'Eleanor Vance');

  const members = listMembers();
  assert.strictEqual(members.length, 1);
  console.log('✅ Member creation and query verified');

  // 4. Folder Management
  const folders = listFolders(member.id);
  assert(folders.length >= 1, 'Default Medical Documents folder should be created with member');
  const bloodworkFolder = createFolder(member.id, 'Bloodwork 2024', null);
  assert.strictEqual(bloodworkFolder.name, 'Bloodwork 2024');
  console.log('✅ Folder management verified');

  // 5. Document Ingestion
  const doc1 = insertDocument({
    folder_id: bloodworkFolder.id,
    filename: 'lipid_panel_march.pdf',
    file_type: 'application/pdf',
    file_size: 142500,
    storage_path: 'doc1_lipid.pdf',
    content_hash: 'abc123hash1',
    extracted_text: 'Patient: Eleanor Vance. Test: LDL Cholesterol: 138 mg/dL. Reference: 0-99. Fasting Blood Glucose: 92 mg/dL. Date: 2024-03-15.',
  });

  const doc2 = insertDocument({
    folder_id: bloodworkFolder.id,
    filename: 'lipid_panel_june.pdf',
    file_type: 'application/pdf',
    file_size: 138200,
    storage_path: 'doc2_lipid.pdf',
    content_hash: 'def456hash2',
    extracted_text: 'Patient: Eleanor Vance. Test: LDL Cholesterol: 145 mg/dL. Reference: 0-99. Fasting Blood Glucose: 94 mg/dL. Date: 2024-06-18.',
  });

  const folderDocs = listDocuments(bloodworkFolder.id);
  assert.strictEqual(folderDocs.length, 2, 'Should have 2 documents in bloodwork folder');
  console.log('✅ Document insertion and query verified');

  // 6. Zod Schema Validation against PRD §9 Sample
  const sampleOverview = {
    schemaVersion: '1.0',
    summary: 'Bloodwork shows slightly elevated LDL cholesterol trending upward from March to June 2024. Blood glucose remains optimal.',
    documentDateRange: {
      earliest: '2024-03-15',
      latest: '2024-06-18',
    },
    metrics: [
      {
        name: 'LDL Cholesterol',
        value: 145,
        unit: 'mg/dL',
        referenceRange: '0-99',
        status: 'flagged' as const,
        history: [
          { date: '2024-03-15', value: 138 },
          { date: '2024-06-18', value: 145 },
        ],
        sourceDocumentIds: [doc1.id, doc2.id],
      },
      {
        name: 'Fasting Blood Glucose',
        value: 94,
        unit: 'mg/dL',
        referenceRange: '70-99',
        status: 'normal' as const,
        history: [
          { date: '2024-03-15', value: 92 },
          { date: '2024-06-18', value: 94 },
        ],
        sourceDocumentIds: [doc1.id, doc2.id],
      },
    ],
    flags: [
      {
        title: 'LDL Cholesterol Elevated and Trending Upward',
        severity: 'moderate' as const,
        explanation: 'LDL rose from 138 mg/dL to 145 mg/dL across two consecutive tests, above the 99 mg/dL reference limit.',
        relatedMetric: 'LDL Cholesterol',
      },
    ],
    recommendations: [
      'Discuss dietary modifications or lipid-lowering therapy options with physician.',
    ],
    extractedEntities: {
      reportTypes: ['Comprehensive Lipid Panel'],
      providers: ['Quest Diagnostics'],
    },
    sourceDocuments: [
      { id: doc1.id, filename: doc1.filename },
      { id: doc2.id, filename: doc2.filename },
    ],
    confidence: 'high' as const,
  };

  const validation = StructuredAnalysisResultSchema.safeParse(sampleOverview);
  assert(validation.success, 'Sample PRD §9 v1.0 payload must pass backward-compatible schema validation');
  console.log('✅ PRD §9 backward compatibility schema validation verified');

  // 6b. Schema v1.1 Clinical Depth Validation (Anomalies, Highlights, Discussion Points)
  const sampleV11 = {
    ...sampleOverview,
    schemaVersion: '1.1',
    keyHighlights: ['LDL trending upward across consecutive panels'],
    highlightedMarkers: [
      {
        marker: 'LDL Cholesterol',
        value: '145 mg/dL',
        status: 'flagged' as const,
        note: 'Above 99 mg/dL reference limit; upward progression',
      },
    ],
    anomalies: [
      {
        title: 'Discrepancy in reporting reference range across labs',
        category: 'discrepancy' as const,
        observation: 'Lab A noted 0-99 mg/dL whereas Lab B noted 0-129 mg/dL.',
        pinpointNotes: ['March 2024 LabCorp: ref 0-99', 'June 2024 Quest: ref 0-129'],
        severity: 'moderate' as const,
      },
    ],
    discussionPoints: [
      {
        topic: 'Lipid Management',
        question: 'Should we initiate moderate-intensity statin therapy given upward LDL trend?',
        urgency: 'priority' as const,
        relatedMarkers: ['LDL Cholesterol'],
        rationale: 'Two consecutive test dates confirm sustained elevation.',
      },
    ],
  };

  const valV11 = StructuredAnalysisResultSchema.safeParse(sampleV11);
  assert(valV11.success, 'Sample v1.1 payload must pass schema validation');
  assert.strictEqual(valV11.data.anomalies.length, 1);
  assert.strictEqual(valV11.data.discussionPoints.length, 1);
  assert.strictEqual(valV11.data.highlightedMarkers.length, 1);
  console.log('✅ v1.1 Clinical Depth (Anomalies, Discussion Points, Highlights) verified');

  // 7. Sanitizer, Markdown Stripping & Truncated JSON Auto-Repair Test
  const markdownFencedJson = '```json\n{"schemaVersion": "1.0", "summary": "test", "metrics": [], "flags": [], "recommendations": [], "extractedEntities": {}, "sourceDocuments": [], "confidence": "high"}\n```';
  const cleaned = sanitizeJsonResponse(markdownFencedJson);
  assert.strictEqual(cleaned.startsWith('```'), false, 'Code fences must be stripped');
  const parsedCleaned = JSON.parse(cleaned);
  assert.strictEqual(parsedCleaned.summary, 'test');

  // Verify Truncated JSON Healing & Inner Quote Escaping
  const truncatedPayload = '{"schemaVersion": "1.0", "summary": "Healed summary", "metrics": [{"name": "LDL", "value": 140, "unit": "mg/dL", "status": "flagged"}, {"name": "HDL", "value": 45, "unit": "mg/dL", "status": ';
  const healed = sanitizeJsonResponse(truncatedPayload);
  const parsedHealed = JSON.parse(healed);
  assert.strictEqual(parsedHealed.summary, 'Healed summary');
  assert.strictEqual(parsedHealed.metrics.length >= 1, true);

  // Verify Unescaped Inner Quote Healing
  const badQuotesPayload = `{\n  "schemaVersion": "1.0",\n  "summary": "Patient went to "Sunrise Oncology" for consultation.",\n  "metrics": [],\n  "flags": [],\n  "recommendations": [\n    "Repeat "Lipid Panel" in 3 months."\n  ]\n}`;
  const quotesHealed = sanitizeJsonResponse(badQuotesPayload);
  const parsedQuotes = JSON.parse(quotesHealed);
  assert(parsedQuotes.summary.includes('Sunrise Oncology'));
  assert(parsedQuotes.recommendations[0].includes('Lipid Panel'));
  console.log('✅ JSON code-fence sanitizer, truncated JSON repair & inner quote healing verified');

  // 8. Cache Key and Cache Engine Test
  const orchestrator = new AIOrchestrator();
  const cacheKey = orchestrator.computeCacheKey(
    [doc1, doc2],
    '1.0.0',
    lmStudio!.id,
    lmStudio!.model
  );
  assert.strictEqual(typeof cacheKey, 'string');
  assert.strictEqual(cacheKey.length, 64, 'SHA-256 cache key must be 64 hex chars');

  // Store in cache
  const stored = storeAnalysisResult(
    cacheKey,
    'folder',
    bloodworkFolder.id,
    lmStudio!.id,
    '1.0.0',
    sampleOverview,
    [doc1.id, doc2.id]
  );
  assert(stored.id.startsWith('anl_'), 'Analysis ID should start with anl_');
  assert.strictEqual(stored.source_documents.length, 2);

  // Retrieve by cache key
  const retrieved = getAnalysisByCacheKey(cacheKey);
  assert(retrieved !== null, 'Cache hit should retrieve stored analysis');
  assert.strictEqual(retrieved?.id, stored.id);
  assert.strictEqual(retrieved?.result_json.summary, sampleOverview.summary);
  assert.strictEqual(retrieved?.member_name, 'Eleanor Vance', 'Member name should be resolved from folder/documents');
  assert.strictEqual(retrieved?.member_id, member.id, 'Member id should be resolved');
  console.log('✅ Deterministic caching, retrieval, and parent member tagging verified');

  // Test delete analysis
  const deleted = deleteAnalysisById(stored.id);
  assert.strictEqual(deleted, true, 'deleteAnalysisById should return true for deleted record');
  const postDelete = getAnalysisById(stored.id);
  assert.strictEqual(postDelete, null, 'Analysis record should no longer exist after delete');
  console.log('✅ Deletion of generated analysis verified');

  // 9. Schema Failure & Corrective Retry Simulation
  const badOverview = {
    schemaVersion: '1.0',
    // Missing required summary field!
    metrics: [{ name: 'Test', value: 10, status: 'invalid_status' }],
  };
  const badValidation = StructuredAnalysisResultSchema.safeParse(badOverview);
  assert.strictEqual(badValidation.success, false, 'Bad payload must be caught by Zod validator');
  assert(badValidation.error.errors.length > 0, 'Should have descriptive Zod error paths');
  console.log('✅ Schema failure detection verified (triggers 1-step corrective retry)');

  // 10. Logger Sanitization Verification
  const sensitivePayload = {
    apiKey: 'sk-secret-1234567890abcdef',
    extractedText: 'Very sensitive clinical diagnostic note with patient details',
    status: 'ok',
  };
  // Test logger sanitizer directly
  const sanitized = (logger as any).sanitize(sensitivePayload);
  assert.strictEqual(sanitized.apiKey, '[REDACTED]', 'API keys must be redacted in logs');
  assert(sanitized.extractedText.includes('[TEXT_LEN:'), 'Extracted medical text must be replaced with length indicator');
  console.log('✅ Patient data & secret redaction in logger verified');

  // Clean up temp DB
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('🎉 ALL INTEGRATION & SECURITY TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
