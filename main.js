const { app, globalShortcut, BrowserWindow, desktopCapturer, screen, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let overlayWindow = null;
let tray = null;

// Hide app from dock on macOS
if (process.platform === 'darwin') {
  app.dock.hide();
}

app.whenReady().then(() => {
  setupTray();
  registerShortcut();

  // Run automatically in the background when Windows starts
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true // macOS only, but good practice
  });

  app.on('activate', () => {
    // macOS behavior
  });
});

app.on('window-all-closed', () => {
  // Do nothing. We want the app to stay running in the background.
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

function setupTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 });
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: "J'Snaps Running", enabled: false },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit(); } }
  ]);
  tray.setToolTip("J'Snaps");
  tray.setContextMenu(contextMenu);
}

function registerShortcut() {
  const ret = globalShortcut.register('CommandOrControl+Shift+S', async () => {
    if (overlayWindow) return; // Already capturing
    await triggerCapture();
  });

  if (!ret) {
    console.error('Registration failed');
  }
}

let pendingOverlayData = null;

async function triggerCapture() {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    const scaleFactor = primaryDisplay.scaleFactor;

    // Grab full resolution desktop screenshot
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { 
        width: Math.round(width * scaleFactor), 
        height: Math.round(height * scaleFactor) 
      }
    });

    const primarySource = sources.find(s => s.display_id === primaryDisplay.id.toString()) || sources[0];
    pendingOverlayData = primarySource.thumbnail.toDataURL();

    createOverlayWindow(primaryDisplay.bounds);
  } catch (error) {
    console.error("Capture failed:", error);
  }
}

ipcMain.handle('GET_OVERLAY_DATA', () => {
  return pendingOverlayData;
});

function createOverlayWindow(bounds) {
  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    fullscreen: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.loadFile('overlay.html');

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

// ── IPC Listeners ────────────────────────────────────────────────────────────

ipcMain.on('CLOSE_OVERLAY', () => {
  if (overlayWindow) {
    overlayWindow.close();
  }
});

let pendingEditorData = null;

ipcMain.on('OPEN_EDITOR', (event, data) => {
  if (overlayWindow) {
    overlayWindow.close();
  }

  pendingEditorData = data;

  // Open the Editor window
  const editorWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  editorWindow.loadFile(path.join(__dirname, 'editor', 'editor.html'));
});

ipcMain.handle('GET_EDITOR_DATA', () => {
  return pendingEditorData;
});
