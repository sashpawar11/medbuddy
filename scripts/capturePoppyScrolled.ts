import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, getDatabase, listMembers, listProviders } from '../src/main/db/database';
import { vault } from '../src/main/services/vault';
import { logger } from '../src/main/services/logger';
import { registerIpcHandlers } from '../src/main/ipc';

app.commandLine.appendSwitch('disable-gpu-sandbox');
app.setName('medbuddy');

const outputDir = '/home/sash/.gemini/antigravity/brain/bc31f672-28c4-46da-8486-1a4b9a565331';

app.whenReady().then(async () => {
  logger.init();
  initDatabase();
  vault.init();
  registerIpcHandlers();

  const win = new BrowserWindow({
    width: 1340,
    height: 920,
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

  // Navigate to Chat
  await win.webContents.executeJavaScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const chatBtn = buttons.find(b => b.textContent && b.textContent.includes('Chat with Records'));
      if (chatBtn) chatBtn.click();
    })()
  `);
  await wait(1200);

  // 1. Capture Top view with formatted Patient Info table
  let img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'chat_poppy_pro_top.png'), img.toPNG());

  // 2. Scroll to show formatted abnormal findings & callouts
  await win.webContents.executeJavaScript(`
    (() => {
      const scrollContainers = document.querySelectorAll('.overflow-y-auto');
      // Main message area is the second scroll container
      for (const el of scrollContainers) {
        if (el.scrollHeight > 1000) {
          el.scrollTop = 580;
        }
      }
    })()
  `);
  await wait(800);

  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'chat_poppy_pro_tables.png'), img.toPNG());

  // 3. Scroll to bottom to show Perplexity-style Grounded Sources Cards
  await win.webContents.executeJavaScript(`
    (() => {
      const scrollContainers = document.querySelectorAll('.overflow-y-auto');
      for (const el of scrollContainers) {
        if (el.scrollHeight > 1000) {
          el.scrollTop = el.scrollHeight;
        }
      }
    })()
  `);
  await wait(800);

  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'chat_poppy_pro_sources.png'), img.toPNG());

  // 4. Click New Chat to capture sleek empty state
  await win.webContents.executeJavaScript(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newBtn = btns.find(b => b.textContent && b.textContent.includes('New'));
      if (newBtn) newBtn.click();
    })()
  `);
  await wait(800);

  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'chat_poppy_pro_empty.png'), img.toPNG());

  console.log('✅ Captured all 4 professional UI screenshots!');
  app.quit();
});
