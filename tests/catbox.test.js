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
