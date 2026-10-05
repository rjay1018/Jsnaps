const { app, globalShortcut, BrowserWindow, desktopCapturer, screen, ipcMain, Tray, Menu, nativeImage, clipboard, dialog } = require('electron');
const path = require('path');
const { share, settings, signInGdrive, signOutGdrive } = require('./share');
const { calculateEditorWindowBounds } = require('./window-utils');

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
  tray.setToolTip("J'Snaps");
  refreshTrayMenu();
}

function refreshTrayMenu() {
  const host = settings.get().host;
  const contextMenu = Menu.buildFromTemplate([
    { label: "J'Snaps Running", enabled: false },
    { type: 'separator' },
    {
      label: 'Share host',
      submenu: [
        { label: 'Catbox (public, no setup)', type: 'radio', checked: host === 'catbox', click: () => { settings.set({ host: 'catbox' }); refreshTrayMenu(); } },
        { label: 'Google Drive', type: 'radio', checked: host === 'gdrive', click: () => { settings.set({ host: 'gdrive' }); refreshTrayMenu(); } },
      ],
    },
    { label: 'Sign in with Google Drive', click: async () => {
        try {
          settings.set({ host: 'gdrive' });
          await signInGdrive();
          dialog.showMessageBox({
            type: 'info',
            message: 'Signed in to Google Drive',
            detail: 'Created "JSnaps" folder in your Google Drive. All shared screenshots will be saved there.'
          });
        } catch (err) {
          dialog.showErrorBox('Google sign-in failed', err.message);
        }
        refreshTrayMenu();
      } },
    { label: 'Sign out of Google Drive', click: async () => {
        await signOutGdrive();
        dialog.showMessageBox({ type: 'info', message: 'Signed out of Google Drive' });
      } },
    { label: 'Advanced: use my own credentials…', click: openGdriveSetup },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);
}

let gdriveSetupWindow = null;
function openGdriveSetup() {
  if (gdriveSetupWindow) { gdriveSetupWindow.focus(); return; }
  gdriveSetupWindow = new BrowserWindow({
    width: 440, height: 360, autoHideMenuBar: true, resizable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  gdriveSetupWindow.loadFile(path.join(__dirname, 'gdrive-setup.html'));
  gdriveSetupWindow.on('closed', () => { gdriveSetupWindow = null; });
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

  const display = (data && data.rect)
    ? screen.getDisplayNearestPoint({ x: data.rect.x, y: data.rect.y })
    : screen.getPrimaryDisplay();
  const bounds = calculateEditorWindowBounds({
    rect: data ? data.rect : null,
    workArea: display.workArea,
  });

  // Open the Editor window
  const editorWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: bounds.minWidth,
    minHeight: bounds.minHeight,
    center: bounds.center,
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

ipcMain.on('SAVE_GDRIVE_CONFIG', (event, cfg) => {
  settings.set({ gdriveClientId: cfg.clientId, gdriveClientSecret: cfg.clientSecret, gdriveRefreshToken: null, host: 'gdrive' });
  if (gdriveSetupWindow) gdriveSetupWindow.close();
  refreshTrayMenu();
});

ipcMain.handle('SHARE_IMAGE', async (event, dataUrl) => {
  try {
    const s = settings.get();
    if (s.host === 'catbox' && !s.catboxNoticeAccepted) {
      const { response } = await dialog.showMessageBox({
        type: 'info',
        buttons: ['Upload', 'Cancel'],
        defaultId: 1,
        message: 'Catbox links are public',
        detail: 'Anyone with the link can view this image. Use the Blur tool on sensitive info first, or switch to Google Drive from the tray menu.',
      });
      if (response !== 0) return { ok: false, error: 'Upload cancelled' };
      settings.set({ catboxNoticeAccepted: true });
    }
    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
    const url = await share(buffer);
    clipboard.writeText(url);
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
