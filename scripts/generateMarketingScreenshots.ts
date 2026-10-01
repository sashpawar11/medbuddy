import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  initDatabase,
  getDatabase,
  createMember,
  createFolder,
  insertDocument,
  createChatSession,
  createChatMessage,
  insertDocumentChunk,
  saveProvider,
  saveSyncSettings,
} from '../src/main/db/database';
import { registerIpcHandlers } from '../src/main/ipc';
import { vault } from '../src/main/services/vault';
import { logger } from '../src/main/services/logger';

// Disable GPU sandboxing and shm usage for headless / container environments
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.setName('medbuddy');

// Isolated user data directory so user's real database is NEVER touched
const tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medbuddy-marketing-'));
app.setPath('userData', tempUserDataDir);

// Target output directories
const targetDirs = [
  '/home/sash/Pictures/MedBuddy_Marketing_Screenshots',
  '/home/sash/Documents/MedBuddy_Marketing_Screenshots',
];

// Minimal valid single-page PDF with clinical header text
function createDummyPdfBuffer(): Buffer {
  const content = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 320 >> stream
BT
/F1 18 Tf
50 730 Td
(PACIFIC HEALTH DIAGNOSTICS - CLINICAL REPORT) Tj
/F1 11 Tf
0 -26 Td
(Patient Name: Sarah Vance       DOB: 1988-06-14       Encounter: 2026-03-15) Tj
0 -20 Td
(Ordering Physician: Dr. Robert Morrison, MD     Department: Preventive Cardiology) Tj
0 -24 Td
(------------------------------------------------------------------------------------------------------) Tj
0 -22 Td
(TEST NAME                           RESULT         UNIT           REFERENCE RANGE       STATUS) Tj
0 -18 Td
(Total Cholesterol                   178            mg/dL          < 200                 NORMAL) Tj
0 -16 Td
(LDL Cholesterol (Calculated)        92             mg/dL          < 100                 OPTIMAL) Tj
0 -16 Td
(HDL Cholesterol                     62             mg/dL          > 50                  PROTECTIVE) Tj
0 -16 Td
(Triglycerides                       120            mg/dL          < 150                 NORMAL) Tj
0 -16 Td
(Fasting Blood Glucose               92             mg/dL          70 - 99               NORMAL) Tj
0 -16 Td
(Hemoglobin A1c                      5.3            %              4.0 - 5.6             NORMAL) Tj
0 -16 Td
(Serum Creatinine                    0.82           mg/dL          0.60 - 1.10           NORMAL) Tj
0 -16 Td
(eGFR (CKD-EPI)                      98             mL/min/1.73m2  > 90                  NORMAL) Tj
0 -16 Td
(Vitamin D (25-Hydroxy)              31             ng/mL          30 - 100              BORDERLINE) Tj
0 -26 Td
(CLINICAL ASSESSMENT & NOTES:) Tj
0 -16 Td
(Patient demonstrates excellent response to Atorvastatin 20mg with LDL drop of 35%.) Tj
0 -16 Td
(Repeat fasting panel in 6 months. Maintain 1000-2000 IU daily Vitamin D3.) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000638 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
722
%%EOF`;
  return Buffer.from(content, 'utf-8');
}

async function setupMarketingData() {
  logger.init();
  initDatabase();
  vault.init();
  registerIpcHandlers();

  // Override AI test connection so active status indicator is green (14ms latency)
  ipcMain.removeHandler('ai:testConnection');
  ipcMain.handle('ai:testConnection', async () => ({
    success: true,
    latencyMs: 14,
    message: 'Connected to local LM Studio engine (llama-3.2-3b-instruct)',
  }));

  // Save AI Providers
  saveProvider({
    id: 'prof_lm_studio',
    name: 'LM Studio (Local)',
    kind: 'local',
    provider_type: 'lm-studio',
    base_url: 'http://localhost:1234/v1',
    model: 'llama-3.2-3b-instruct',
    is_default: 1,
    timeout_seconds: 600,
  });

  saveProvider({
    id: 'prof_ollama',
    name: 'Ollama (Local)',
    kind: 'local',
    provider_type: 'ollama',
    base_url: 'http://localhost:11434/v1',
    model: 'qwen2.5:7b-instruct',
    is_default: 0,
    timeout_seconds: 900,
  });

  // Save Sync Settings
  saveSyncSettings({
    provider: 'local_folder',
    backupPath: '/home/sash/Documents/MedBuddyVault',
    localMountPath: '/home/sash/Documents/MedBuddyVault',
    syncScope: 'all',
    autoSync: true,
    lastSyncTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    lastSyncStatus: 'success',
  });

  // 1. Create Enrolled Family Members
  const sarah = createMember({
    name: 'Sarah Vance',
    relationship: 'Self',
    dob: '1988-06-14',
    avatar_color: '#38bdf8', // Cyan
  });

  const arthur = createMember({
    name: 'Arthur Vance',
    relationship: 'Parent',
    dob: '1958-03-22',
    avatar_color: '#10b981', // Emerald
  });

  const maya = createMember({
    name: 'Maya Vance',
    relationship: 'Child',
    dob: '2018-09-12',
    avatar_color: '#f59e0b', // Amber
  });

  const david = createMember({
    name: 'David Vance',
    relationship: 'Spouse',
    dob: '1986-11-04',
    avatar_color: '#a855f7', // Purple
  });

  // Rename Sarah's auto-created default folder to "Lab & Blood Panels"
  const db = getDatabase();
  const sarahDefaultFolder = db.prepare('SELECT id FROM folders WHERE member_id = ?').get(sarah.id) as any;
  db.prepare("UPDATE folders SET name = 'Lab & Blood Panels' WHERE id = ?").run(sarahDefaultFolder.id);
  const fldLabs = { id: sarahDefaultFolder.id };

  // 2. Create Additional Folders for Sarah
  const fldCardio = createFolder(sarah.id, 'Cardiology & Imaging', null);
  const fldRx = createFolder(sarah.id, 'Prescriptions & Pharmacy', null);
  const fldExams = createFolder(sarah.id, 'Annual Preventative Exams', null);

  // Folders for Arthur
  createFolder(arthur.id, 'Geriatric Care & Vitals', null);
  createFolder(arthur.id, 'Cardiology Panels', null);

  // Folders for Maya & David
  createFolder(maya.id, 'Pediatric Records & Vaccines', null);
  createFolder(david.id, 'Routine Health Checkups', null);

  // 3. Vault Physical File
  const vaultDir = vault.getVaultDir();
  const dummyPdf = createDummyPdfBuffer();
  fs.writeFileSync(path.join(vaultDir, 'sarah_lipid_2026.pdf'), dummyPdf);
  fs.writeFileSync(path.join(vaultDir, 'sarah_cmp_2026.pdf'), dummyPdf);
  fs.writeFileSync(path.join(vaultDir, 'sarah_echo_2025.pdf'), dummyPdf);
  fs.writeFileSync(path.join(vaultDir, 'sarah_rx_statin.pdf'), dummyPdf);

  // 4. Insert Medical Documents
  const docLipid2026 = insertDocument({
    folder_id: fldLabs.id,
    filename: 'Lipid_Panel_Cardiovascular_Screening_2026.pdf',
    file_type: 'application/pdf',
    file_size: 215040,
    storage_path: 'sarah_lipid_2026.pdf',
    content_hash: 'hash_sarah_lipid_2026',
    extracted_text: `PACIFIC HEALTH DIAGNOSTICS - CLINICAL REPORT
Patient: Sarah Vance | DOB: 1988-06-14 | Date of Collection: 15-Mar-2026
Ordering Provider: Dr. Robert Morrison, MD (Preventative Cardiology)

LIPID PANEL (FASTING 12 HOURS):
Total Cholesterol: 178 mg/dL (Reference: < 200 mg/dL) [NORMAL]
HDL Cholesterol: 62 mg/dL (Reference: > 50 mg/dL) [OPTIMAL]
Triglycerides: 120 mg/dL (Reference: < 150 mg/dL) [NORMAL]
LDL-Cholesterol (Calculated): 92 mg/dL (Reference: < 100 mg/dL) [OPTIMAL]
Cholesterol/HDL Ratio: 2.87 (Reference: < 4.0) [NORMAL]
Non-HDL Cholesterol: 116 mg/dL (Reference: < 130 mg/dL) [NORMAL]

Clinical Impression: Marked improvement compared to March 2025 baseline (LDL 142 mg/dL). Excellent therapeutic response to Atorvastatin 20mg. Low risk cardiovascular tier attained.`,
    tags: ['Lipid Panel', 'Cholesterol', 'Cardiology', 'Optimal'],
    ocr_status: 'done',
  });

  const docCmp2026 = insertDocument({
    folder_id: fldLabs.id,
    filename: 'Comprehensive_Metabolic_Panel_2026.pdf',
    file_type: 'application/pdf',
    file_size: 148480,
    storage_path: 'sarah_cmp_2026.pdf',
    content_hash: 'hash_sarah_cmp_2026',
    extracted_text: `PACIFIC HEALTH DIAGNOSTICS - CLINICAL REPORT
Patient: Sarah Vance | DOB: 1988-06-14 | Collection Date: 15-Mar-2026
Panel: Comprehensive Metabolic Panel (CMP-14) + Vitamin D

Fasting Glucose: 92 mg/dL (Reference: 70 - 99 mg/dL) [NORMAL]
HbA1c: 5.3% (Reference: 4.0 - 5.6%) [OPTIMAL]
Blood Urea Nitrogen (BUN): 14 mg/dL (Reference: 7 - 20 mg/dL) [NORMAL]
Creatinine: 0.82 mg/dL (Reference: 0.60 - 1.10 mg/dL) [NORMAL]
eGFR: 98 mL/min/1.73m2 (Reference: > 90 mL/min/1.73m2) [NORMAL]
ALT (SGPT): 22 U/L (Reference: 7 - 35 U/L) [NORMAL]
AST (SGOT): 19 U/L (Reference: 8 - 33 U/L) [NORMAL]
Vitamin D (25-OH): 31 ng/mL (Reference: 30 - 100 ng/mL) [BORDERLINE]

Clinical Note: Normal renal, hepatic, and metabolic profiles. Hepatic safety confirmed on statin therapy.`,
    tags: ['Blood Test', 'Metabolic', 'Fasting Glucose', 'eGFR'],
    ocr_status: 'done',
  });

  const docEcho2025 = insertDocument({
    folder_id: fldCardio.id,
    filename: 'Transthoracic_Echocardiogram_Report_2025.pdf',
    file_type: 'application/pdf',
    file_size: 496640,
    storage_path: 'sarah_echo_2025.pdf',
    content_hash: 'hash_sarah_echo_2025',
    extracted_text: `METROPOLITAN CARDIOLOGY ASSOCIATES
Patient: Sarah Vance | Date of Exam: 12-Nov-2025 | Study: Transthoracic Echocardiogram
Physician: Dr. Robert Morrison, MD

FINDINGS:
1. Left Ventricle: Normal cavity dimensions and wall thickness. Normal global systolic function.
2. Ejection Fraction (EF): Estimated at 62% (Normal reference: 55 - 70%).
3. Valves: Structurally normal mitral, aortic, and tricuspid valves with no significant stenosis or regurgitation.
4. Pericardium: No pericardial effusion.
5. Vitals at exam: Resting BP 118/76 mmHg, Resting Heart Rate 64 bpm, Regular Sinus Rhythm.

CONCLUSION: Normal resting cardiac echocardiogram. Preserved biventricular systolic function.`,
    tags: ['Cardiology', 'Echo', 'Normal EF', 'Vitals'],
    ocr_status: 'done',
  });

  const docRx2025 = insertDocument({
    folder_id: fldRx.id,
    filename: 'Atorvastatin_20mg_Active_Prescription.pdf',
    file_type: 'application/pdf',
    file_size: 90112,
    storage_path: 'sarah_rx_statin.pdf',
    content_hash: 'hash_sarah_rx_statin',
    extracted_text: `PRESCRIPTION ORDER - NORTHWEST MEDICAL PHARMACY
Rx Number: 8492041 | Prescriber: Dr. Robert Morrison, MD
Patient: Sarah Vance | Date Prescribed: 18-Aug-2025

MEDICATION: Atorvastatin Calcium 20 mg Oral Tablet
SIG: Take 1 tablet by mouth daily with the evening meal.
QUANTITY: 90 tablets | REFILLS: 3 remaining
INDICATION: Primary prevention of hyperlipidemia and cardiovascular risk management.`,
    tags: ['Prescription', 'Statin', 'Cardiology', 'Daily'],
    ocr_status: 'done',
  });

  insertDocument({
    folder_id: fldExams.id,
    filename: 'Dr_Morrison_Annual_Physical_Notes.pdf',
    file_type: 'application/pdf',
    file_size: 327680,
    storage_path: 'sarah_cmp_2026.pdf',
    content_hash: 'hash_sarah_notes_2026',
    extracted_text: `ANNUAL PREVENTATIVE CLINICAL ENCOUNTER
Patient: Sarah Vance | Date: 16-Mar-2026
Attending: Dr. Robert Morrison, MD

Patient is in excellent overall health. Vitals: BP 118/76, HR 64, BMI 22.4.
Reviewed recent lipid panel: Outstanding response to Atorvastatin 20mg (LDL down to 92 mg/dL).
Plan: Continue current regimen. Repeat labs in 6 months (September 2026). Supplemental Vitamin D3 1000 IU daily.`,
    tags: ['Consultation', 'Preventative', 'Annual Physical'],
    ocr_status: 'done',
  });

  // 5. Insert Document Chunks for RAG Citations
  insertDocumentChunk({
    id: 'chk_sarah_lipid_01',
    documentId: docLipid2026.id,
    memberId: sarah.id,
    chunkIndex: 0,
    chunkText: `Total Cholesterol: 178 mg/dL (<200 mg/dL). LDL Cholesterol: 92 mg/dL (<100 mg/dL). HDL: 62 mg/dL (>50 mg/dL). Triglycerides: 120 mg/dL (<150 mg/dL). Marked reduction from March 2025 baseline (LDL was 142 mg/dL).`,
    pageNumber: 1,
    documentDate: '2026-03-15',
  });

  insertDocumentChunk({
    id: 'chk_sarah_cmp_01',
    documentId: docCmp2026.id,
    memberId: sarah.id,
    chunkIndex: 0,
    chunkText: `Fasting Blood Glucose: 92 mg/dL. HbA1c: 5.3%. Serum Creatinine: 0.82 mg/dL. eGFR: 98 mL/min/1.73m2. ALT: 22 U/L, AST: 19 U/L. Vitamin D: 31 ng/mL. Hepatic and renal markers normal on statin therapy.`,
    pageNumber: 1,
    documentDate: '2026-03-15',
  });

  insertDocumentChunk({
    id: 'chk_sarah_echo_01',
    documentId: docEcho2025.id,
    memberId: sarah.id,
    chunkIndex: 0,
    chunkText: `Ejection Fraction: 62% (Normal 55-70%). Normal resting cardiac echocardiogram. Resting Blood Pressure 118/76 mmHg, resting heart rate 64 bpm.`,
    pageNumber: 1,
    documentDate: '2025-11-12',
  });

  insertDocumentChunk({
    id: 'chk_sarah_rx_01',
    documentId: docRx2025.id,
    memberId: sarah.id,
    chunkIndex: 0,
    chunkText: `Atorvastatin Calcium 20 mg Oral Tablet. Take 1 tablet by mouth daily with the evening meal. Prescribed by Dr. Robert Morrison.`,
    pageNumber: 1,
    documentDate: '2025-08-18',
  });

  // 6. Insert AI Clinical Analysis Record (Health Overview)
  const analysisResult = {
    schemaVersion: '1.0',
    summary:
      'Comprehensive clinical review of Sarah Vance’s 2026 health records indicates exceptional cardiovascular optimization following initiation of Atorvastatin 20mg. Glycemic markers are optimal (HbA1c 5.3%, Fasting Glucose 92 mg/dL). Lipid profile demonstrates a 35% reduction in LDL-C (now 92 mg/dL vs 142 mg/dL baseline), reaching the target low-risk cardiovascular tier. Hepatic transaminases (ALT 22 U/L, AST 19 U/L) and renal function (eGFR 98 mL/min) confirm excellent tolerance with no statin-related adversity. Vitamin D is low-normal (31 ng/mL), responsive to seasonal maintenance supplementation.',
    keyHighlights: [
      'LDL Cholesterol achieved optimal target: 92 mg/dL (35% reduction from baseline)',
      'Echocardiogram demonstrates preserved left ventricular systolic function (EF 62%)',
      'Normal metabolic & glycemic markers: Fasting Glucose 92 mg/dL, HbA1c 5.3%',
      'Complete hepatic tolerance to Atorvastatin 20mg confirmed by baseline enzymes',
    ],
    highlightedMarkers: [
      { marker: 'LDL-C', status: 'normal' as const, note: '92 mg/dL (Optimal <100)', value: 92 },
      { marker: 'HbA1c', status: 'normal' as const, note: '5.3% (Optimal <5.7%)', value: 5.3 },
      { marker: 'Blood Pressure', status: 'normal' as const, note: '118/76 mmHg (Normotensive)', value: '118/76' },
      { marker: 'Vitamin D', status: 'borderline' as const, note: '31 ng/mL (Low-normal threshold)', value: 31 },
    ],
    documentDateRange: {
      earliest: '2025-08-18',
      latest: '2026-03-15',
    },
    metrics: [
      {
        name: 'LDL Cholesterol',
        value: 92,
        unit: 'mg/dL',
        referenceRange: '< 100',
        status: 'normal' as const,
        history: [
          { date: '2025-03-10', value: 142 },
          { date: '2025-08-18', value: 136 },
          { date: '2026-03-15', value: 92 },
        ],
      },
      {
        name: 'Total Cholesterol',
        value: 178,
        unit: 'mg/dL',
        referenceRange: '< 200',
        status: 'normal' as const,
        history: [
          { date: '2025-03-10', value: 228 },
          { date: '2026-03-15', value: 178 },
        ],
      },
      {
        name: 'HDL Cholesterol',
        value: 62,
        unit: 'mg/dL',
        referenceRange: '> 50',
        status: 'normal' as const,
        history: [
          { date: '2025-03-10', value: 56 },
          { date: '2026-03-15', value: 62 },
        ],
      },
      {
        name: 'Triglycerides',
        value: 120,
        unit: 'mg/dL',
        referenceRange: '< 150',
        status: 'normal' as const,
        history: [
          { date: '2025-03-10', value: 150 },
          { date: '2026-03-15', value: 120 },
        ],
      },
      {
        name: 'Fasting Blood Glucose',
        value: 92,
        unit: 'mg/dL',
        referenceRange: '70 - 99',
        status: 'normal' as const,
      },
      {
        name: 'Hemoglobin A1c',
        value: 5.3,
        unit: '%',
        referenceRange: '4.0 - 5.6',
        status: 'normal' as const,
      },
      {
        name: 'Blood Pressure',
        value: '118/76',
        unit: 'mmHg',
        referenceRange: '90/60 - 120/80',
        status: 'normal' as const,
      },
      {
        name: 'Resting Heart Rate',
        value: 64,
        unit: 'bpm',
        referenceRange: '60 - 100',
        status: 'normal' as const,
      },
      {
        name: 'Vitamin D (25-OH)',
        value: 31,
        unit: 'ng/mL',
        referenceRange: '30 - 100',
        status: 'borderline' as const,
      },
      {
        name: 'eGFR',
        value: 98,
        unit: 'mL/min',
        referenceRange: '> 90',
        status: 'normal' as const,
      },
    ],
    flags: [
      {
        title: 'Low-Normal Vitamin D Level',
        severity: 'low' as const,
        explanation:
          'Vitamin D (25-OH) is measured at 31 ng/mL, right at the borderline threshold (reference: 30–100 ng/mL). Consistent with winter-spring seasonal reduction. Daily supplementation of 1,000–2,000 IU D3 is recommended to prevent deficiency.',
        relatedMetric: 'Vitamin D (25-OH)',
      },
      {
        title: 'Positive Cardiovascular Trajectory',
        severity: 'low' as const,
        explanation:
          'Calculated LDL has successfully dropped from 142 mg/dL down to 92 mg/dL, achieving target low-risk cardiovascular milestone with preserved hepatic transaminases.',
        relatedMetric: 'LDL Cholesterol',
      },
    ],
    discussionPoints: [
      {
        topic: 'Statin Maintenance Strategy',
        question: 'Should Sarah remain at Atorvastatin 20mg daily or consider maintaining this exact dose long term?',
        urgency: 'routine' as const,
        rationale: 'LDL target (<100 mg/dL) was successfully met with zero liver enzyme elevation.',
      },
      {
        topic: 'Follow-up Surveillance Interval',
        question: 'Is a 6-month interval (September 2026) appropriate for repeat fasting lipid and Vitamin D panels?',
        urgency: 'follow_up' as const,
        rationale: 'Confirms steady-state lipid control and monitors 25-OH D3 recovery.',
      },
    ],
    recommendations: [
      'Continue Atorvastatin 20mg once daily with the evening meal.',
      'Take Vitamin D3 1,000–2,000 IU daily with breakfast.',
      'Repeat fasting lipid panel and Vitamin D in September 2026.',
      'Maintain 150 minutes weekly of moderate-intensity aerobic physical activity.',
    ],
    extractedEntities: {
      reportTypes: ['Comprehensive Metabolic Panel', 'Fasting Lipid Panel', 'Echocardiogram Review'],
      providers: ['Pacific Health Diagnostics', 'Dr. Robert Morrison, MD'],
    },
    sourceDocuments: [
      { id: docLipid2026.id, filename: docLipid2026.filename },
      { id: docCmp2026.id, filename: docCmp2026.filename },
      { id: docEcho2025.id, filename: docEcho2025.filename },
      { id: docRx2025.id, filename: docRx2025.filename },
    ],
    confidence: 'high' as const,
  };

  const anlId = 'anl_sarah_annual_2026';
  db.prepare(`
    INSERT INTO analysis_results (id, cache_key, scope_type, scope_id, provider_profile_id, prompt_version, result_json, created_at, title)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    anlId,
    'cache_sarah_2026',
    'folder',
    fldLabs.id,
    'prof_lm_studio',
    '1.0',
    JSON.stringify(analysisResult),
    '2026-03-15T10:30:00.000Z',
    'Sarah Vance - Annual Comprehensive Clinical Synthesis'
  );

  // Sources for Analysis
  db.prepare(`INSERT INTO analysis_sources (analysis_id, document_id) VALUES (?, ?)`).run(anlId, docLipid2026.id);
  db.prepare(`INSERT INTO analysis_sources (analysis_id, document_id) VALUES (?, ?)`).run(anlId, docCmp2026.id);
  db.prepare(`INSERT INTO analysis_sources (analysis_id, document_id) VALUES (?, ?)`).run(anlId, docEcho2025.id);
  db.prepare(`INSERT INTO analysis_sources (analysis_id, document_id) VALUES (?, ?)`).run(anlId, docRx2025.id);

  // 7. Seed Chat Consultation
  const chatSession = createChatSession({
    id: 'cs_marketing_demo_01',
    memberId: sarah.id,
    title: 'Cholesterol Trend & Preventative Care Plan',
    providerProfileId: 'prof_lm_studio',
    modelName: 'llama-3.2-3b-instruct',
  });

  createChatMessage({
    sessionId: chatSession.id,
    role: 'user',
    content: 'Can you analyze Sarah’s cholesterol trend between 2025 and 2026, and tell me if the Atorvastatin is working?',
    scopedMemberId: sarah.id,
  });

  createChatMessage({
    sessionId: chatSession.id,
    role: 'assistant',
    content: `### Clinical Progress Summary: Sarah Vance

**Yes, the data shows marked, clinically significant improvement in Sarah's cardiovascular biomarkers.**

#### 📊 Biomarker Comparison
| Clinical Marker | March 2025 (Baseline) | March 2026 (Current) | Change | Target Status |
| :--- | :--- | :--- | :--- | :--- |
| **Total Cholesterol** | **228 mg/dL** | **178 mg/dL** | ⬇️ -50 mg/dL (-22%) | ✅ Desirable (<200) |
| **LDL ('Bad' Cholesterol)** | **142 mg/dL** | **92 mg/dL** | ⬇️ -50 mg/dL (-35%) | 🎯 Optimal Target (<100) |
| **HDL ('Good' Cholesterol)** | **56 mg/dL** | **62 mg/dL** | ⬆️ +6 mg/dL (+11%) | 🛡️ Protective (>50) |
| **Triglycerides** | **150 mg/dL** | **120 mg/dL** | ⬇️ -30 mg/dL (-20%) | ✅ Normal (<150) |

#### 🩺 Key Takeaways & Observations
1. **Optimal Statin Response:** Sarah has achieved an **LDL level of 92 mg/dL**, successfully placing her in the low-risk cardiovascular bracket as targeted by Dr. Morrison.
2. **Liver & Kidney Safety:** Renal function (eGFR 98 mL/min, Creatinine 0.82) and hepatic enzymes (ALT 22 U/L, AST 19 U/L) remain completely stable with zero signs of statin-induced intolerance.
3. **Next Steps:** As noted in the clinical plan, a routine repeat panel is scheduled for **September 2026** to ensure steady-state maintenance.

*Source: Grounded in 3 vault documents (Lipid Panel 2026, Baseline 2025, Prescription Record).*`,
    reasoningContent: `1. Scanned encrypted local vault for Sarah Vance (member_id: ${sarah.id}).
2. Retrieved 'Lipid_Panel_Cardiovascular_Screening_2026.pdf' (15-Mar-2026) and 'Comprehensive_Metabolic_Panel_2026.pdf'.
3. Cross-referenced baseline values from 2025: LDL was 142 mg/dL; post-treatment is 92 mg/dL (-35.2%).
4. Checked hepatic safety transaminases (ALT 22 U/L, AST 19 U/L) to verify zero statin toxicity.
5. Formatted structured comparison table with exact reference ranges and verified follow-up recommendations.`,
    scopedMemberId: sarah.id,
    citedChunks: [
      {
        chunkId: 'chk_sarah_lipid_01',
        documentId: docLipid2026.id,
        filename: 'Lipid_Panel_Cardiovascular_Screening_2026.pdf',
        pageNumber: 1,
        documentDate: '2026-03-15',
        snippet: 'Total Cholesterol: 178 mg/dL. LDL Cholesterol: 92 mg/dL. HDL: 62 mg/dL. Triglycerides: 120 mg/dL.',
      },
      {
        chunkId: 'chk_sarah_cmp_01',
        documentId: docCmp2026.id,
        filename: 'Comprehensive_Metabolic_Panel_2026.pdf',
        pageNumber: 1,
        documentDate: '2026-03-15',
        snippet: 'Fasting Blood Glucose: 92 mg/dL. HbA1c: 5.3%. Serum Creatinine: 0.82 mg/dL. eGFR: 98 mL/min. ALT: 22 U/L.',
      },
    ],
    latencyMs: 1180,
    tokenCount: 312,
  });

  // 8. Seed Privacy App Logs
  const nowIso = new Date().toISOString();
  db.prepare(`
    INSERT INTO app_logs (level, category, message, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run('info', 'ai', 'Local AI inference executed via LM Studio (llama-3.2-3b-instruct)', '100% on-device processing. Zero external network transmission.', nowIso);

  db.prepare(`
    INSERT INTO app_logs (level, category, message, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run('info', 'vault', 'Vault directory initialized with AES-256 encrypted storage', '/home/sash/Documents/MedBuddyVault', nowIso);

  db.prepare(`
    INSERT INTO app_logs (level, category, message, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run('info', 'extract', 'Extracted 1,420 tokens using local ONNX PaddleOCR engine', 'Processed Lipid_Panel_Cardiovascular_Screening_2026.pdf', nowIso);

  return { sarah, arthur, docLipid2026, anlId, chatSession };
}

// Helper to save screenshot to all target directories
function saveScreenshot(filename: string, imageBuffer: Buffer) {
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, imageBuffer);
  }
  console.log(`📸 Saved: ${filename}`);
}

app.whenReady().then(async () => {
  try {
    const data = await setupMarketingData();

    // 1440x900 resolution (crisp presentation standard)
    const win = new BrowserWindow({
      width: 1440,
      height: 900,
      show: false,
      backgroundColor: '#07080a',
      webPreferences: {
        preload: path.join(__dirname, '../dist-electron/preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });

    const indexPath = path.join(__dirname, '../dist/index.html');
    await win.loadFile(indexPath);

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    await wait(2000);

    // ==========================================
    // SCREENSHOT 1: Home Dashboard (Dark Mode)
    // ==========================================
    console.log('Capturing 01_Home_Dashboard.png...');
    let img = await win.webContents.capturePage();
    saveScreenshot('01_Home_Dashboard.png', img.toPNG());

    // ==========================================
    // SCREENSHOT 2: Vault Documents (File Explorer)
    // ==========================================
    console.log('Navigating to Vault Documents...');
    await win.webContents.executeJavaScript(`
      (() => {
        // Click 'Browse Medical Records' on Home Dashboard
        const buttons = Array.from(document.querySelectorAll('button'));
        const browseBtn = buttons.find(b => b.textContent && b.textContent.includes('Browse Medical Records'));
        if (browseBtn) {
          browseBtn.click();
        } else {
          const filesBtn = buttons.find(b => b.textContent && b.textContent.includes('Vault Documents'));
          if (filesBtn) filesBtn.click();
        }
      })()
    `);
    await wait(1400);

    // Click on "Lab & Blood Panels" folder to show documents
    await win.webContents.executeJavaScript(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const labFolder = buttons.find(b => b.textContent && b.textContent.includes('Lab & Blood Panels'));
        if (labFolder) labFolder.click();
      })()
    `);
    await wait(1200);

    console.log('Capturing 02_Vault_Documents.png...');
    img = await win.webContents.capturePage();
    saveScreenshot('02_Vault_Documents.png', img.toPNG());

    // ==========================================
    // SCREENSHOT 3: Document Split Preview
    // ==========================================
    console.log('Opening Document Split Preview...');
    await win.webContents.executeJavaScript(`
      (() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const docSpan = spans.find(s => s.textContent && s.textContent.includes('.pdf'));
        if (docSpan) {
          docSpan.click();
        }
      })()
    `);
    await wait(1500);

    // Switch to Extracted Text tab
    await win.webContents.executeJavaScript(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const textTab = buttons.find(b => b.textContent && b.textContent.includes('Extracted Text'));
        if (textTab) {
          textTab.click();
          textTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      })()
    `);
    await wait(1500);

    console.log('Capturing 03_Document_Split_Preview.png...');
    img = await win.webContents.capturePage();
    saveScreenshot('03_Document_Split_Preview.png', img.toPNG());

    // Close preview drawer
    await win.webContents.executeJavaScript(`
      (() => {
        const closeBtn = document.querySelector('button[title*="Close Preview"], button[aria-label="Close"]') || Array.from(document.querySelectorAll('button')).find(b => b.title && b.title.includes('Close Preview'));
        if (closeBtn) closeBtn.click();
      })()
    `);
    await wait(1000);

    // ==========================================
    // SCREENSHOT 4: AI Clinical Health Overview Report
    // ==========================================
    console.log('Navigating to Health Overview...');
    await win.webContents.executeJavaScript(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        // Find report in sidebar under AI Summaries
        const reportBtn = buttons.find(b => b.textContent && (b.textContent.includes('Sarah_Vance_') || b.textContent.includes('generated_summary')));
        if (reportBtn) {
          reportBtn.click();
        } else {
          // Go to home and click report card
          const homeBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Home');
          if (homeBtn) homeBtn.click();
        }
      })()
    `);
    await wait(1200);

    // If still not in overview, click on the recent overview card on home
    await win.webContents.executeJavaScript(`
      (() => {
        if (!document.querySelector('h1')?.textContent?.includes('Overview') && !document.querySelector('h2')?.textContent?.includes('Overview')) {
          const cards = Array.from(document.querySelectorAll('div, button'));
          const targetCard = cards.find(c => c.textContent && (c.textContent.includes('Sarah_Vance_') || c.textContent.includes('Annual Comprehensive')));
          if (targetCard) (targetCard.closest('button') || targetCard.closest('[role="button"]') || targetCard).click();
        }
      })()
    `);
    await wait(1600);

    console.log('Capturing 04_Clinical_Overview_Report.png...');
    img = await win.webContents.capturePage();
    saveScreenshot('04_Clinical_Overview_Report.png', img.toPNG());

    // ==========================================
    // SCREENSHOT 5: Health Timeline / Chronicle
    // ==========================================
    console.log('Navigating to Health Timeline...');
    await win.webContents.executeJavaScript(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const timelineBtn = buttons.find(b => b.textContent && b.textContent.includes('Health Chronicle'));
        if (timelineBtn) timelineBtn.click();
      })()
    `);
    await wait(1500);

    console.log('Capturing 05_Health_Timeline_Chronicle.png...');
    img = await win.webContents.capturePage();
    saveScreenshot('05_Health_Timeline_Chronicle.png', img.toPNG());

    // ==========================================
    // SCREENSHOT 6: AI Chat Assistant with Citations
    // ==========================================
    console.log('Navigating to AI Chat Assistant...');
    await win.webContents.executeJavaScript(`
      (() => {
        const floatBtn = document.querySelector('button[title*="Chat with MedBuddy"], button[aria-label="Chat with MedBuddy"]');
        if (floatBtn) {
          floatBtn.click();
        } else {
          const buttons = Array.from(document.querySelectorAll('button'));
          const chatBtn = buttons.find(b => b.textContent && b.textContent.includes('Chat with MedBuddy'));
          if (chatBtn) chatBtn.click();
        }
      })()
    `);
    await wait(1500);

    // Select the demo session in chat sidebar
    await win.webContents.executeJavaScript(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const target = buttons.find(s => s.textContent && s.textContent.includes('Cholesterol Trend & Preventative'));
        if (target) target.click();
      })()
    `);
    await wait(1200);

    console.log('Capturing 06_AI_Chat_Assistant_Citations.png...');
    img = await win.webContents.capturePage();
    saveScreenshot('06_AI_Chat_Assistant_Citations.png', img.toPNG());

    // ==========================================
    // SCREENSHOT 7: Clinical Reasoning Process Drawer
    // ==========================================
    console.log('Expanding Clinical Reasoning Drawer...');
    await win.webContents.executeJavaScript(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const reasoningBtn = btns.find(b => b.innerText && b.innerText.includes('Clinical Reasoning Process'));
        if (reasoningBtn) reasoningBtn.click();
      })()
    `);
    await wait(800);

    console.log('Capturing 07_AI_Chat_Clinical_Reasoning.png...');
    img = await win.webContents.capturePage();
    saveScreenshot('07_AI_Chat_Clinical_Reasoning.png', img.toPNG());

    // ==========================================
    // SCREENSHOT 8: AI Provider Settings
    // ==========================================
    console.log('Navigating to AI Provider Settings...');
    await win.webContents.executeJavaScript(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const settingsBtn = buttons.find(b => b.textContent && b.textContent.includes('AI Providers'));
        if (settingsBtn) settingsBtn.click();
      })()
    `);
    await wait(1500);

    console.log('Capturing 08_AI_Provider_Settings.png...');
    img = await win.webContents.capturePage();
    saveScreenshot('08_AI_Provider_Settings.png', img.toPNG());

    // ==========================================
    // SCREENSHOT 9: Cloud Backup & Sync Modal
    // ==========================================
    console.log('Opening Vault Backup & Sync Modal...');
    // Return to home first using the brand logo home button
    await win.webContents.executeJavaScript(`
      (() => {
        const homeBtn = document.querySelector('button[title="Return to Home"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Home');
        if (homeBtn) homeBtn.click();
      })()
    `);
    await wait(1500);

    // Click the Backup Vault button in the top header or card
    await win.webContents.executeJavaScript(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('header button, button'));
        const syncBtn = buttons.find(b => b.textContent && (b.textContent.includes('Backup Vault') || b.textContent.includes('Set Backup Location')));
        if (syncBtn) {
          syncBtn.click();
          syncBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        } else {
          const cards = Array.from(document.querySelectorAll('div'));
          const syncCard = cards.find(c => c.textContent && c.textContent.includes('Vault Backup & Sync'));
          if (syncCard) {
            const el = syncCard.closest('.cursor-pointer') || syncCard;
            el.click();
            el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        }
      })()
    `);
    await wait(2000);

    // Verify modal is open, if not, try clicking card
    await win.webContents.executeJavaScript(`
      (() => {
        if (!document.body.innerText.includes('Continuous local backup')) {
          const cards = Array.from(document.querySelectorAll('div'));
          const syncCard = cards.find(c => c.textContent && c.textContent.includes('Vault Backup & Sync'));
          if (syncCard) {
            const el = syncCard.closest('.cursor-pointer') || syncCard;
            el.click();
            el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        }
      })()
    `);
    await wait(1500);

    console.log('Capturing 09_Vault_Backup_Sync_Modal.png...');
    img = await win.webContents.capturePage();
    saveScreenshot('09_Vault_Backup_Sync_Modal.png', img.toPNG());

    // Close sync modal cleanly
    await win.webContents.executeJavaScript(`
      (() => {
        const closeBtn = document.querySelector('button[title*="Close"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Close');
        if (closeBtn) {
          closeBtn.click();
          closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      })()
    `);
    await wait(1500);

    // ==========================================
    // SCREENSHOT 10: Diagnostics & Privacy Logs Modal
    // ==========================================
    console.log('Opening Diagnostics & Privacy Logs Modal...');
    await win.webContents.executeJavaScript(`
      (() => {
        const asideButtons = Array.from(document.querySelectorAll('aside button'));
        const diagBtn = asideButtons.find(b => b.textContent && b.textContent.includes('Diagnostics'));
        if (diagBtn) {
          diagBtn.click();
          diagBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      })()
    `);
    await wait(2200);

    console.log('Capturing 10_Diagnostics_Privacy_Audit_Modal.png...');
    img = await win.webContents.capturePage();
    saveScreenshot('10_Diagnostics_Privacy_Audit_Modal.png', img.toPNG());

    // Close diagnostics modal using X button in header
    await win.webContents.executeJavaScript(`
      (() => {
        // Find close button in DiagnosticsModal (the button containing lucide-x)
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-x')) || document.querySelector('div.fixed button svg.lucide-x')?.closest('button');
        if (closeBtn) {
          closeBtn.click();
          closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      })()
    `);
    await wait(1500);

    // Ensure all modals are closed before switching theme
    await win.webContents.executeJavaScript(`
      (() => {
        const backdrop = document.querySelector('div.fixed.inset-0');
        if (backdrop) {
          const xBtn = backdrop.querySelector('button');
          if (xBtn) xBtn.click();
        }
      })()
    `);
    await wait(800);

    // ==========================================
    // SCREENSHOT 11 & 12: Light Mode Hero & Overview
    // ==========================================
    console.log('Toggling to Light Mode...');
    await win.webContents.executeJavaScript(`
      (() => {
        // Toggle theme button in sidebar to update React state
        const toggle = document.querySelector('button[title*="theme" i], button[title*="Theme" i]');
        if (toggle) {
          toggle.click();
          toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
        localStorage.setItem('medbuddy-theme', 'light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.removeAttribute('data-theme');
      })()
    `);
    await wait(1500);

    console.log('Capturing 11_Home_Dashboard_LightMode.png...');
    img = await win.webContents.capturePage();
    saveScreenshot('11_Home_Dashboard_LightMode.png', img.toPNG());

    // Navigate to Clinical Overview in Light Mode
    console.log('Navigating to Clinical Overview in Light Mode...');
    await win.webContents.executeJavaScript(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const reportBtn = buttons.find(b => b.textContent && (b.textContent.includes('Sarah_Vance_') || b.textContent.includes('generated_summary')));
        if (reportBtn) {
          reportBtn.click();
        } else {
          const cards = Array.from(document.querySelectorAll('div, button'));
          const targetCard = cards.find(c => c.textContent && (c.textContent.includes('Sarah_Vance_') || c.textContent.includes('Annual Comprehensive')));
          if (targetCard) (targetCard.closest('button') || targetCard.closest('[role="button"]') || targetCard).click();
        }
      })()
    `);
    await wait(2000);

    console.log('Capturing 12_Clinical_Overview_Report_LightMode.png...');
    img = await win.webContents.capturePage();
    saveScreenshot('12_Clinical_Overview_Report_LightMode.png', img.toPNG());

    // Create a helpful Marketing Guide README in both output directories
    const marketingGuide = `# MedBuddy Marketing Screenshots & Assets

These high-resolution (1440x900) marketing screenshots showcase **MedBuddy** across all primary features with realistic, HIPAA-compliant dummy patient data (*Sarah Vance*).

---

## 📸 Included Screenshots

| File | Screen / Feature | Key Marketing Highlights |
| :--- | :--- | :--- |
| **\`01_Home_Dashboard.png\`** | **Clinical Command Center** | Family profiles (Sarah, Arthur, Maya, David), 100% on-device AI badge, system status, recent health syntheses. |
| **\`02_Vault_Documents.png\`** | **Vault Document Explorer** | Organized medical files with custom tags (*Lipid Panel*, *Cardiology*, *Prescription*), OCR indexing badges, instant filtering. |
| **\`03_Document_Split_Preview.png\`** | **Split-Screen Document Inspector** | Deep document inspection, extracted OCR text tab, metadata, and "Ask Assistant about this record" CTA. |
| **\`04_Clinical_Overview_Report.png\`** | **AI Clinical Overview (Dark)** | Executive summary, biomarkers table with reference ranges (*Optimal*, *Normal*, *Borderline*), trajectory flags, physician discussion points. |
| **\`05_Health_Timeline_Chronicle.png\`** | **Interactive Health Chronicle** | Chronological multi-year timeline of medical encounters, lab panels, and biomarker trajectories. |
| **\`06_AI_Chat_Assistant_Citations.png\`** | **Local Medical AI Assistant** | Grounded clinical Q&A with interactive source citation cards linking directly to medical documents. |
| **\`07_AI_Chat_Clinical_Reasoning.png\`** | **Transparent Clinical Reasoning** | Collapsible reasoning drawer demonstrating step-by-step local document verification without hallucinations. |
| **\`08_AI_Provider_Settings.png\`** | **AI Engine & Privacy Settings** | Local offline AI engine configuration (LM Studio & Ollama), model picker, active latency (14ms), zero cloud dependency. |
| **\`09_Vault_Backup_Sync_Modal.png\`** | **Encrypted Cloud & Local Backup** | Seamless integration with local or cloud-synced folders (Google Drive, Dropbox, iCloud) with AES-256 encryption. |
| **\`10_Diagnostics_Privacy_Audit_Modal.png\`** | **Zero-Telemetry Privacy Audit** | Verification logs proving 100% on-device OCR, local database queries, and zero outbound network calls. |
| **\`11_Home_Dashboard_LightMode.png\`** | **Home Dashboard (Light Mode)** | Clean, modern light clinical design with teal accents. |
| **\`12_Clinical_Overview_Report_LightMode.png\`** | **Clinical Overview (Light Mode)** | Professional paper-ready clinical summary view in crisp light mode. |

---

## 💡 Post Ideas & Sample Captions

### 🐦 Twitter / X Post
> **Tired of your family's medical records being scattered across 5 different hospital portals?** 🏥
>
> Introducing **MedBuddy**: A private, local-first medical vault with on-device AI analysis.
> 
> 🔒 100% Offline (Ollama / LM Studio)
> 📄 Built-in OCR & Auto-Organize
> 📊 Multi-year biomarker tracking & trend analysis
> 💬 Chat with your records with direct document citations
> 
> Your health data never leaves your computer. 🛡️
> #HealthTech #OpenSource #LocalAI #Privacy

### 💼 LinkedIn Post
> Managing health documents for an entire family shouldn't require uploading sensitive medical histories to third-party cloud servers.
>
> We built **MedBuddy** to solve this with a strictly local-first architecture:
> • **Deterministic Biomarker Extraction:** Parses complex lab panels into structured metrics with reference ranges.
> • **Grounded Clinical Reasoning:** An AI assistant that answers questions with clickable, page-level citations to your actual records.
> • **Zero Cloud Telemetry:** Operates fully offline using open-weights models (Llama 3.2, Qwen 2.5) via LM Studio or Ollama.
>
> Check out the interface preview below! ⬇️
`;

    for (const dir of targetDirs) {
      fs.writeFileSync(path.join(dir, 'README.md'), marketingGuide);
    }
    console.log('📝 Created README.md in output directories');

    console.log('🎉 All marketing screenshots successfully generated!');
  } catch (err) {
    console.error('❌ Screenshot capture error:', err);
  } finally {
    app.quit();
  }
});
