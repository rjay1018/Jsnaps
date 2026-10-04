# J'Snaps — Technical Documentation & Machine Setup Guide

This guide covers everything you need to know when setting up, developing, configuring, or troubleshooting J'Snaps on a new computer.

---

## 1. Quick Start on a New Machine

### Prerequisites
- **Node.js**: v20 or v22+ recommended (built-in `fetch`, `FormData`, and `node --test`).
- **Windows 10/11**: J'Snaps is built as a native Windows desktop app.
- **Git**

### Installation Steps
```bash
# 1. Clone the repository
git clone https://github.com/rjay1018/Jsnaps.git
cd Jsnaps

# 2. Install dependencies
npm install

# 3. Configure Google Drive credentials (see Section 2 below)
cp share/gdrive-config.example.json share/gdrive-config.json
# Edit share/gdrive-config.json with your Client ID & Secret

# 4. Run automated test suite
npm test

# 5. Launch in Development Mode
npm start

# 6. Build the Production Windows Installer (.exe)
npm run build
```

The installer will be generated in `installer/JSnaps Setup <version>.exe`.

---

## 2. Google Drive Configuration & OAuth Setup

J'Snaps connects to Google Drive using a standard OAuth 2.0 Desktop Application loopback flow (`http://127.0.0.1:<random-port>`) with PKCE security.

### A. Local Configuration File (`share/gdrive-config.json`)
For security and privacy, actual client secrets are **git-ignored** and never committed to GitHub.
To configure on any machine:
1. In `share/`, create or copy `gdrive-config.json`:
   ```json
   {
     "clientId": "YOUR_CLIENT_ID.apps.googleusercontent.com",
     "clientSecret": "YOUR_CLIENT_SECRET"
   }
   ```
2. When you run `npm run build`, these credentials will be bundled into the application so end-users do not have to configure anything.

### B. Google Cloud Console Settings
If you ever need to create or inspect the Google OAuth client:
1. **Google Cloud Console**: Go to [https://console.cloud.google.com/](https://console.cloud.google.com/).
2. **Enable API**: APIs & Services → Library → Search and enable **Google Drive API**.
3. **OAuth Consent Screen**:
   - **User Type**: External.
   - **Scopes**: Only `https://www.googleapis.com/auth/drive.file` (non-sensitive scope, allowing access only to files created by J'Snaps).
   - **Publishing Status**:
     - **Testing**: Requires adding user emails under **Test Users** (e.g., `rjay1018@gmail.com`).
     - **In Production**: Allows anyone to sign in immediately (shows standard "Google hasn't verified this app" warning where users click Advanced → Proceed).
4. **Credentials**:
   - Create Credentials → **OAuth client ID**.
   - Application Type: **Desktop app**.
   - Copy the Client ID and Secret into `share/gdrive-config.json`.

### C. Automatic Folder Creation
- When any user connects to Google Drive via the tray menu (**"Sign in with Google Drive"**), J'Snaps immediately checks if a folder named `JSnaps` exists in their Google Drive.
- If it doesn't exist, it creates the `JSnaps` folder right away.
- All screenshots shared via **Share Link** (`Ctrl+L`) are uploaded inside this `JSnaps` folder with link-sharing enabled (`anyone with link: reader`).

---

## 3. Image Hosting Providers

J'Snaps supports two hosting modes, switchable from the tray menu under **Share host**:

| Feature | Catbox (Default) | Google Drive |
|---|---|---|
| **Setup required** | Zero config, works immediately | One-time sign-in in browser |
| **Privacy** | Public hosting service | User's personal Google Drive |
| **Storage location** | `files.catbox.moe/<id>.png` | User's `JSnaps` folder |
| **Link type** | Direct image URL (renders inline in sheets/docs) | Drive viewer web link |
| **Lifetime** | Permanent | Permanent (controlled by user) |

---

## 4. Architecture & Key Files

```text
├── main.js                   # Electron main process, tray menu, global shortcut, screen capture, IPC handlers
├── preload.js                # Context bridge exposing safe IPC methods to renderer windows
├── settings.js               # JSON store in %APPDATA% for user preferences (host, encrypted tokens)
├── gdrive-setup.html         # Optional user override dialog (Tray > Advanced: use my own credentials)
├── package.json              # App metadata, dependencies, scripts: test, start, build
│
├── editor/                   # Screenshot Annotation Window
│   ├── editor.html           # Canvas layout, toolbar (Pen, Line, Arrow, Rect, Ellipse, Text, Steps, Blur)
│   ├── editor.js             # HTML5 Canvas drawing engine, undo/redo history, export & Share Link handlers
│   └── editor.css            # Dark mode styles, button states, spinner animations
│
├── share/                    # Cloud Hosting & Upload Modules
│   ├── index.js              # Dispatcher routing upload requests to selected host (Catbox or Drive)
│   ├── catbox.js             # Catbox REST uploader (multipart FormData with 30s timeout)
│   ├── gdrive.js             # Google Drive API client (token refresh, folder ensure, multipart upload)
│   ├── gdrive-auth.js        # OAuth 2.0 PKCE loopback server on 127.0.0.1
│   ├── gdrive-client.js      # Credential loader (reads share/gdrive-config.json with fallback)
│   └── gdrive-config.example.json # Template for credentials
│
├── tests/                    # Automated Unit Tests (Node built-in runner)
│   ├── catbox.test.js        # Catbox upload & error tests
│   ├── gdrive.test.js        # Google Drive folder, upload, token expiry & sign-out tests
│   ├── gdrive-auth.test.js   # OAuth loopback server & token exchange tests
│   ├── gdrive-client.test.js # Credential resolution & override tests
│   └── settings.test.js      # User settings persistence tests
│
└── docs/                     # Design specs, plans, screenshots, and guides
    ├── TECHNICAL.md          # (This file)
    └── superpowers/          # Specifications and architectural plans
```

---

## 5. Token Storage & Security

- **Encryption**: Tokens are encrypted using Electron's `safeStorage` (Windows DPAPI) with a base64 fallback.
- **Location**:
  - Development: `%APPDATA%\jsnaps-desktop\settings.json`
  - Installed app: `%APPDATA%\JSnaps\settings.json`
- **Sign Out**: Clicking **"Sign out of Google Drive"** in the tray menu calls Google's token revocation endpoint (`https://oauth2.googleapis.com/revoke?token=...`) and wipes the local refresh token.

---

## 6. Troubleshooting Common Issues

### Issue 1: Hotkey `Ctrl+Shift+S` Does Not Work
- **Cause**: Another application is currently holding `Ctrl+Shift+S` (e.g. ShareX, Lightshot, Snipping Tool, or a duplicate background JSnaps instance).
- **Fix**:
  1. Open PowerShell and check for duplicate processes:
     ```powershell
     Get-Process | Where-Object { $_.ProcessName -match 'JSnaps|electron' }
     ```
  2. Kill duplicates:
     ```powershell
     Stop-Process -Name 'JSnaps' -Force
     ```

### Issue 2: Google Sign-in Says "Access Blocked: App has not completed verification"
- **Cause**: Your Google Cloud project is in **Testing** mode and the logged-in email is not in the Test Users list.
- **Fix**:
  1. Go to Google Cloud Console → OAuth consent screen.
  2. Under **Test users**, click **+ ADD USERS** and add your Google email address.
  3. Or click **PUBLISH APP** to enable production mode for any user.

### Issue 3: Tests Fail on `npm test`
- Make sure you are using Node.js v20+ or v22+.
- Run tests directly with verbose reporting:
  ```bash
  node --test "tests/*.test.js"
  ```
