// Sortino - Electron main process
// Opens the Express server in a BrowserWindow so no external browser is needed.

import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from './server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let serverPort;

async function createWindow(initialPath = '/') {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'sortino.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Sortino',
  });

  mainWindow.loadURL(`http://localhost:${serverPort}${initialPath}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    {
      label: 'Sortino',
      submenu: [
        {
          label: 'Sort Images',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow?.loadURL(`http://localhost:${serverPort}`),
        },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.loadURL(`http://localhost:${serverPort}/settings`),
        },
        { type: 'separator' },
        {
          label: 'Help',
          click: () => shell.openExternal('https://github.com/Contraculto/sortino/blob/master/README.md'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  try {
    const { port, isFirstRun } = await startServer();
    serverPort = port;
    buildMenu();
    await createWindow(isFirstRun ? '/settings' : '/');
  } catch (err) {
    console.error('Failed to start server:', err);
    app.quit();
  }

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
