# Share Link — Design

## Goal
From the editor, one click uploads the annotated screenshot and copies a shareable URL to the clipboard, so users can paste a link into reports (Excel/Docs) instead of embedding the image.

## Hosts
- **Catbox (default):** anonymous `POST https://catbox.moe/user/api.php` (`reqtype=fileupload`, `fileToUpload`), permanent, returns a direct image URL. No account.
- **Google Drive (optional):** OAuth 2.0 desktop loopback flow, scope `drive.file`. Uploads to a "JSnaps" folder, sets permission `anyone` / `reader`, returns the `webViewLink`.

## Components
- `share/catbox.js` — `upload(buffer) -> url`. Uses Node `fetch`/`FormData`/`Blob`, `User-Agent: JSnaps/1.0`, 30s timeout via `AbortSignal.timeout`.
- `share/gdrive.js` — `upload(buffer) -> url`. Handles auth (loopback server on a random port, PKCE), token refresh, folder lookup/creation, multipart upload, permission. Refresh token stored via Electron `safeStorage` in `userData`. No new dependencies (REST via `fetch`).
- `share/index.js` — reads settings, dispatches to the selected host, returns `{ url }` or throws.
- `settings.js` — read/write `settings.json` in `app.getPath('userData')`: `{ host: 'catbox'|'gdrive', gdriveClientId, gdriveClientSecret, catboxNoticeAccepted }`.
- `main.js` — IPC `SHARE_IMAGE` (handle): receives PNG data URL, calls `share/index.js`, writes URL to clipboard, returns `{ ok, url | error }`. Tray menu gains **Share host** submenu (Catbox / Google Drive) and **Set up Google Drive…** (small window to enter client ID/secret).
- `preload.js` — expose `shareImage(dataUrl)`.
- `editor/` — **Share Link** button (shortcut `Ctrl+L`) next to Copy/Download; spinner while uploading; toast "Link copied" or error message.

## Flow
1. User clicks Share Link → editor exports canvas to PNG data URL.
2. Renderer calls `shareImage`; main decodes to Buffer and uploads to the selected host.
3. Main copies URL to clipboard; renderer shows toast.

## Errors
- Offline / non-2xx / timeout → error toast, nothing copied.
- Drive not configured or auth expired → toast with prompt to set up / re-authenticate. **No silent fallback to Catbox** (privacy).
- First Catbox use → one-time notice that the image will be public (`catboxNoticeAccepted`).

## Privacy notes
Catbox links are public to anyone with the URL. README documents this and recommends the Blur tool first.

## Testing
- Unit tests (node `--test`) for `catbox.js` and `gdrive.js` with mocked `fetch`.
- Manual end-to-end: upload via each host, open the link in a private window.

## Out of scope
Link history, link expiry, deleting uploads, other hosts.
