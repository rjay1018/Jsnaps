const http = require('http');
const crypto = require('crypto');

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Opens the browser for Google sign-in and resolves with a refresh token.
function authorize({ clientId, clientSecret }, openExternal, { fetchImpl = fetch } = {}) {
  return new Promise((resolve, reject) => {
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    let redirectUri = '';
    let serverClosed = false;

    const closeServer = () => {
      if (!serverClosed) {
        serverClosed = true;
        server.close();
      }
    };

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const code = url.searchParams.get('code');
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Waiting for sign-in or authorization code missing…');
        return;
      }
      clearTimeout(timer);

      try {
        const tokenRes = await fetchImpl('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            code_verifier: verifier,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });
        const body = await tokenRes.json();
        if (!tokenRes.ok || !body.refresh_token) {
          const errMsg = body.error_description || body.error || 'Google sign-in failed (no refresh token returned)';
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(`Sign-in failed: ${errMsg}`);
          closeServer();
          reject(new Error(errMsg));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end("J'Snaps is connected to Google Drive! You can close this tab.");
        closeServer();
        resolve(body.refresh_token);
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Error connecting to Google: ${e.message}`);
        closeServer();
        reject(e);
      }
    });

    const timer = setTimeout(() => {
      closeServer();
      reject(new Error('Google sign-in timed out (2 minutes)'));
    }, 120000);

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      redirectUri = `http://127.0.0.1:${port}`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/drive.file',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
        prompt: 'select_account consent',
      });
      openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    });
  });
}

module.exports = { authorize };
