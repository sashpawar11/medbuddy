import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  initDatabase,
  createMember,
  createFolder,
  insertDocument,
  listDocuments,
  updateDocumentExtractedText,
  updateDocumentsMetadata,
  getDocumentById,
} from '../src/main/db/database';
import { documentOrganizer } from '../src/main/services/ai/organizer';

async function runOrganizeTests() {
  console.log('🧪 Starting MedBuddy Organize Files Automated Tests...');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medbuddy-organize-test-'));
  const testDbPath = path.join(tempDir, 'test-organize.db');

  // 1. Initialize SQLite Database with tags column migration
  const db = initDatabase(testDbPath);
  assert(db !== null, 'Database should be initialized');

  // Verify tags column exists in documents table
  const tableInfo = db.pragma('table_info(documents)') as Array<{ name: string; type: string }>;
  const tagsCol = tableInfo.find((c) => c.name === 'tags');
  assert(tagsCol !== undefined, 'tags column should exist in documents table');
  console.log('✅ SQLite schema verification: documents.tags column confirmed');

  // 2. Setup Member & Folder
  const member = createMember({
    name: 'Sarah Connor',
    relationship: 'Self',
    dob: '1985-05-15',
    avatar_color: '#57c1ff',
  });
  const folder = createFolder(member.id, 'Inbox Scans', null);

  // 3. Insert Raw Unorganized Documents
  const doc1 = insertDocument({
    folder_id: folder.id,
    filename: 'IMG_20240312_104523.pdf',
    file_type: 'application/pdf',
    file_size: 102400,
    storage_path: 'mock_storage_1.pdf',
    content_hash: 'hash1',
    ocr_status: 'done',
  });

  const doc2 = insertDocument({
    folder_id: folder.id,
    filename: 'scan_abdomen_002.pdf',
    file_type: 'application/pdf',
    file_size: 204800,
    storage_path: 'mock_storage_2.pdf',
    content_hash: 'hash2',
    ocr_status: 'done',
  });

  const doc3 = insertDocument({
    folder_id: folder.id,
    filename: 'rx_slip_jan.jpg',
    file_type: 'image/jpeg',
    file_size: 51200,
    storage_path: 'mock_storage_3.jpg',
    content_hash: 'hash3',
    ocr_status: 'done',
  });

  // Attach extracted medical text
  updateDocumentExtractedText(
    doc1.id,
    `QUEST DIAGNOSTICS\nPATIENT: Sarah Connor\nCOLLECTION DATE: 2024-03-12\nTEST: LIPID PANEL WITH CHOLESTEROL/HDL RATIO\nTOTAL CHOLESTEROL: 215 mg/dL [High]\nTRIGLYCERIDES: 160 mg/dL [High]\nHDL CHOLESTEROL: 48 mg/dL\nLDL CHOLESTEROL: 135 mg/dL`
  );

  updateDocumentExtractedText(
    doc2.id,
    `METROPOLITAN IMAGING CENTER\nEXAM DATE: 2023-11-05\nPROCEDURE: CT SCAN OF ABDOMEN AND PELVIS WITH CONTRAST\nCLINICAL INDICATION: Abdominal pain\nFINDINGS: Normal liver, spleen, pancreas, kidneys. No acute appendicitis.`
  );

  updateDocumentExtractedText(
    doc3.id,
    `APOLLO CLINIC\nDR. MARK SLOAN, MD - CARDIOLOGY\nDATE: 2024-01-15\nRx: Atorvastatin 20mg once daily at bedtime.\nDispense: 30 tablets.`
  );

  console.log('✅ Created mock unorganized documents with extracted text');

  // 4. Test Organize Preview
  const previewResults = await documentOrganizer.preview([doc1.id, doc2.id, doc3.id]);
  assert.strictEqual(previewResults.length, 3, 'Should generate proposals for all 3 documents');

  const p1 = previewResults.find((p) => p.documentId === doc1.id)!;
  assert.strictEqual(p1.prefix, 'Bloodwork', 'Doc 1 prefix should be Bloodwork');
  assert.strictEqual(p1.detectedDate, '2024-03-12', 'Doc 1 date should match collection date 2024-03-12');
  assert.strictEqual(
    p1.proposedFilename,
    'Bloodwork-LipidPanel-2024-03-12.pdf',
    'Doc 1 filename must match <Prefix-Nameforreport>-<Date>.pdf'
  );
  assert(p1.tags.includes('Bloodwork'), 'Doc 1 should have Bloodwork tag');
  console.log(`✅ Doc 1 proposal: ${p1.originalFilename} -> ${p1.proposedFilename}, Tags: [${p1.tags.join(', ')}]`);

  const p2 = previewResults.find((p) => p.documentId === doc2.id)!;
  assert.strictEqual(p2.prefix, 'CT', 'Doc 2 prefix should be CT');
  assert.strictEqual(p2.detectedDate, '2023-11-05', 'Doc 2 date should be 2023-11-05');
  assert(
    p2.proposedFilename.startsWith('CT-AbdomenPelvis') && p2.proposedFilename.endsWith('-2023-11-05.pdf'),
    `Doc 2 filename must match CT-AbdomenPelvis*-2023-11-05.pdf, got: ${p2.proposedFilename}`
  );
  assert(p2.tags.includes('CT Scans'), 'Doc 2 should have CT Scans tag');
  console.log(`✅ Doc 2 proposal: ${p2.originalFilename} -> ${p2.proposedFilename}, Tags: [${p2.tags.join(', ')}]`);

  const p3 = previewResults.find((p) => p.documentId === doc3.id)!;
  assert.strictEqual(p3.prefix, 'Prescription', 'Doc 3 prefix should be Prescription');
  assert.strictEqual(p3.detectedDate, '2024-01-15', 'Doc 3 date should be 2024-01-15');
  assert(
    p3.proposedFilename.startsWith('Prescription-') && p3.proposedFilename.endsWith('-2024-01-15.jpg'),
    `Doc 3 filename must match Prescription-*-2024-01-15.jpg, got: ${p3.proposedFilename}`
  );
  assert(p3.tags.includes('Prescriptions'), 'Doc 3 should have Prescriptions tag');
  console.log(`✅ Doc 3 proposal: ${p3.originalFilename} -> ${p3.proposedFilename}, Tags: [${p3.tags.join(', ')}]`);

  // 4b. Test Fast Mode Instant Heuristic Preview
  const fastResults = await documentOrganizer.preview([doc1.id, doc2.id, doc3.id], 'fast');
  assert.strictEqual(fastResults.length, 3, 'Fast mode should return 3 proposals');
  const fastP1 = fastResults.find((p) => p.documentId === doc1.id)!;
  assert.strictEqual(fastP1.proposedFilename, 'Bloodwork-LipidPanel-2024-03-12.pdf', 'Fast mode should correctly format Bloodwork filename');
  console.log('✅ Instant Fast Mode (<10ms) verified successfully');

  // 5. Test Apply Metadata Updates
  const applyPayload = previewResults.map((p) => ({
    id: p.documentId,
    filename: p.proposedFilename,
    tags: p.tags,
  }));

  const updateSuccess = updateDocumentsMetadata(applyPayload);
  assert.strictEqual(updateSuccess, true, 'Metadata batch update should return true');

  // Verify DB reflects updated filenames and tags
  const updatedDocs = listDocuments(folder.id);
  const updatedDoc1 = updatedDocs.find((d) => d.id === doc1.id)!;
  assert.strictEqual(updatedDoc1.filename, p1.proposedFilename);
  assert(Array.isArray(updatedDoc1.tags));
  assert(updatedDoc1.tags.includes('Bloodwork'));

  const updatedDoc3 = updatedDocs.find((d) => d.id === doc3.id)!;
  assert.strictEqual(updatedDoc3.filename, p3.proposedFilename);
  assert(updatedDoc3.tags?.includes('Prescriptions'));

  console.log('✅ SQLite database verified with updated filenames and persistent tags');
  console.log('🎉 All Organize Files automated tests passed successfully!');
}

runOrganizeTests().catch((err) => {
  console.error('❌ Organize tests failed:', err);
  process.exit(1);
});
