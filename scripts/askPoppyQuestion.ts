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
const queryText = "Give me the patient info, abnormal observations and their blood group from the reports";

app.whenReady().then(async () => {
  logger.init();
  initDatabase();
  vault.init();
  registerIpcHandlers();

  console.log('--- 1. Initializing and checking Poppy profile ---');
  const members = listMembers();
  const poppy = members.find((m) => m.name.toLowerCase().includes('poppy'));
  if (!poppy) {
    console.error('Poppy profile not found!');
    app.quit();
    return;
  }

  // Ensure documents are chunked
  await documentChunker.ensureMemberDocumentsChunked(poppy.id);

  console.log('--- 2. Creating Window ---');
  const win = new BrowserWindow({
    width: 1320,
    height: 900,
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
  await wait(2000);

  console.log('--- 3. Navigating to Chat with Records ---');
  await win.webContents.executeJavaScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const chatBtn = buttons.find(b => b.textContent && b.textContent.includes('Chat with Records'));
      if (chatBtn) chatBtn.click();
    })()
  `);
  await wait(1200);

  console.log('--- 4. Typing question into chat composer and submitting ---');
  await win.webContents.executeJavaScript(`
    (() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(textarea, ${JSON.stringify(queryText)});
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
      }
    })()
  `);
  await wait(500);

  // Click the send button
  await win.webContents.executeJavaScript(`
    (() => {
      const sendBtn = document.querySelector('button[aria-label="Send message"]') ||
                      document.querySelector('button[title*="Send message"]');
      if (sendBtn) {
        console.log('Clicking send button...');
        sendBtn.click();
      } else {
        console.error('Send button not found!');
      }
    })()
  `);

  console.log('--- 5. Waiting for Qwen3.8-27B to stream response ---');
  const startTime = Date.now();
  let streamStarted = false;

  for (let i = 0; i < 120; i++) {
    await wait(1000);
    const status = await win.webContents.executeJavaScript(`
      (() => {
        const stopBtn = document.querySelector('button[title*="Stop"]');
        const assistantMsgs = document.querySelectorAll('.prose, [data-role="assistant"]');
        const bodyText = document.body.innerText;
        const hasAssistant = bodyText.includes('MedBuddy Assistant') || bodyText.includes('Clinical Reasoning');
        return {
          isStreaming: !!stopBtn,
          hasAssistant,
          bodyLength: bodyText.length,
        };
      })()
    `);

    if (status.isStreaming) {
      streamStarted = true;
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`\rStreaming: ${status.isStreaming} | Started: ${streamStarted} | Elapsed: ${elapsed}s`);

    // Complete when stream started and then finished
    if (streamStarted && !status.isStreaming && status.hasAssistant) {
      console.log('\n✅ Streaming finished successfully!');
      break;
    }
  }

  // Small delay to ensure render layout stabilizes
  await wait(2000);

  console.log('--- 6. Capturing Screenshot ---');
  const img = await win.webContents.capturePage();
  const targetFile = path.join(outputDir, 'chat_poppy_response.png');
  fs.writeFileSync(targetFile, img.toPNG());
  console.log(`✅ Screenshot captured and saved to ${targetFile}`);

  app.quit();
});
