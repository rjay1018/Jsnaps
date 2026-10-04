const test = require('node:test');
const assert = require('node:assert');
const { authorize } = require('../share/gdrive-auth');

test('authorize opens loopback server, receives code, and exchanges for refresh_token', async () => {
  const fetchImpl = async (url, opts) => {
    assert.strictEqual(url, 'https://oauth2.googleapis.com/token');
    assert.strictEqual(opts.method, 'POST');
    return {
      ok: true,
      json: async () => ({ refresh_token: 'MOCK_REFRESH_TOKEN', access_token: 'MOCK_ACCESS' }),
    };
  };

  const openExternal = async (authUrl) => {
    const u = new URL(authUrl);
    const redirectUri = u.searchParams.get('redirect_uri');
    assert.ok(redirectUri.startsWith('http://127.0.0.1:'));
    // Simulate Google redirecting back to our loopback server
    const res = await fetch(`${redirectUri}?code=MOCK_CODE`);
    const text = await res.text();
    assert.ok(text.includes('connected'));
  };

  const token = await authorize(
    { clientId: 'test-client-id', clientSecret: 'test-client-secret' },
    openExternal,
    { fetchImpl }
  );

  assert.strictEqual(token, 'MOCK_REFRESH_TOKEN');
});
