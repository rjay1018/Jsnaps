const test = require('node:test');
const assert = require('node:assert');
const { resolveCredentials } = require('../share/gdrive-client');

const builtin = { clientId: 'bid', clientSecret: 'bsec' };

test('uses built-in credentials when user has none', () => {
  assert.deepStrictEqual(
    resolveCredentials({ gdriveClientId: '', gdriveClientSecret: '' }, builtin),
    { clientId: 'bid', clientSecret: 'bsec' }
  );
});

test('user credentials override built-in ones', () => {
  assert.deepStrictEqual(
    resolveCredentials({ gdriveClientId: 'uid', gdriveClientSecret: 'usec' }, builtin),
    { clientId: 'uid', clientSecret: 'usec' }
  );
});

test('a half-filled user pair falls back to built-in', () => {
  assert.deepStrictEqual(
    resolveCredentials({ gdriveClientId: 'uid', gdriveClientSecret: '' }, builtin),
    { clientId: 'bid', clientSecret: 'bsec' }
  );
});
