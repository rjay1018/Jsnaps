# Dynamic Window & Responsive Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the J'Snaps editor window dynamically sized based on capture dimensions and screen work area, and make the toolbar adaptively responsive so all tools, colors, and export buttons fit cleanly without clipping at any window width.

**Architecture:** 
- Extract window bounds calculation to `window-utils.js` to enable automated unit testing.
- Integrate dynamic window bounds into `main.js` `OPEN_EDITOR` handler using Electron `screen` workArea.
- Update `editor/editor.html` and `editor/editor.css` with responsive breakpoints (`≤1360px` and `≤1080px`) to collapse text labels into crisp icon-only mode and provide graceful horizontal overflow protection.

**Tech Stack:** Electron 42, Vanilla HTML5/CSS, `node --test`.

## Global Constraints

- No new npm dependencies.
- Preserve existing editor shortcuts (`Ctrl+L`, `Ctrl+C`, `Ctrl+Z`, `Ctrl+Y`, tool hotkeys).
- Toolbar buttons must never be deformed or squished to 0px width (`flex-shrink: 0`).
- Window bounds must respect display work area (max 95% width, max 92% height) and enforce a healthy minimum (`minWidth: 850`, `minHeight: 550`).
- All automated tests must pass on `npm test`.

---

### Task 1: Window Sizing Utility & Unit Tests

**Files:**
- Create: `window-utils.js`
- Create: `tests/window-utils.test.js`

**Interfaces:**
- Produces: `calculateEditorWindowBounds({ rect, workArea }) -> { width, height, minWidth, minHeight, center }`

- [ ] **Step 1: Write failing tests**

`tests/window-utils.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { calculateEditorWindowBounds } = require('../window-utils');

const workArea = { x: 0, y: 0, width: 1920, height: 1080 };

test('defaults to minimum comfortable bounds for small captures', () => {
  const bounds = calculateEditorWindowBounds({
    rect: { x: 100, y: 100, w: 200, h: 150, dpr: 1 },
    workArea,
  });
  assert.strictEqual(bounds.width, 1280);
  assert.strictEqual(bounds.height, 750);
  assert.strictEqual(bounds.minWidth, 850);
  assert.strictEqual(bounds.minHeight, 550);
  assert.strictEqual(bounds.center, true);
});

test('scales up for large captures while clamping to screen work area', () => {
  const bounds = calculateEditorWindowBounds({
    rect: { x: 0, y: 0, w: 2500, h: 2000, dpr: 1 },
    workArea,
  });
  assert.strictEqual(bounds.width, Math.round(1920 * 0.95));
  assert.strictEqual(bounds.height, Math.round(1080 * 0.92));
});

test('correctly accounts for devicePixelRatio', () => {
  const bounds = calculateEditorWindowBounds({
    rect: { x: 0, y: 0, w: 2800, h: 1800, dpr: 2 },
    workArea,
  });
  // 2800 / 2 = 1400 -> + 100 padding = 1500
  assert.strictEqual(bounds.width, 1500);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `node --test tests/window-utils.test.js`
Expected: FAIL (`MODULE_NOT_FOUND`).

- [ ] **Step 3: Implement `window-utils.js`**

```js
function calculateEditorWindowBounds({ rect = {}, workArea = { width: 1920, height: 1080 } }) {
  const dpr = rect.dpr || 1;
  const displayW = Math.round((rect.w || 800) / dpr);
  const displayH = Math.round((rect.h || 600) / dpr);

  const maxW = Math.round(workArea.width * 0.95);
  const maxH = Math.round(workArea.height * 0.92);

  const idealW = displayW + 100;
  const idealH = displayH + 140;

  const width = Math.min(maxW, Math.max(1280, idealW));
  const height = Math.min(maxH, Math.max(750, idealH));

  return {
    width,
    height,
    minWidth: 850,
    minHeight: 550,
    center: true,
  };
}

module.exports = { calculateEditorWindowBounds };
```

- [ ] **Step 4: Run test to verify pass**

Run: `node --test tests/window-utils.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add window-utils.js tests/window-utils.test.js
git commit -m "feat: add calculateEditorWindowBounds utility and unit tests"
```

---

### Task 2: Integrate Dynamic Bounds in `main.js`

**Files:**
- Modify: `main.js` (import `calculateEditorWindowBounds`, use in `OPEN_EDITOR`)

**Interfaces:**
- Consumes: `calculateEditorWindowBounds` from `window-utils.js`, `screen.getDisplayNearestPoint` or `screen.getPrimaryDisplay`.

- [ ] **Step 1: Update `main.js`**

Import at top of `main.js`:
```js
const { calculateEditorWindowBounds } = require('./window-utils');
```

Update `OPEN_EDITOR` handler:
```js
  const display = (data && data.rect)
    ? screen.getDisplayNearestPoint({ x: data.rect.x, y: data.rect.y })
    : screen.getPrimaryDisplay();
  const bounds = calculateEditorWindowBounds({
    rect: data ? data.rect : null,
    workArea: display.workArea,
  });

  const editorWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: bounds.minWidth,
    minHeight: bounds.minHeight,
    center: bounds.center,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
```

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: PASS (all 19 tests).

- [ ] **Step 3: Commit**

```bash
git add main.js
git commit -m "feat: dynamically calculate editor window size based on capture and screen"
```

---

### Task 3: Responsive Toolbar in HTML and CSS

**Files:**
- Modify: `editor/editor.html` (wrap text in `<span>` inside `#btnCopy`, `#btnDownload`)
- Modify: `editor/editor.css` (add media queries and overflow styling)

- [ ] **Step 1: Update `editor/editor.html`**

Ensure all export buttons have `<span>` wrappers:
```html
      <!-- Export -->
      <button class="export-btn secondary" id="btnCopy" title="Copy to clipboard (Ctrl+C)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        <span>Copy</span>
      </button>
      <button class="export-btn secondary" id="btnShare" title="Upload and copy share link (Ctrl+L)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5"/></svg>
        <span>Share Link</span>
      </button>
      <button class="export-btn primary" id="btnDownload" title="Download PNG">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>Download</span>
      </button>
```

- [ ] **Step 2: Update `editor/editor.css`**

Add horizontal scrolling support and flex protection to `#toolbar`:
```css
#toolbar {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.15) transparent;
}
#toolbar::-webkit-scrollbar {
  height: 3px;
}
#toolbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 3px;
}
.toolbar-left, .toolbar-right, .brand, .tool-group, .style-group, .export-btn {
  flex-shrink: 0;
}
```

Add adaptive breakpoints:
```css
@media (max-width: 1360px) {
  .tool-btn span {
    display: none;
  }
  .tool-btn {
    padding: 6px 8px;
  }
  .tool-group {
    padding: 3px;
    gap: 1px;
  }
  .color-swatches {
    gap: 3px;
  }
}

@media (max-width: 1080px) {
  .brand-name {
    display: none;
  }
  .export-btn span {
    display: none;
  }
  .export-btn {
    padding: 6px 10px;
  }
  .divider {
    margin: 0 2px;
  }
  .style-label {
    display: none;
  }
}
```

- [ ] **Step 3: Run all unit tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add editor/editor.html editor/editor.css
git commit -m "feat: make editor toolbar responsive with compact icon-only breakpoints"
```

---

### Task 4: Rebuild Installer & Verification

**Files:**
- Output: `installer/JSnaps Setup 1.1.0.exe`

- [ ] **Step 1: Build installer**

Run: `npm run build`
Expected: build completes with exit code 0.

- [ ] **Step 2: Verification**

Verify test suite passes and updated installer exists.
