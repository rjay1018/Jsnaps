# Share Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One click in the editor uploads the annotated screenshot to Catbox (default) or Google Drive and copies the share URL to the clipboard.

**Architecture:** Per-host uploader modules in `share/` (`upload(buffer) -> url`), selected by a small `settings.json`. Main process owns uploads and the clipboard via a new `SHARE_IMAGE` IPC handler. The editor adds a Share Link button; the tray adds host selection and Drive setup.

**Tech Stack:** Electron 42 (Node 22+ built-in `fetch`/`FormData`/`Blob`), `node --test`, vanilla JS. No new dependencies.

## Global Constraints

- No new npm dependencies.
- Catbox is the default host; Google Drive scope is exactly `https://www.googleapis.com/auth/drive.file`.
- Catbox requests send `User-Agent: JSnaps/1.0`; 30s timeout.
- No silent fallback from Drive to Catbox (privacy).
- First Catbox use shows a one-time "image will be public" notice.
- Existing comments in touched files must be preserved.
- Editor shortcut for Share Link: `Ctrl+L`.

## File Structure

- Create `share/catbox.js` — Catbox uploader.
- Create `share/gdrive.js` — Drive uploader (token refresh, folder, upload, permission); dependencies injected.
- Create `share/gdrive-auth.js` — OAuth loopback + PKCE (manual-tested).
- Create `share/index.js` — dispatch by host; wires settings, safeStorage, auth.
- Create `settings.js` — JSON settings in `userData`.
- Create `gdrive-setup.html` — small form for client ID/secret.
- Create `tests/catbox.test.js`, `tests/gdrive.test.js`, `tests/settings.test.js`.
- Modify `main.js`, `preload.js`, `editor/editor.html`, `editor/editor.js`, `editor/editor.css`, `package.json`, `README.md`.

---

### Task 1: Settings + Catbox uploader

**Files:**
- Create: `settings.js`, `share/catbox.js`
- Test: `tests/settings.test.js`, `tests/catbox.test.js`
- Modify: `package.json` (add test script)

**Interfaces:**
- Produces: `createSettings(dir) -> { get(): object, set(patch: object): object }`; `catbox.upload(buffer: Buffer, opts?: { fetchImpl }) -> Promise<string>`.

- [ ] **Step 1: Write failing tests**

`tests/settings.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSettings } = require('../settings');

test('defaults, then persists patches', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsnaps-'));
  const s = createSettings(dir);
  assert.strictEqual(s.get().host, 'catbox');
  s.set({ host: 'gdrive' });
  assert.strictEqual(createSettings(dir).get().host, 'gdrive');
});
```

`tests/catbox.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { upload } = require('../share/catbox');

test('returns the URL from a successful upload', async () => {
  let seen;
  const fetchImpl = async (url, opts) => {
    seen = { url, opts };
    return { ok: true, text: async () => 'https://files.catbox.moe/abc.png\n' };
  };
  const url = await upload(Buffer.from('png'), { fetchImpl });
  assert.strictEqual(url, 'https://files.catbox.moe/abc.png');
  assert.strictEqual(seen.url, 'https://catbox.moe/user/api.php');
  assert.strictEqual(seen.opts.headers['User-Agent'], 'JSnaps/1.0');
  assert.strictEqual(seen.opts.body.get('reqtype'), 'fileupload');
});

test('throws on error response', async () => {
  const fetchImpl = async () => ({ ok: false, status: 412, text: async () => 'bad' });
  await assert.rejects(upload(Buffer.from('x'), { fetchImpl }), /Catbox upload failed/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/`
Expected: FAIL — `Cannot find module '../settings'`.

- [ ] **Step 3: Implement**

`settings.js`:
```js
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  host: 'catbox',
  gdriveClientId: '',
  gdriveClientSecret: '',
  gdriveRefreshToken: null, // base64 of safeStorage-encrypted token
  catboxNoticeAccepted: false,
};

function createSettings(dir) {
  const file = path.join(dir, 'settings.json');
  function get() {
    try {
      return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch {
      return { ...DEFAULTS };
    }
  }
  function set(patch) {
    const next = { ...get(), ...patch };
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(next, null, 2));
    return next;
  }
  return { get, set };
}

module.exports = { createSettings };
```

`share/catbox.js`:
```js
async function upload(buffer, { fetchImpl = fetch } = {}) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', new Blob([buffer], { type: 'image/png' }), `jsnaps-${Date.now()}.png`);
  const res = await fetchImpl('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form,
    headers: { 'User-Agent': 'JSnaps/1.0' },
    signal: AbortSignal.timeout(30000),
  });
  const text = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//.test(text)) {
    throw new Error(`Catbox upload failed: ${text || res.status}`);
  }
  return text;
}

module.exports = { upload };
```

`package.json` scripts: add `"test": "node --test tests/"`.

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add settings.js share/catbox.js tests package.json
git commit -m "feat: add settings store and Catbox uploader"
```

---

### Task 2: Google Drive uploader

**Files:**
- Create: `share/gdrive.js`, `share/gdrive-auth.js`
- Test: `tests/gdrive.test.js`

**Interfaces:**
- Produces: `createGdrive({ fetchImpl?, getConfig, saveRefreshToken, authorize }) -> { upload(buffer): Promise<string> }` where `getConfig() -> { clientId, clientSecret, refreshToken }`, `saveRefreshToken(token|null)`, `authorize(cfg) -> Promise<string refreshToken>`. And `gdrive-auth.authorize(cfg, openExternal) -> Promise<string>`.

- [ ] **Step 1: Write failing tests**

`tests/gdrive.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { createGdrive } = require('../share/gdrive');

function mockFetch({ folderExists = true, tokenFails = false } = {}) {
  const calls = [];
  const impl = async (url, opts = {}) => {
    calls.push({ url: String(url), opts });
    const u = String(url);
    const json = (body, ok = true) => ({ ok, json: async () => body });
    if (u.includes('oauth2.googleapis.com/token')) {
      return tokenFails ? json({ error: 'invalid_grant' }, false) : json({ access_token: 'AT' });
    }
    if (u.includes('/drive/v3/files?q=')) return json({ files: folderExists ? [{ id: 'F1' }] : [] });
    if (u.endsWith('/drive/v3/files') && opts.method === 'POST') return json({ id: 'F1' });
    if (u.includes('/upload/drive/v3/files')) return json({ id: 'IMG', webViewLink: 'https://drive.google.com/file/d/IMG/view' });
    if (u.includes('/permissions')) return json({});
    throw new Error('unexpected ' + u);
  };
  return { impl, calls };
}

const cfg = (extra) => () => ({ clientId: 'id', clientSecret: 'sec', refreshToken: 'RT', ...extra });

test('uploads, makes public, returns view link', async () => {
  const { impl, calls } = mockFetch();
  const g = createGdrive({ fetchImpl: impl, getConfig: cfg(), saveRefreshToken() {}, authorize: async () => 'x' });
  const url = await g.upload(Buffer.from('png'));
  assert.strictEqual(url, 'https://drive.google.com/file/d/IMG/view');
  const perm = calls.find((c) => c.url.includes('/permissions'));
  assert.deepStrictEqual(JSON.parse(perm.opts.body), { role: 'reader', type: 'anyone' });
});

test('creates the JSnaps folder when missing', async () => {
  const { impl, calls } = mockFetch({ folderExists: false });
  const g = createGdrive({ fetchImpl: impl, getConfig: cfg(), saveRefreshToken() {}, authorize: async () => 'x' });
  await g.upload(Buffer.from('png'));
  assert.ok(calls.some((c) => c.url.endsWith('/drive/v3/files') && c.opts.method === 'POST'));
});

test('throws when not configured', async () => {
  const g = createGdrive({ fetchImpl: async () => {}, getConfig: () => ({}), saveRefreshToken() {}, authorize: async () => 'x' });
  await assert.rejects(g.upload(Buffer.from('p')), /not set up/);
});

test('authorizes and saves refresh token when none stored', async () => {
  const { impl } = mockFetch();
  let saved;
  const g = createGdrive({
    fetchImpl: impl,
    getConfig: cfg({ refreshToken: null }),
    saveRefreshToken: (t) => { saved = t; },
    authorize: async () => 'NEWRT',
  });
  await g.upload(Buffer.from('p'));
  assert.strictEqual(saved, 'NEWRT');
});

test('clears token and reports expiry on invalid_grant', async () => {
  const { impl } = mockFetch({ tokenFails: true });
  let saved = 'unset';
  const g = createGdrive({ fetchImpl: impl, getConfig: cfg(), saveRefreshToken: (t) => { saved = t; }, authorize: async () => 'x' });
  await assert.rejects(g.upload(Buffer.from('p')), /sign-in expired/);
  assert.strictEqual(saved, null);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/gdrive.test.js`
Expected: FAIL — `Cannot find module '../share/gdrive'`.

- [ ] **Step 3: Implement**

`share/gdrive.js`:
```js
const API = 'https://www.googleapis.com';
const FOLDER_NAME = 'JSnaps';

function createGdrive({ fetchImpl = fetch, getConfig, saveRefreshToken, authorize }) {
  async function accessToken() {
    const cfg = getConfig();
    if (!cfg.clientId || !cfg.clientSecret) {
      throw new Error('Google Drive is not set up. Use tray menu > Set up Google Drive…');
    }
    let refresh = cfg.refreshToken;
    if (!refresh) {
      refresh = await authorize(cfg);
      saveRefreshToken(refresh);
    }
    const res = await fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        refresh_token: refresh,
        grant_type: 'refresh_token',
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      if (body.error === 'invalid_grant') saveRefreshToken(null);
      throw new Error('Google sign-in expired. Click Share Link again to sign in.');
    }
    return body.access_token;
  }

  async function api(token, url, opts = {}) {
    const res = await fetchImpl(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`Google Drive error: ${body.error?.message || res.status}`);
    return body;
  }

  async function ensureFolder(token) {
    const q = encodeURIComponent(
      `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    const found = await api(token, `${API}/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`);
    if (found.files && found.files.length) return found.files[0].id;
    const created = await api(token, `${API}/drive/v3/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
    });
    return created.id;
  }

  async function upload(buffer) {
    const token = await accessToken();
    const folderId = await ensureFolder(token);
    const boundary = 'jsnaps' + Date.now();
    const meta = JSON.stringify({ name: `jsnaps-${Date.now()}.png`, parents: [folderId] });
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: image/png\r\n\r\n`),
      buffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);
    const file = await api(
      token,
      `${API}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`,
      { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body }
    );
    await api(token, `${API}/drive/v3/files/${file.id}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
    return file.webViewLink;
  }

  return { upload };
}

module.exports = { createGdrive };
```

`share/gdrive-auth.js`:
```js
const http = require('http');
const crypto = require('crypto');

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Opens the browser for Google sign-in and resolves with a refresh token.
function authorize({ clientId, clientSecret }, openExternal) {
  return new Promise((resolve, reject) => {
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const code = url.searchParams.get('code');
      if (!code) { res.end('Waiting for sign-in…'); return; }
      res.end('J\'Snaps is connected to Google Drive. You can close this tab.');
      clearTimeout(timer);
      server.close();
      try {
        const redirectUri = `http://127.0.0.1:${server.address().port}`;
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code, client_id: clientId, client_secret: clientSecret,
            code_verifier: verifier, redirect_uri: redirectUri, grant_type: 'authorization_code',
          }),
        });
        const body = await tokenRes.json();
        if (!tokenRes.ok || !body.refresh_token) throw new Error(body.error_description || 'Google sign-in failed');
        resolve(body.refresh_token);
      } catch (e) { reject(e); }
    });
    const timer = setTimeout(() => { server.close(); reject(new Error('Google sign-in timed out')); }, 120000);
    server.listen(0, '127.0.0.1', () => {
      const redirectUri = `http://127.0.0.1:${server.address().port}`;
      const params = new URLSearchParams({
        client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
        scope: 'https://www.googleapis.com/auth/drive.file',
        code_challenge: challenge, code_challenge_method: 'S256',
        access_type: 'offline', prompt: 'consent',
      });
      openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    });
  });
}

module.exports = { authorize };
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: all tests PASS (8 total).

- [ ] **Step 5: Commit**

```bash
git add share/gdrive.js share/gdrive-auth.js tests/gdrive.test.js
git commit -m "feat: add Google Drive uploader with OAuth loopback"
```

---

### Task 3: Main-process wiring (IPC, tray, setup window)

**Files:**
- Create: `share/index.js`, `gdrive-setup.html`
- Modify: `main.js` (imports line 1-2, `setupTray` lines 35-46, append IPC at end), `preload.js`

**Interfaces:**
- Consumes: `createSettings`, `catbox.upload`, `createGdrive`, `gdrive-auth.authorize`.
- Produces: IPC `SHARE_IMAGE` (invoke, arg: PNG data URL) → `{ ok: true, url } | { ok: false, error }`; `window.electronAPI.shareImage(dataUrl)`; `window.electronAPI.saveGdriveConfig({clientId, clientSecret})`.

- [ ] **Step 1: Create `share/index.js`**

```js
const { app, safeStorage, shell } = require('electron');
const { createSettings } = require('../settings');
const catbox = require('./catbox');
const { createGdrive } = require('./gdrive');
const { authorize } = require('./gdrive-auth');

const settings = createSettings(app.getPath('userData'));

const gdrive = createGdrive({
  getConfig: () => {
    const s = settings.get();
    let refreshToken = null;
    if (s.gdriveRefreshToken) {
      try { refreshToken = safeStorage.decryptString(Buffer.from(s.gdriveRefreshToken, 'base64')); } catch { /* re-auth */ }
    }
    return { clientId: s.gdriveClientId, clientSecret: s.gdriveClientSecret, refreshToken };
  },
  saveRefreshToken: (t) =>
    settings.set({ gdriveRefreshToken: t ? safeStorage.encryptString(t).toString('base64') : null }),
  authorize: (cfg) => authorize(cfg, (url) => shell.openExternal(url)),
});

async function share(buffer) {
  const { host } = settings.get();
  return host === 'gdrive' ? gdrive.upload(buffer) : catbox.upload(buffer);
}

module.exports = { share, settings };
```

- [ ] **Step 2: Create `gdrive-setup.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Set up Google Drive</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; background:#12141c; color:#e6e8ef; padding:20px; }
    label { display:block; margin:12px 0 4px; font-size:13px; color:#9aa0b4; }
    input { width:100%; box-sizing:border-box; padding:8px; border-radius:6px; border:1px solid #2a2e3d; background:#1b1e2b; color:#fff; }
    button { margin-top:16px; padding:8px 16px; border:0; border-radius:6px; background:#4F8EF7; color:#fff; cursor:pointer; }
    small { color:#9aa0b4; }
  </style>
</head>
<body>
  <h3>Google Drive setup</h3>
  <small>Create an OAuth "Desktop app" client in Google Cloud Console (Drive API enabled), then paste its credentials. See README.</small>
  <label for="cid">Client ID</label><input id="cid" />
  <label for="sec">Client secret</label><input id="sec" type="password" />
  <button id="save">Save</button>
  <script>
    document.getElementById('save').addEventListener('click', () => {
      window.electronAPI.saveGdriveConfig({
        clientId: document.getElementById('cid').value.trim(),
        clientSecret: document.getElementById('sec').value.trim(),
      });
    });
  </script>
</body>
</html>
```

- [ ] **Step 3: Modify `preload.js`** — inside the exposed object, after `openEditor` line, add:

```js
  shareImage: (dataUrl) => ipcRenderer.invoke('SHARE_IMAGE', dataUrl),
  saveGdriveConfig: (cfg) => ipcRenderer.send('SAVE_GDRIVE_CONFIG', cfg),
```

- [ ] **Step 4: Modify `main.js`**

Line 1 — add `clipboard, dialog` to the electron import:
```js
const { app, globalShortcut, BrowserWindow, desktopCapturer, screen, ipcMain, Tray, Menu, nativeImage, clipboard, dialog } = require('electron');
```
After line 2 (`const path = require('path');`) add:
```js
const { share, settings } = require('./share');
```
Replace the `setupTray` function (lines 35-46) with:
```js
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
    { label: 'Set up Google Drive…', click: openGdriveSetup },
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
```
Append at the end of `main.js`:
```js
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
```

- [ ] **Step 5: Verify app starts**

Run: `npm start` (then quit from tray)
Expected: tray icon appears with "Share host" submenu and "Set up Google Drive…"; no errors in terminal.

- [ ] **Step 6: Commit**

```bash
git add share/index.js gdrive-setup.html main.js preload.js
git commit -m "feat: wire share IPC, tray host menu, and Drive setup window"
```

---

### Task 4: Editor Share Link button

**Files:**
- Modify: `editor/editor.html` (after the `btnCopy` button, line 141), `editor/editor.js` (add handler after `btnCopy` listener ending line 619; shortcut in keydown near line 545), `editor/editor.css` (append)

**Interfaces:**
- Consumes: `window.electronAPI.shareImage(dataUrl) -> {ok, url|error}`, existing `getFlattenedCanvas()`, `commitText()`, `showToast()`.

- [ ] **Step 1: `editor.html`** — insert after the Copy button (after line 141):

```html
      <button class="export-btn secondary" id="btnShare" title="Upload and copy share link (Ctrl+L)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5"/></svg>
        Share Link
      </button>
```

- [ ] **Step 2: `editor.js`** — after the `btnCopy` listener (after line 619) add:

```js
const btnShare = document.getElementById('btnShare');
btnShare.addEventListener('click', async () => {
  if (btnShare.disabled) return;
  if (state.textActive) commitText();
  btnShare.disabled = true;
  btnShare.classList.add('loading');
  try {
    const res = await window.electronAPI.shareImage(getFlattenedCanvas().toDataURL('image/png'));
    if (res.ok) showToast('🔗 Link copied to clipboard!', 'success');
    else showToast('❌ ' + res.error, 'error');
  } catch (err) {
    showToast('❌ Failed to share', 'error');
    console.error(err);
  } finally {
    btnShare.disabled = false;
    btnShare.classList.remove('loading');
  }
});
```
In the keydown handler, after the Ctrl+C block (after line 545) add:
```js
  // Ctrl+L — upload and copy share link
  if (ctrl && e.key === 'l' && !state.textActive) {
    e.preventDefault();
    document.getElementById('btnShare').click();
    return;
  }
```

- [ ] **Step 3: `editor.css`** — append:

```css
.export-btn.loading { opacity: 0.6; pointer-events: none; }
.export-btn.loading svg { animation: jsnaps-spin 1s linear infinite; }
@keyframes jsnaps-spin { to { transform: rotate(360deg); } }
```

- [ ] **Step 4: Manual verification (Catbox)**

Run: `npm start`, press `Ctrl+Shift+S`, select an area, click **Share Link**.
Expected: first-use notice appears → click Upload → spinner → toast "Link copied". Paste the clipboard into a private browser window: the image loads.
Also check: `Ctrl+L` triggers the same; with Wi‑Fi off the toast shows an error and the clipboard is unchanged.

- [ ] **Step 5: Manual verification (Google Drive)**

Follow README setup (Task 5), tray → Share host → Google Drive, click Share Link.
Expected: browser opens for consent → "connected" page → toast "Link copied". Open the link in a private window: Drive viewer shows the image; a "JSnaps" folder exists in Drive. A second share does not prompt sign-in again.

- [ ] **Step 6: Commit**

```bash
git add editor/editor.html editor/editor.js editor/editor.css
git commit -m "feat: add Share Link button and Ctrl+L shortcut to editor"
```

---

### Task 5: README docs

**Files:**
- Modify: `README.md` (Features list after line 65; new section before "## Tech Stack" at line 93)

- [ ] **Step 1: Add feature bullet** after line 65:

```markdown
- 🔗 **Share Link:** Upload the annotated image and copy a link (`Ctrl+L`) — paste it into reports instead of embedding images. Hosts: Catbox (default, public, no setup) or your own Google Drive.
```

- [ ] **Step 2: Add section** before `## Tech Stack`:

```markdown
## Share Link Setup

**Catbox (default):** no setup. Links are public and permanent — anyone with the link can view the image. Use the Blur tool on sensitive info first.

**Google Drive (optional):**
1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Google Drive API**.
2. Configure the OAuth consent screen. Set publishing status to **In production** to avoid the 7-day sign-in expiry (an "unverified app" warning is normal for personal use).
3. Create credentials → **OAuth client ID** → application type **Desktop app**.
4. Tray icon → **Set up Google Drive…** → paste the Client ID and secret → Save.
5. Click **Share Link**; sign in once in the browser. Images go to a `JSnaps` folder and are set to "anyone with the link can view".

Switch hosts any time from tray → **Share host**.
```

- [ ] **Step 3: Run all tests, then commit**

Run: `npm test`
Expected: 8 tests PASS.

```bash
git add README.md
git commit -m "docs: document Share Link and Google Drive setup"
```
