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
