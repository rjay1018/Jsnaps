# J'Snaps

A lightning-fast, native desktop screenshot and annotation tool built with Electron.

J'Snaps brings the seamless "Lightshot" experience to your desktop. With a single global hotkey, you can silently freeze your entire screen, select an area, and instantly open a powerful, beautifully designed image editor to annotate and share your snapshot.

## Screenshots

### 1. 🎯 Screen Freeze & Area Selection
> Press `Ctrl+Shift+S` — the screen freezes instantly. Drag to select your capture area with pixel-precision.

![Screen Freeze & Selection](docs/screenshots/01_screen_freeze.png)

---

### 2. 🖼️ Full Editor Overview
> A powerful, fully-featured annotation canvas with all tools ready to use.

![Editor Overview](docs/screenshots/02_editor_overview.png)

---

### 3. ✏️ Pen, Line & Arrow Tools
> Freehand drawing, straight lines, and arrows with filled arrowheads for pointing out UI elements.

![Pen Line Arrow](docs/screenshots/03_pen_line_arrow.png)

---

### 4. 🔲 Rectangle & Ellipse Shapes
> Highlight, frame, or circle any part of your screenshot with clean rounded shapes.

![Shapes](docs/screenshots/04_shapes.png)

---

### 5. 🔤 Text Annotations & Step Counters
> Add text labels anywhere on the image. Use numbered step markers to guide users through a workflow.

![Text and Steps](docs/screenshots/05_text_steps.png)

---

### 6. 🌫️ Blur / Redact Tool
> Drag over any region to instantly blur sensitive information — passwords, emails, personal data.

![Blur Redact](docs/screenshots/06_blur_redact.png)

---

### 7. 📋 Copy & Download Export
> One-click copy to clipboard or download as a PNG — ready to paste into Slack, Notion, Jira, or anywhere.

![Export](docs/screenshots/07_export.png)

## Features
- 🚀 **Global Hotkey:** Press `Ctrl+Shift+S` anywhere on your computer to instantly freeze the screen.
- 🤫 **Silent Capture:** Native desktop screenshot integration without any browser prompts or pop-ups.
- 🎨 **Premium Editor:** A sleek, fully featured canvas editor that includes:
  - Pen, Line, Arrow, Rectangle, and Ellipse tools.
  - Text annotations.
  - Step counter markers.
  - 🌫️ **Blur / Redact tool** — drag over any region to blur sensitive info (passwords, emails, etc.). Adjustable intensity slider (4–40px). Shortcut: `B`.
  - Full Undo/Redo history support.
- 📋 **Seamless Export:** Copy directly to your clipboard or download as a PNG.

## Installation & Usage

1. **Install Dependencies**
   Make sure you have Node.js installed, then run:
   ```bash
   npm install
   ```

2. **Run in Development Mode**
   ```bash
   npm start
   ```

3. **Build the Windows Installer**
   To package J'Snaps into an official Windows Installer (Setup.exe):
   ```bash
   npm run build
   ```
   This will generate a `JSnaps Setup 1.0.0.exe` file inside the `installer` folder. You can distribute this setup file to install the app perfectly on any Windows machine.

4. **How to use**
   - Once running, J'Snaps sits silently in your Windows system tray.
   - Press **`Ctrl+Shift+S`** to trigger a screen capture.
   - Drag to select the area you want to capture.
   - The Editor will instantly open with your selection ready for annotation.

## Tech Stack
- **Electron** (Backend, IPC, Desktop Capturer, Global Shortcuts)
- **HTML5 Canvas** (Overlay freezing, image cropping, and editor rendering)
- **Vanilla JavaScript & CSS** (Zero bloated frameworks, maximum performance)
