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
