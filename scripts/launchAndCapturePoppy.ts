import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, getDatabase, listMembers, listProviders } from '../src/main/db/database';
import { vault } from '../src/main/services/vault';
import { logger } from '../src/main/services/logger';
import { registerIpcHandlers } from '../src/main/ipc';
import { aiProvider } from '../src/main/services/ai/provider';
import { documentChunker } from '../src/main/services/ai/chunker';

app.commandLine.appendSwitch('disable-gpu-sandbox');
app.setName('medbuddy');

const outputDir = '/home/sash/.gemini/antigravity/brain/bc31f672-28c4-46da-8486-1a4b9a565331';

app.whenReady().then(async () => {
  logger.init();
  initDatabase();
  vault.init();
  registerIpcHandlers();

  console.log('--- 1. Checking Database and Profiles ---');
  const members = listMembers();
  console.log('Registered members:', members.map((m) => `${m.name} (${m.id})`));

  const poppy = members.find((m) => m.name.toLowerCase().includes('poppy'));
  if (!poppy) {
    console.error('Poppy profile not found!');
  } else {
    console.log(`Found Poppy profile: ID=${poppy.id}, Relationship=${poppy.relationship}`);
    const chunkCount = await documentChunker.ensureMemberDocumentsChunked(poppy.id);
    console.log(`Indexed/verified chunks for Poppy's documents: ${chunkCount} new chunks indexed`);
  }

  console.log('--- 2. Checking AI Connection to LM Studio ---');
  const providers = listProviders();
  const defaultProvider = providers.find((p) => p.is_default === 1) || providers[0];
  console.log('Active default provider:', defaultProvider);

  if (defaultProvider) {
    const conn = await aiProvider.testConnection(defaultProvider);
    console.log('Connection test result:', conn);
  }

  console.log('--- 3. Launching Window ---');
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const indexPath = path.join(__dirname, '../dist/index.html');
  await win.loadFile(indexPath);
  win.show();

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  await wait(1800);

  console.log('--- 4. Navigating to Chat UI & Selecting Poppy ---');
  await win.webContents.executeJavaScript(`
    (() => {
      // 1. Click Chat with Records in sidebar
      const buttons = Array.from(document.querySelectorAll('button'));
      const chatBtn = buttons.find(b => b.textContent && b.textContent.includes('Chat with Records'));
      if (chatBtn) chatBtn.click();
    })()
  `);
  await wait(1000);

  // If Poppy is not currently selected, select Poppy
  await win.webContents.executeJavaScript(`
    (() => {
      // Check if Poppy is in profile dropdown or already active
      const composerPill = document.querySelector('button[title*="Scoped profile"]');
      console.log('Current composer pill:', composerPill ? composerPill.innerText : 'none');
    })()
  `);
  await wait(800);

  console.log('--- 5. Capturing Screenshot ---');
  const img = await win.webContents.capturePage();
  const targetFile = path.join(outputDir, 'chat_poppy_qwen.png');
  fs.writeFileSync(targetFile, img.toPNG());
  console.log(`✅ Screenshot captured and saved to ${targetFile}`);

  app.quit();
});
