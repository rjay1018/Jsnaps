# Privacy Policy for J'Snaps

*Last updated: October 8, 2026*

This Privacy Policy describes how **J'Snaps** ("we", "our", or "the application") handles your data when you use the J'Snaps desktop application.

---

## 1. Overview & Core Principles

J'Snaps is a native desktop screenshot and annotation tool designed with privacy in mind:
- **No telemetry or tracking**: J'Snaps does not collect, track, or sell your personal data, browsing history, or analytics.
- **Local processing**: Screenshots, crops, annotations, and drawings remain entirely on your local machine until you choose to export or share them.

---

## 2. Google Drive Integration & Google API Data

When you choose to sign in to Google Drive in J'Snaps, the application requests the following permission:

- **Scope**: `https://www.googleapis.com/auth/drive.file`
- **What this scope does**: It allows J'Snaps to view and manage **only** the files and folders created by J'Snaps itself.

### How Google User Data is Handled:
1. **Access**: J'Snaps **cannot** see, read, edit, or delete any of your existing personal or workplace files in Google Drive. It can only access files and folders created by J'Snaps (such as the `JSnaps` folder).
2. **Usage**: J'Snaps only accesses your Google Drive when you click **Share Link** to upload your annotated screenshot and generate a viewable share link.
3. **Storage of Credentials**: Authentication tokens (OAuth refresh tokens) are stored locally on your device in an encrypted format using Electron's `safeStorage` (Windows DPAPI). Tokens are never sent to any external server or third party.
4. **No Third-Party Sharing**: We do not transfer, disclose, or sell Google user data to third parties. All communication occurs directly between your local J'Snaps client and Google's official APIs (`googleapis.com`).

### Google API Services User Data Policy Compliance
J'Snaps' use and transfer of information received from Google APIs to any other app will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

---

## 3. Alternative Hosting (Catbox)

If you select **Catbox** as your share host (the default mode):
- Screenshots uploaded to Catbox (`catbox.moe`) are uploaded as public image files.
- Anyone with the generated link can view the image.
- We strongly recommend using J'Snaps' built-in **Blur / Redact tool** (`B`) to conceal any passwords, personal identifying information, or sensitive data before sharing via public image links.

---

## 4. User Control & Data Deletion

- **Sign Out / Revoke Access**: You can disconnect your Google account from J'Snaps at any time by clicking **"Sign out of Google Drive"** in the system tray menu. This immediately revokes the token with Google and deletes it from your computer.
- **Manage Permissions via Google**: You can also revoke access directly through your Google Account security dashboard at [https://myaccount.google.com/permissions](https://myaccount.google.com/permissions).
- **File Deletion**: All uploaded files reside directly in your own Google Drive inside the `JSnaps` folder. You have 100% control to view, rename, move, or delete them at any time from your Google Drive.

---

## 5. Contact Information

If you have questions or concerns regarding this Privacy Policy or J'Snaps, please reach out via GitHub Issues:
- **Repository**: [https://github.com/rjay1018/Jsnaps](https://github.com/rjay1018/Jsnaps)
