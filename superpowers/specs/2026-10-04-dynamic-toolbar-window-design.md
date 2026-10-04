# Dynamic Window & Responsive Toolbar — Design Spec

## Goal
Make the J'Snaps editor window adaptively sized based on the user's screen and capture dimensions, and make the editor toolbar fully responsive so all tools, colors, and export actions remain visible and accessible at any window width without clipping or overflowing off-screen.

## Current Problems
1. **Hardcoded Window Size**: `editorWindow` opens at a fixed `1200x800` regardless of the monitor resolution or the size of the captured area.
2. **Toolbar Cutoff**: Over 18 controls exist in the top toolbar. On window widths under ~1350px, controls on the right (like Download, Share Link, or Color/Size pickers) get pushed off-screen or squished.

## Specification

### 1. Dynamic Window Sizing (`main.js`)
When `OPEN_EDITOR` receives `{ dataUrl, rect: { x, y, w, h, dpr } }`:
- Query current display work area using `screen.getDisplayNearestPoint({ x, y })` or `screen.getPrimaryDisplay().workArea`.
- Calculate target dimensions:
  - Display width: `Math.round(w / (dpr || 1))`
  - Display height: `Math.round(h / (dpr || 1))`
  - Ideal Window Width: `Math.max(1280, Math.min(displayWidth + 100, Math.round(workArea.width * 0.95)))`
  - Ideal Window Height: `Math.max(750, Math.min(displayHeight + 140, Math.round(workArea.height * 0.92)))`
- Set `minWidth: 850`, `minHeight: 550`, `center: true`.
- Keep `autoHideMenuBar: true`.

### 2. Responsive Adaptive Toolbar (`editor/editor.css`, `editor/editor.html`)
- Wrap text inside export buttons with `<span>` tags (e.g. `<span>Copy</span>`, `<span>Share Link</span>`, `<span>Download</span>`) so they can be responsively toggled alongside icons.
- Responsive breakpoints:
  - **At ≤ 1360px**:
    - Hide text labels on tool buttons (`.tool-btn span { display: none; }`).
    - Keep icons, active states, and tooltips (`title`).
    - Tighten padding on `.tool-group` and `.tool-btn`.
    - Reduce gap between color swatches.
  - **At ≤ 1080px**:
    - Hide `.brand-name`, showing only `.brand-icon`.
    - Hide text inside `.export-btn span`, showing icon only.
    - Reduce divider margins.
  - **Overflow Safety**:
    - `#toolbar` gets `overflow-x: auto; overflow-y: hidden;` with a minimal dark scrollbar.
    - Groups have `flex-shrink: 0` so icons never get deformed or crushed.

### 3. Verification & Testing
- Unit test for the window calculation helper function.
- Visual check at varying viewport widths (850px, 1100px, 1300px, 1600px).
- Verify hotkey shortcuts still display on hover tooltips.
