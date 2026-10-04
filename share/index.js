const { app, safeStorage, shell } = require('electron');
const { createSettings } = require('../settings');
const catbox = require('./catbox');
const { createGdrive } = require('./gdrive');
const { authorize } = require('./gdrive-auth');
const { resolveCredentials } = require('./gdrive-client');

const settings = createSettings(app.getPath('userData'));

function encryptToken(token) {
  if (!token) return null;
  if (safeStorage && safeStorage.isEncryptionAvailable && safeStorage.isEncryptionAvailable()) {
    try {
      return 'enc:' + safeStorage.encryptString(token).toString('base64');
    } catch (e) {
      console.error('safeStorage encrypt error:', e);
    }
  }
  return 'b64:' + Buffer.from(token).toString('base64');
}

function decryptToken(stored) {
  if (!stored) return null;
  if (stored.startsWith('enc:') && safeStorage && safeStorage.isEncryptionAvailable && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(stored.slice(4), 'base64'));
    } catch (e) {
      console.error('safeStorage decrypt error:', e);
    }
  }
  if (stored.startsWith('b64:')) {
    return Buffer.from(stored.slice(4), 'base64').toString('utf8');
  }
  if (safeStorage && safeStorage.isEncryptionAvailable && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(stored, 'base64'));
    } catch {}
  }
  try {
    return Buffer.from(stored, 'base64').toString('utf8');
  } catch {}
  return null;
}

const gdrive = createGdrive({
  getConfig: () => {
    const s = settings.get();
    const refreshToken = decryptToken(s.gdriveRefreshToken);
    return { ...resolveCredentials(s), refreshToken };
  },
  saveRefreshToken: (t) => {
    settings.set({ gdriveRefreshToken: encryptToken(t) });
  },
  authorize: (cfg) => authorize(cfg, (url) => shell.openExternal(url)),
});

async function share(buffer) {
  const { host } = settings.get();
  return host === 'gdrive' ? gdrive.upload(buffer) : catbox.upload(buffer);
}

module.exports = { share, settings, signInGdrive: gdrive.signIn, signOutGdrive: gdrive.signOut };
