import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase } from '../src/main/db/database';
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
  await wait(1000);

  // Click "+ New" in the sidebar
  await win.webContents.executeJavaScript(`
    (() => {
      const newBtn = document.querySelector('button[title*="Start new consultation"]');
      if (newBtn) newBtn.click();
    })()
  `);
  await wait(800);

  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'chat_poppy_pro_new_chat.png'), img.toPNG());

  console.log('✅ Captured new consultation empty state screenshot!');
  app.quit();
});
