# 🚀 J'Snaps v1.1.0 — Share Link & Dynamic Responsive Editor

We're excited to release **J'Snaps v1.1.0**! This update introduces one-click cloud link sharing, seamless Google Drive integration, dynamic window sizing, and a fully responsive adaptive toolbar.

---

## ✨ What's New

### 🔗 1-Click "Share Link" (Never paste & stretch images in reports again)
- Instead of manually copy-pasting images into Excel, Google Docs, or Word and struggling with image resizing, you can now generate an instant shareable link.
- Click **Share Link** in the editor or press **`Ctrl+L`**.
- Your annotated snapshot is uploaded in the background, and the link is automatically copied to your clipboard with a confirmation toast.

### ☁️ Dual Hosting Providers: Catbox & Google Drive
Switch hosts anytime from the system tray menu under **Share host**:
- **Catbox (Default)**:
  - Zero-configuration and completely anonymous.
  - Generates direct image URLs (`https://files.catbox.moe/...png`) that embed cleanly in documents and web pages.
  - Permanent file lifetime.
- **Google Drive**:
  - Connect with **1-click Google Sign-in** directly from the system tray.
  - Automatically creates a dedicated **`JSnaps`** folder in your Google Drive on connect.
  - All shared screenshots are organized inside that folder with link-sharing enabled (`anyone with link can view`).
  - Strict privacy: J'Snaps uses the `drive.file` scope and cannot access any of your other Google Drive files.
  - Disconnect anytime via **"Sign out of Google Drive"** to revoke access and delete local tokens.

### 📐 Dynamic Window Sizing
- The editor window is no longer locked to a fixed 1200x800 resolution.
- It dynamically adapts to your monitor's display resolution and the dimensions of your capture, giving your annotations maximum breathing room.
- Automatically centered with intelligent minimum and maximum bounds.

### 🎨 Responsive Adaptive Toolbar
- Over 18 controls (tools, swatches, sizes, blur slider, undo/redo, export buttons) now fit seamlessly at any window width:
  - **Wide screens (≥ 1360px)**: Full tool labels and button text.
  - **Medium screens (< 1360px)**: Automatically switches to crisp icon-only mode with shortcut tooltips.
  - **Narrow screens (< 1080px)**: Compact spacing with icon-only export buttons.
  - **Overflow protection**: Smooth horizontal scrolling ensures buttons are never squashed, clipped, or unreachable.

---

## 🔒 Privacy & Security
- **Local credential protection**: Tokens are encrypted using Electron's `safeStorage` (Windows DPAPI).
- **Public Privacy Policy**: Official [Privacy Policy](https://github.com/rjay1018/Jsnaps/blob/main/PRIVACY.md) adhering to Google API Services User Data Policy.

---

## 🛠️ Installation
1. Download **`JSnaps Setup 1.1.0.exe`** from the release assets below.
2. Run the installer to install or upgrade J'Snaps.
3. Use global hotkey **`Ctrl+Shift+S`** anywhere on your PC to start snapping!
