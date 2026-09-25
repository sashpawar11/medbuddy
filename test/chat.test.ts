import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  initDatabase,
  closeDatabase,
  getDatabase,
  createMember,
  createFolder,
  insertDocument,
  updateDocumentExtractedText,
  deleteDocument,
  deleteMember,
  createChatSession,
  listChatSessions,
  getChatSessionById,
  updateChatSessionTitle,
  deleteChatSession,
  createChatMessage,
  getChatMessages,
  searchChunksFts,
  getRecentChunksForMember,
  getChunksCountForDocument,
} from '../src/main/db/database';
import { documentChunker } from '../src/main/services/ai/chunker';

async function runChatTests() {
  console.log('🧪 Starting MedBuddy Profile-Scoped Document Chat & RAG Automated Tests...');

  // Setup isolated temporary SQLite test database
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medbuddy-chat-test-'));
  const testDbPath = path.join(tempDir, 'test-chat.db');
  console.log(`📁 Test database at: ${testDbPath}`);

  closeDatabase();
  const db = initDatabase(testDbPath);
  assert(db !== null, 'Database instance should be initialized');

  // 1. Verify Schema Additions
  const chunkTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='document_chunks'").get();
  assert(chunkTable !== undefined, 'document_chunks table must exist');

  const ftsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='document_chunks_fts'").get();
  assert(ftsTable !== undefined, 'document_chunks_fts virtual table must exist');

  const chatSessionsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions'").get();
  assert(chatSessionsTable !== undefined, 'chat_sessions table must exist');

  const chatMessagesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_messages'").get();
  assert(chatMessagesTable !== undefined, 'chat_messages table must exist');

  console.log('✅ SQLite schema: document_chunks, FTS5 virtual table, and chat tables confirmed');

  // 2. Create Two Distinct Family Member Profiles
  const dad = createMember({
    name: 'Robert Vance',
    relationship: 'Parent',
    dob: '1958-11-20',
    avatar_color: '#57c1ff',
  });
  assert(dad.id.startsWith('mem_'));

  const mom = createMember({
    name: 'Eleanor Vance',
    relationship: 'Spouse',
    dob: '1962-04-15',
    avatar_color: '#ec4899',
  });
  assert(mom.id.startsWith('mem_'));

  const dadFolders = db.prepare('SELECT id FROM folders WHERE member_id = ?').all(dad.id) as any[];
  const momFolders = db.prepare('SELECT id FROM folders WHERE member_id = ?').all(mom.id) as any[];
  const dadFolderId = dadFolders[0].id;
  const momFolderId = momFolders[0].id;

  console.log('✅ Two distinct test profiles created: Dad (Robert) and Mom (Eleanor)');

  // 3. Insert Documents with Realistic Clinical Texts
  const dadDoc = insertDocument({
    folder_id: dadFolderId,
    filename: 'Dad_PSA_Cardiology_2024.pdf',
    file_type: 'application/pdf',
    file_size: 4096,
    storage_path: 'dad_psa.pdf',
    content_hash: 'hash_dad_001',
    extracted_text: `--- Page 1 ---
CLINICAL REPORT: ANNUAL CARDIOLOGY & UROLOGY
Patient: Robert Vance | Date of Collection: 2024-11-20
Physician: Dr. Marcus Brody, MD

Cardiology Assessment:
Ejection fraction is preserved at 60%. Mild sinus bradycardia noted.
Blood Pressure: 128/82 mmHg. Pulse: 58 bpm.

--- Page 2 ---
Urology Panel:
Total PSA (Prostate-Specific Antigen): 3.8 ng/mL (Reference: 0.0 - 4.0 ng/mL)
Free PSA: 0.85 ng/mL (Ratio: 22.4%)
Note: PSA has increased from 2.4 ng/mL in 2023. Continued surveillance recommended in 6 months.
Prescription: Tamsulosin 0.4mg daily with dinner.`,
    ocr_status: 'done',
  });

  const momDoc = insertDocument({
    folder_id: momFolderId,
    filename: 'Mom_Lipid_Endocrinology_2024.pdf',
    file_type: 'application/pdf',
    file_size: 3800,
    storage_path: 'mom_lipid.pdf',
    content_hash: 'hash_mom_001',
    extracted_text: `--- Page 1 ---
COMPREHENSIVE METABOLIC & LIPID PANEL
Patient: Eleanor Vance | Date: 2024-09-12
Attending: Dr. Sarah Lin, MD

Fasting Lipid Profile:
Total Cholesterol: 235 mg/dL (Reference: < 200 mg/dL) [FLAGGED HIGH]
HDL Cholesterol: 54 mg/dL (Reference: > 50 mg/dL) [NORMAL]
LDL Cholesterol: 152 mg/dL (Reference: < 100 mg/dL) [FLAGGED HIGH]
Triglycerides: 145 mg/dL (Reference: < 150 mg/dL) [NORMAL]

Endocrine Review:
HbA1c: 5.4% (Normal, non-diabetic).
Impression: Familial hyperlipidemia. Recommended Atorvastatin 10mg daily and low saturated fat diet.`,
    ocr_status: 'done',
  });

  console.log('✅ Created clinical documents for both profiles');

  // 4. Test Document Chunking & Page Preserving
  const dadChunksCount = await documentChunker.chunkDocument(dadDoc.id);
  assert(dadChunksCount >= 2, `Dad's document should produce at least 2 chunks (got ${dadChunksCount})`);

  const momChunksCount = await documentChunker.chunkDocument(momDoc.id);
  assert(momChunksCount >= 1, `Mom's document should produce chunks (got ${momChunksCount})`);

  assert.strictEqual(getChunksCountForDocument(dadDoc.id), dadChunksCount);
  assert.strictEqual(getChunksCountForDocument(momDoc.id), momChunksCount);

  console.log(`✅ Chunking verified: Dad (${dadChunksCount} chunks), Mom (${momChunksCount} chunks)`);

  // 5. TEST STRICT PROFILE ISOLATION (ZERO CROSS-PROFILE LEAKAGE)
  console.log('🔒 Verifying Strict Profile Isolation & Zero Data Leakage Rule...');

  // 5a. Query Dad's profile for "PSA"
  const dadPsaResults = searchChunksFts(dad.id, 'PSA level prostate');
  assert(dadPsaResults.length > 0, "Dad's search for PSA should return results");
  assert(dadPsaResults[0].snippet.includes('Prostate-Specific Antigen'), 'Should retrieve PSA chunk');
  assert.strictEqual(dadPsaResults[0].documentId, dadDoc.id, 'Result must belong to Dad doc');

  // 5b. Query Mom's profile for "PSA" (Dad's condition)
  const momPsaResults = searchChunksFts(mom.id, 'PSA level prostate');
  // Mom has no PSA results in FTS match; fallback must only return Mom's documents, NEVER Dad's!
  for (const item of momPsaResults) {
    assert.strictEqual(item.documentId, momDoc.id, "Mom query MUST NEVER return Dad's documents!");
    assert(!item.snippet.includes('Prostate-Specific Antigen'), "Mom results must NEVER contain Dad's PSA records!");
  }

  // 5c. Query Mom's profile for "Cholesterol"
  const momCholesterolResults = searchChunksFts(mom.id, 'LDL Cholesterol Atorvastatin');
  assert(momCholesterolResults.length > 0, "Mom's search for Cholesterol should return results");
  assert(momCholesterolResults[0].snippet.includes('LDL Cholesterol: 152 mg/dL'), 'Should retrieve LDL chunk');
  assert.strictEqual(momCholesterolResults[0].documentId, momDoc.id, 'Result must belong to Mom doc');

  // 5d. Query Dad's profile for "Atorvastatin" (Mom's medication)
  const dadMedsResults = searchChunksFts(dad.id, 'Atorvastatin lipid hyperlipidemia');
  for (const item of dadMedsResults) {
    assert.strictEqual(item.documentId, dadDoc.id, "Dad query MUST NEVER return Mom's documents!");
    assert(!item.snippet.includes('Atorvastatin'), "Dad results must NEVER contain Mom's medication records!");
  }

  console.log('✅ ZERO CROSS-PROFILE LEAKAGE CONFIRMED: Dad and Mom records are 100% isolated at query layer');

  // 6. Test FTS Exact Matching & BM25 Ranking
  const dadTamsulosin = searchChunksFts(dad.id, 'Tamsulosin dinner');
  assert(dadTamsulosin.length > 0, 'Should find Tamsulosin prescription');
  assert(dadTamsulosin[0].snippet.includes('Tamsulosin 0.4mg'), 'Matches exact prescription string');
  assert(dadTamsulosin[0].pageNumber === 2, 'Cites Page 2 correctly');
  console.log('✅ FTS5 keyword matching and page attribution verified');

  // 6b. Test Specific Document Selection Scoping
  // Create a second document for Dad
  const dadBloodDoc = insertDocument({
    folder_id: dadFolderId,
    filename: 'Dad_CompleteBloodCount_2024.pdf',
    file_type: 'application/pdf',
    file_size: 2900,
    storage_path: 'dad_cbc.pdf',
    content_hash: 'hash_dad_002',
    extracted_text: `--- Page 1 ---
COMPLETE BLOOD COUNT (CBC)
Patient: Robert Vance | Date: 2024-10-01
Hemoglobin: 14.8 g/dL (Reference: 13.5 - 17.5 g/dL) [NORMAL]
WBC: 6.2 x10^3/uL (Reference: 4.5 - 11.0 x10^3/uL) [NORMAL]
Platelets: 220 x10^3/uL (Reference: 150 - 450 x10^3/uL) [NORMAL]`,
    ocr_status: 'done',
  });
  await documentChunker.chunkDocument(dadBloodDoc.id);

  // When scoped strictly to dadBloodDoc.id, querying Dad should ONLY return dadBloodDoc chunks
  const scopedBloodOnly = searchChunksFts(dad.id, 'Patient Vance', 10, [dadBloodDoc.id]);
  assert(scopedBloodOnly.length > 0, 'Should find chunks in scoped document');
  for (const item of scopedBloodOnly) {
    assert.strictEqual(item.documentId, dadBloodDoc.id, 'Must ONLY return chunks from the selected document ID');
  }

  // When scoped strictly to dadDoc.id, querying for Hemoglobin should NOT return dadBloodDoc
  const scopedPsaOnly = searchChunksFts(dad.id, 'Hemoglobin WBC', 10, [dadDoc.id]);
  for (const item of scopedPsaOnly) {
    assert.strictEqual(item.documentId, dadDoc.id, 'Must strictly restrict to dadDoc when dadDoc is selected');
  }
  console.log('✅ Specific document selection scoping verified');

  // 7. Test Chat Sessions Lifecycle
  const session1 = createChatSession({
    memberId: dad.id,
    title: "Dad's Cardiology and PSA Consultation",
    modelName: 'llama-3.3-70b',
  });
  assert(session1.id.startsWith('cs_'));
  assert.strictEqual(session1.memberId, dad.id);
  assert.strictEqual(session1.title, "Dad's Cardiology and PSA Consultation");

  const dadSessions = listChatSessions(dad.id);
  assert.strictEqual(dadSessions.length, 1);
  assert.strictEqual(dadSessions[0].id, session1.id);

  const momSessions = listChatSessions(mom.id);
  assert.strictEqual(momSessions.length, 0, "Mom's session list should not include Dad's sessions");

  updateChatSessionTitle(session1.id, "Dad's Annual Health Review");
  const updatedSession = getChatSessionById(session1.id);
  assert.strictEqual(updatedSession?.title, "Dad's Annual Health Review");

  console.log('✅ Chat session creation, scoped listing, and title updates verified');

  // 8. Test Chat Messages Lifecycle
  // User turn
  const userMsg = createChatMessage({
    sessionId: session1.id,
    role: 'user',
    content: 'What was my PSA level and what medication was started?',
    scopedMemberId: dad.id,
  });
  assert(userMsg.id.startsWith('cm_'));
  assert.strictEqual(userMsg.role, 'user');

  // Assistant turn with citations and reasoning
  const assistantMsg = createChatMessage({
    sessionId: session1.id,
    role: 'assistant',
    content: "Robert's PSA was 3.8 ng/mL on Nov 20, 2024. Dr. Brody prescribed Tamsulosin 0.4mg daily.",
    reasoningContent: 'Evaluated urology panel from Dad_PSA_Cardiology_2024.pdf page 2. Found PSA 3.8 ng/mL and Tamsulosin prescription.',
    scopedMemberId: dad.id,
    citedChunks: dadTamsulosin,
    latencyMs: 1420,
    tokenCount: 42,
  });
  assert(assistantMsg.id.startsWith('cm_'));
  assert.strictEqual(assistantMsg.role, 'assistant');
  assert.strictEqual(assistantMsg.citedChunks.length, dadTamsulosin.length);
  assert(assistantMsg.reasoningContent?.includes('urology panel'));

  const messages = getChatMessages(session1.id);
  assert.strictEqual(messages.length, 2, 'Session should have 2 messages');
  assert.strictEqual(messages[0].role, 'user');
  assert.strictEqual(messages[1].role, 'assistant');
  assert.strictEqual(messages[1].citedChunks[0].filename, 'Dad_PSA_Cardiology_2024.pdf');

  console.log('✅ Chat messages with cited chunks, reasoning, and latency verified');

  // 9. Test Deletion Cascades
  // 9a. Deleting a document cleans up chunks
  deleteDocument(momDoc.id);
  assert.strictEqual(getChunksCountForDocument(momDoc.id), 0, 'Document chunks must be deleted with document');
  const momFtsAfterDelete = searchChunksFts(mom.id, 'Cholesterol');
  assert.strictEqual(momFtsAfterDelete.length, 0, 'FTS index must be cleaned up after document deletion');
  console.log('✅ Document deletion cascade to chunks and FTS confirmed');

  // 9b. Deleting a chat session cascades to messages
  deleteChatSession(session1.id);
  const remainingMessages = getChatMessages(session1.id);
  assert.strictEqual(remainingMessages.length, 0, 'Session deletion must cascade to messages');
  console.log('✅ Chat session deletion cascade to messages confirmed');

  // 9c. Deleting a member cleans up member sessions and chunks
  deleteMember(dad.id);
  const dadChunksAfterDelete = db.prepare('SELECT COUNT(*) as cnt FROM document_chunks WHERE member_id = ?').get(dad.id) as any;
  assert.strictEqual(dadChunksAfterDelete.cnt, 0, 'Member deletion must delete all member chunks');
  console.log('✅ Member deletion cascade to chunks confirmed');

  closeDatabase();
  console.log('🎉 ALL PROFILE-SCOPED DOCUMENT CHAT & RAG INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runChatTests().catch((err) => {
  console.error('❌ Chat tests failed:', err);
  process.exit(1);
});
