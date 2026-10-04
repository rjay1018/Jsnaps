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

test('signIn authorizes, saves refresh token, and creates/ensures folder', async () => {
  const { impl, calls } = mockFetch();
  let saved;
  const g = createGdrive({
    fetchImpl: impl,
    getConfig: cfg({ refreshToken: null }),
    saveRefreshToken: (t) => { saved = t; },
    authorize: async () => 'NEWRT',
  });
  await g.signIn();
  assert.strictEqual(saved, 'NEWRT');
  assert.ok(calls.some((c) => c.url.includes('/drive/v3/files')));
});

test('signIn throws when not configured', async () => {
  const g = createGdrive({ fetchImpl: async () => {}, getConfig: () => ({}), saveRefreshToken() {}, authorize: async () => 'x' });
  await assert.rejects(g.signIn(), /not set up/);
});

test('signOut revokes the token and clears it', async () => {
  const urls = [];
  let saved = 'unset';
  const g = createGdrive({
    fetchImpl: async (url) => { urls.push(String(url)); return { ok: true }; },
    getConfig: cfg(),
    saveRefreshToken: (t) => { saved = t; },
    authorize: async () => 'x',
  });
  await g.signOut();
  assert.ok(urls[0].startsWith('https://oauth2.googleapis.com/revoke?token=RT'));
  assert.strictEqual(saved, null);
});

test('signOut still clears the token when offline', async () => {
  let saved = 'unset';
  const g = createGdrive({
    fetchImpl: async () => { throw new Error('offline'); },
    getConfig: cfg(),
    saveRefreshToken: (t) => { saved = t; },
    authorize: async () => 'x',
  });
  await g.signOut();
  assert.strictEqual(saved, null);
});
