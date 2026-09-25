import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  initDatabase,
  closeDatabase,
  getDatabase,
  createMember,
  insertDocument,
  createChatSession,
  createChatMessage,
  insertDocumentChunk,
} from '../src/main/db/database';
import { registerIpcHandlers } from '../src/main/ipc';
import { vault } from '../src/main/services/vault';
import { logger } from '../src/main/services/logger';

const outputDir = '/home/sash/.gemini/antigravity/brain/bc31f672-28c4-46da-8486-1a4b9a565331';
const tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medbuddy-screens-'));
const tempDbPath = path.join(tempDbDir, 'medbuddy-demo.db');

app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

async function setupData() {
  logger.init();
  initDatabase(tempDbPath);
  vault.init();
  registerIpcHandlers();

  // Create Family Profiles
  const dad = createMember({
    name: 'Robert Vance',
    relationship: 'Parent',
    dob: '1958-11-20',
    avatar_color: '#3b82f6',
  });

  const mom = createMember({
    name: 'Eleanor Vance',
    relationship: 'Spouse',
    dob: '1962-04-15',
    avatar_color: '#ec4899',
  });

  const child = createMember({
    name: 'Maya Vance',
    relationship: 'Child',
    dob: '2016-09-02',
    avatar_color: '#10b981',
  });

  const db = getDatabase();
  const dadFolder = db.prepare('SELECT id FROM folders WHERE member_id = ?').get(dad.id) as any;
  const momFolder = db.prepare('SELECT id FROM folders WHERE member_id = ?').get(mom.id) as any;

  // Insert documents for Dad
  const doc1 = insertDocument({
    folder_id: dadFolder.id,
    filename: 'Robert_Cardiology_Echocardiogram_2024.pdf',
    file_type: 'application/pdf',
    file_size: 42000,
    storage_path: 'doc1.pdf',
    content_hash: 'hash1',
    extracted_text: 'Cardiology Assessment: Ejection Fraction 60%. Mild sinus bradycardia.',
    ocr_status: 'done',
  });

  const doc2 = insertDocument({
    folder_id: dadFolder.id,
    filename: 'Robert_PSA_Urology_Panel_2024.pdf',
    file_type: 'application/pdf',
    file_size: 38000,
    storage_path: 'doc2.pdf',
    content_hash: 'hash2',
    extracted_text: 'Total PSA: 3.8 ng/mL. Free PSA ratio 22.4%. Prescription: Tamsulosin 0.4mg daily with dinner.',
    ocr_status: 'done',
  });

  // Chunks for Dad
  insertDocumentChunk({
    id: 'chk_1',
    documentId: doc2.id,
    memberId: dad.id,
    chunkIndex: 0,
    chunkText: 'Total PSA: 3.8 ng/mL (Reference: 0.0 - 4.0 ng/mL). Free PSA: 0.85 ng/mL. Note: Increased from 2.4 ng/mL in 2023. Prescription: Tamsulosin 0.4mg daily with dinner.',
    pageNumber: 2,
    documentDate: '2024-11-20',
  });

  insertDocumentChunk({
    id: 'chk_2',
    documentId: doc1.id,
    memberId: dad.id,
    chunkIndex: 0,
    chunkText: 'Cardiology Echo Review: Ejection fraction 60%, normal wall motion. Blood pressure 128/82 mmHg, resting pulse 58 bpm.',
    pageNumber: 1,
    documentDate: '2024-11-20',
  });

  // Insert document for Mom
  insertDocument({
    folder_id: momFolder.id,
    filename: 'Eleanor_Lipid_Panel_2024.pdf',
    file_type: 'application/pdf',
    file_size: 35000,
    storage_path: 'doc_mom.pdf',
    content_hash: 'hash_mom',
    extracted_text: 'Total Cholesterol: 235 mg/dL. LDL: 152 mg/dL. Prescription: Atorvastatin 10mg daily.',
    ocr_status: 'done',
  });

  // Seed Consultation Session
  const session = createChatSession({
    memberId: dad.id,
    title: 'PSA Trend & Cardiology Consultation',
    modelName: 'llama-3.3-70b-instruct',
  });

  createChatMessage({
    sessionId: session.id,
    role: 'user',
    content: "What was Robert's PSA level and what did the cardiologist note about his heart?",
    scopedMemberId: dad.id,
  });

  createChatMessage({
    sessionId: session.id,
    role: 'assistant',
    content: `Based on **Robert Vance's** recent clinical records from November 2024:

1. **Urology & PSA Finding**:
   - **Total PSA**: **3.8 ng/mL** [Normal Reference: 0.0 – 4.0 ng/mL].
   - **Trend**: The value has risen from **2.4 ng/mL** in late 2023. While still within standard range, continued surveillance in 6 months was noted by the urologist.
   - **Current Medication**: **Tamsulosin 0.4mg** once daily with dinner.

2. **Cardiology & Echo Findings**:
   - **Ejection Fraction (EF)**: Preserved at **60%** with normal ventricular wall motion.
   - **Vitals**: Resting Blood Pressure **128/82 mmHg**, heart rate **58 bpm** (mild sinus bradycardia).

*Clinical Note: All values are grounded in Robert's annual health panel.*`,
    reasoningContent: `1. Scanned records for Robert Vance (member_id: ${dad.id}).
2. Located 'Robert_PSA_Urology_Panel_2024.pdf' Page 2: Total PSA is 3.8 ng/mL, prior was 2.4 ng/mL. Tamsulosin 0.4mg prescribed.
3. Located 'Robert_Cardiology_Echocardiogram_2024.pdf' Page 1: EF is 60%, BP 128/82, HR 58.
4. Synthesized grounded response citing both documents with exact dates and page numbers.`,
    scopedMemberId: dad.id,
    citedChunks: [
      {
        chunkId: 'chk_1',
        documentId: doc2.id,
        filename: 'Robert_PSA_Urology_Panel_2024.pdf',
        pageNumber: 2,
        documentDate: '2024-11-20',
        snippet: 'Total PSA: 3.8 ng/mL. Tamsulosin 0.4mg daily with dinner.',
      },
      {
        chunkId: 'chk_2',
        documentId: doc1.id,
        filename: 'Robert_Cardiology_Echocardiogram_2024.pdf',
        pageNumber: 1,
        documentDate: '2024-11-20',
        snippet: 'Cardiology Echo Review: Ejection fraction 60%, normal wall motion.',
      },
    ],
    latencyMs: 1250,
    tokenCount: 284,
  });

  return { dad, mom, child, session };
}

app.whenReady().then(async () => {
  await setupData();

  const win = new BrowserWindow({
    width: 1280,
    height: 840,
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
  await wait(1500);

  // 1. Home Dashboard with Chat CTA
  console.log('1. Capturing Home Dashboard...');
  let img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'home_dashboard_chat.png'), img.toPNG());

  // 2. Navigate to Chat Assistant
  console.log('2. Navigating to Chat Assistant...');
  await win.webContents.executeJavaScript(`
    const buttons = Array.from(document.querySelectorAll('button'));
    const chatBtn = buttons.find(b => b.textContent && b.textContent.includes('Chat with Records'));
    if (chatBtn) chatBtn.click();
  `);
  await wait(1000);

  console.log('Capturing Active Chat Conversation with Citations...');
  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'chat_active_conversation.png'), img.toPNG());

  // 3. Expand Clinical Reasoning Process Drawer
  console.log('3. Opening Clinical Reasoning Drawer...');
  await win.webContents.executeJavaScript(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const reasoningBtn = btns.find(b => b.innerText && b.innerText.includes('Clinical Reasoning Process'));
      if (reasoningBtn) reasoningBtn.click();
    })()
  `);
  await wait(600);

  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'chat_reasoning_drawer.png'), img.toPNG());

  // 4. Trigger @mention autocomplete
  console.log('4. Triggering @mention autocomplete in composer...');
  await win.webContents.executeJavaScript(`
    (() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(textarea, '@');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
      }
    })()
  `);
  await wait(600);

  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'chat_composer_mention.png'), img.toPNG());

  // 5. Start New Chat for Empty State with Starter Prompts
  console.log('5. Capturing Empty State with Starter Prompt Chips...');
  await win.webContents.executeJavaScript(`
    (() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(textarea, '');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.blur();
      }
      const newChatBtn = document.querySelector('button[title="Start new chat session"]');
      if (newChatBtn) {
        newChatBtn.click();
      } else {
        const btns = Array.from(document.querySelectorAll('button'));
        const altBtn = btns.find(b => b.textContent && b.textContent.includes('New'));
        if (altBtn) altBtn.click();
      }
    })()
  `);
  await wait(800);

  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'chat_empty_state.png'), img.toPNG());

  console.log('🎉 All screenshots captured successfully in artifacts directory!');
  app.quit();
});
