import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { initDatabase } from './db/database';
import { vault } from './services/vault';
import { logger } from './services/logger';
import { registerIpcHandlers } from './ipc';
import { ocrQueue } from './services/ocrQueue';

// Disable hardware acceleration issues if running in certain container environments
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.setName('medbuddy');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: '#07080a', // Dark canvas to eliminate white flash
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for preload script IPC in some vite setups
      webSecurity: true,
    },
  });

  // Open external links in default browser rather than inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  logger.init();
  initDatabase();
  vault.init();
  registerIpcHandlers();
  createWindow();

  // Re-enqueue any documents whose OCR was interrupted in a previous session
  ocrQueue.recoverPending().catch((err) =>
    logger.warn('extract', 'OCR recovery error on startup', { error: err?.message })
  );

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
