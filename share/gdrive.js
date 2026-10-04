const API = 'https://www.googleapis.com';
const FOLDER_NAME = 'JSnaps';

function createGdrive({ fetchImpl = fetch, getConfig, saveRefreshToken, authorize }) {
  function requireConfig() {
    const cfg = getConfig();
    if (!cfg.clientId || !cfg.clientSecret) {
      throw new Error('Google Drive is not set up in this build. Use tray menu > Advanced: use my own credentials…');
    }
    return cfg;
  }

  async function accessToken() {
    const cfg = requireConfig();
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

  async function signIn() {
    saveRefreshToken(await authorize(requireConfig()));
    const token = await accessToken();
    await ensureFolder(token);
  }

  async function signOut() {
    const { refreshToken } = getConfig();
    if (refreshToken) {
      try {
        await fetchImpl(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
          method: 'POST',
          signal: AbortSignal.timeout(10000),
        });
      } catch { /* offline: still sign out locally */ }
    }
    saveRefreshToken(null);
  }

  return { upload, signIn, signOut };
}

module.exports = { createGdrive };
