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
