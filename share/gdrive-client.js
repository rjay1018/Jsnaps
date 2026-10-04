const fs = require('fs');
const path = require('path');

// Loads built-in Google OAuth Desktop client credentials.
// On dev machines, this reads from share/gdrive-config.json (gitignored).
function loadBuiltin() {
  const configFile = path.join(__dirname, 'gdrive-config.json');
  try {
    if (fs.existsSync(configFile)) {
      const data = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (data.clientId && data.clientSecret) {
        return { clientId: data.clientId.trim(), clientSecret: data.clientSecret.trim() };
      }
    }
  } catch (err) {
    console.error('Failed to load gdrive-config.json:', err);
  }
  return {
    clientId: '',
    clientSecret: '',
  };
}

const builtin = loadBuiltin();

// A user-supplied pair (tray > Advanced) overrides the built-in client.
function resolveCredentials(settings, defaults = builtin) {
  if (settings.gdriveClientId && settings.gdriveClientSecret) {
    return { clientId: settings.gdriveClientId, clientSecret: settings.gdriveClientSecret };
  }
  return { clientId: defaults.clientId, clientSecret: defaults.clientSecret };
}

module.exports = { builtin, resolveCredentials, loadBuiltin };
