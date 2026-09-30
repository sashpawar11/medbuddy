import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import {
  initDatabase,
  getDatabase,
  createMember,
  insertDocument,
} from '../src/main/db/database';
import { registerIpcHandlers } from '../src/main/ipc';
import { vault } from '../src/main/services/vault';
import { logger } from '../src/main/services/logger';

const tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medbuddy-pdftest-'));
const tempDbPath = path.join(tempDbDir, 'medbuddy-test.db');
const outputPdfPath = path.join('/tmp', 'test_output.pdf');
const outputPngPrefix = path.join('/tmp', 'page');

app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

async function setupTestData() {
  logger.init();
  initDatabase(tempDbPath);
  vault.init();
  registerIpcHandlers();

  const member = createMember({
    name: 'Eleanor Vance',
    relationship: 'Spouse',
    dob: '1962-04-15',
    avatar_color: '#ec4899',
  });

  const db = getDatabase();
  const folder = db.prepare('SELECT id FROM folders WHERE member_id = ?').get(member.id) as any;

  const doc = insertDocument({
    folder_id: folder.id,
    filename: 'Eleanor_Clinical_Lab_Report_2024.pdf',
    file_type: 'application/pdf',
    file_size: 45000,
    storage_path: 'doc_eleanor.pdf',
    content_hash: 'hash_eleanor',
    extracted_text: 'Comprehensive Metabolic & Hematology Panel 2024.',
    ocr_status: 'done',
  });

  const analysisResult = {
    schemaVersion: '1.0',
    summary: 'Clinical evaluation reveals residual inflammatory markers following Polymyalgia Rheumatica treatment. ESR of 25 mm/hr and mild leukocytosis with WBC at 11,300 cells/cumm suggest low-grade active inflammation. Hepatic parameters show mild elevation of Alkaline Phosphatase (137 U/L) with normal transaminases. Continued routine monitoring is advised.',
    keyHighlights: [
      'ESR remains mildly elevated at 25 mm/hr post-treatment',
      'WBC slightly above threshold at 11,300 cells/cumm',
      'ALP isolated elevation at 137 U/L with preserved liver function',
    ],
    metrics: [
      {
        name: 'ESR (Erythrocyte Sedimentation Rate)',
        value: 25,
        unit: 'mm/hr',
        referenceRange: '0-20',
        status: 'borderline' as const,
      },
      {
        name: 'WBC (White Blood Cell Count)',
        value: 11300,
        unit: 'cells/cumm',
        referenceRange: '4000-11000',
        status: 'borderline' as const,
      },
      {
        name: 'Alkaline Phosphatase (ALP)',
        value: 137,
        unit: 'U/L',
        referenceRange: '42-98',
        status: 'flagged' as const,
      },
      {
        name: 'Hemoglobin',
        value: 13.8,
        unit: 'g/dL',
        referenceRange: '12.0-15.5',
        status: 'normal' as const,
      },
      {
        name: 'Platelet Count',
        value: 265000,
        unit: 'cells/mcL',
        referenceRange: '150000-450000',
        status: 'normal' as const,
      },
      {
        name: 'Fasting Blood Glucose',
        value: 92,
        unit: 'mg/dL',
        referenceRange: '70-99',
        status: 'normal' as const,
      },
      {
        name: 'Creatinine',
        value: 0.85,
        unit: 'mg/dL',
        referenceRange: '0.6-1.1',
        status: 'normal' as const,
      },
    ],
    flags: [
      {
        title: 'ESR (Erythrocyte Sedimentation Rate)',
        severity: 'moderate' as const,
        explanation: 'ESR of 25 mm/hr on 08-Jul-2024 exceeds the upper reference limit of 20 mm/hr, consistent with residual inflammatory activity following Polymyalgia Rheumatica treatment. CRP at 3.88 mg/L remains within normal limits but warrants periodic re-evaluation.',
        relatedMetric: 'ESR (Erythrocyte Sedimentation Rate)',
      },
      {
        title: 'WBC (White Blood Cell Count)',
        severity: 'low' as const,
        explanation: 'WBC rose from 9,600 cells/cumm on 10-May-2024 to 11,300 cells/cumm on 08-Jul-2024, crossing the upper reference threshold of 11,000. This mild elevation may reflect residual inflammatory response or early infection and should be monitored.',
        relatedMetric: 'WBC (White Blood Cell Count)',
      },
      {
        title: 'Alkaline Phosphatase (ALP)',
        severity: 'low' as const,
        explanation: 'ALP of 137 U/L on 10-May-2024 exceeds the female reference range (42-98 U/L), and total bilirubin at 1.5 mg/dl is mildly above the typical upper limit of 1.2 mg/dl. SGPT/SGOT are within normal limits, suggesting no significant hepatocellular injury.',
        relatedMetric: 'Alkaline Phosphatase (ALP)',
      },
    ],
    discussionPoints: [
      {
        topic: 'Inflammatory Markers',
        question: 'Given the persistent ESR of 25 mm/hr, should we schedule a repeat inflammatory panel in 8 to 12 weeks?',
        urgency: 'priority' as const,
        rationale: 'Confirms complete resolution of polymyalgia flare or detects early relapse.',
      },
      {
        topic: 'Hepatic Enzyme Follow-up',
        question: 'Is an isolated ALP of 137 U/L clinically significant given normal transaminases?',
        urgency: 'follow_up' as const,
        rationale: 'Differentiates bone vs liver origin (consider GGT or fractionated ALP if persistent).',
      },
    ],
    recommendations: [
      'Repeat ESR and CBC in 8-12 weeks to monitor inflammatory trajectory.',
      'Maintain adequate hydration and routine metabolic health monitoring.',
    ],
    extractedEntities: {
      reportTypes: ['Clinical Pathology Report'],
      providers: ['Metropolitan Health Labs'],
    },
    sourceDocuments: [{ id: doc.id, filename: doc.filename }],
    confidence: 'high' as const,
  };

  const anlId = 'anl_test_01';
  db.prepare(`
    INSERT INTO analysis_results (id, cache_key, scope_type, scope_id, provider_profile_id, prompt_version, result_json, created_at, title)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    anlId,
    'cache_test',
    'folder',
    folder.id,
    'profile_lm_studio',
    '1.0',
    JSON.stringify(analysisResult),
    new Date().toISOString(),
    'Eleanor Vance - Clinical Summary'
  );

  db.prepare(`
    INSERT INTO analysis_sources (analysis_id, document_id)
    VALUES (?, ?)
  `).run(anlId, doc.id);

  return { member, folder, doc, anlId };
}

app.whenReady().then(async () => {
  try {
    const { anlId } = await setupTestData();

    const win = new BrowserWindow({
      width: 1280,
      height: 900,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../dist-electron/preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });

    await win.loadFile(path.join(__dirname, '../dist/index.html'));

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    await wait(2000);

    // Navigate to Eleanor's folder / analysis
    console.log('Navigating to analysis...');
    await win.webContents.executeJavaScript(`
      (() => {
        // Find Eleanor in sidebar and click
        const spans = Array.from(document.querySelectorAll('span, div, p'));
        const eleanor = spans.find(el => el.textContent && el.textContent.includes('Eleanor Vance'));
        if (eleanor) (eleanor.closest('button') || eleanor).click();
      })()
    `);
    await wait(1200);

    // Click on the analysis tab / view
    await win.webContents.executeJavaScript(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button, div, span'));
        const summaryBtn = btns.find(b => b.textContent && (b.textContent.includes('Clinical Summary') || b.textContent.includes('Summary') || b.textContent.includes('Overview')));
        if (summaryBtn) (summaryBtn.closest('button') || summaryBtn).click();
      })()
    `);
    await wait(1200);

    console.log('Exporting PDF using current print settings...');
    const originalBg = win.getBackgroundColor();
    win.setBackgroundColor('#ffffff');
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: {
        marginType: 'none',
      },
    });
    win.setBackgroundColor(originalBg);

    fs.writeFileSync(outputPdfPath, pdfBuffer);
    console.log('Saved PDF to:', outputPdfPath);

    // Convert to PNG with pdftoppm
    execSync(`pdftoppm -png -r 150 "${outputPdfPath}" "${outputPngPrefix}"`);
    console.log('Converted PDF pages to PNGs!');
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    app.quit();
  }
});
