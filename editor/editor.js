/**
 * J'Snaps Editor — editor.js
 * Full canvas-based annotation editor
 */

'use strict';

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  tool: 'pointer',
  color: '#EF4444',
  lineWidth: 2,
  stepCounter: 1,
  isDrawing: false,
  startX: 0, startY: 0,
  history: [],  // Array of ImageData
  historyIndex: -1,
  MAX_HISTORY: 50,
  textActive: false,
  textX: 0, textY: 0,
  pendingShape: null,  // For live preview
  blurRadius: 16,
};

// ── DOM References ────────────────────────────────────────────────────────────
const baseCanvas = document.getElementById('baseCanvas');
const drawCanvas = document.getElementById('drawCanvas');
const baseCtx = baseCanvas.getContext('2d');
const drawCtx = drawCanvas.getContext('2d');
const canvasContainer = document.getElementById('canvasContainer');
const canvasWrap = document.getElementById('canvasWrap');
const textInputWrap = document.getElementById('textInputWrap');
const textInput = document.getElementById('textInput');
const stepCounterWrap = document.getElementById('stepCounterWrap');
const stepBadge = document.getElementById('stepBadge');
const toast = document.getElementById('toast');
const loadingScreen = document.getElementById('loadingScreen');
const btnUndo = document.getElementById('btnUndo');
const btnRedo = document.getElementById('btnRedo');
const blurIntensityWrap = document.getElementById('blurIntensityWrap');
const blurSlider = document.getElementById('blurSlider');
const blurValue = document.getElementById('blurValue');

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const data = await window.electronAPI.getEditorData();
  if (!data || !data.dataUrl) {
    showLoadingError('No capture data found. Please try again.');
    return;
  }
  loadImage(data.dataUrl, data.rect);
}

function showLoadingError(msg) {
  const lc = loadingScreen.querySelector('.loader-content');
  lc.innerHTML = `<div style="font-size:32px">⚠️</div><p style="color:#EF4444">${msg}</p>`;
}

function loadImage(dataUrl, rect) {
  const img = new Image();
  img.onload = () => {
    // Crop region
    const { x, y, w, h, dpr = 1 } = rect;

    // Set canvas dimensions
    const displayW = Math.round(w / dpr);
    const displayH = Math.round(h / dpr);

    baseCanvas.width = displayW;
    baseCanvas.height = displayH;
    drawCanvas.width = displayW;
    drawCanvas.height = displayH;

    // Draw cropped region onto base canvas
    baseCtx.drawImage(img, x, y, w, h, 0, 0, displayW, displayH);

    // Push initial history state
    saveHistory();

    // Hide loading screen
    loadingScreen.classList.add('fade-out');
    setTimeout(() => loadingScreen.remove(), 500);
  };
  img.onerror = () => showLoadingError('Failed to load captured image.');
  img.src = dataUrl;
}

// ── History ───────────────────────────────────────────────────────────────────
function saveHistory() {
  // Trim forward history
  state.history = state.history.slice(0, state.historyIndex + 1);
  const snapshot = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
  state.history.push(snapshot);
  if (state.history.length > state.MAX_HISTORY) state.history.shift();
  else state.historyIndex++;
  updateHistoryButtons();
}

function undo() {
  if (state.historyIndex <= 0) return;
  state.historyIndex--;
  drawCtx.putImageData(state.history[state.historyIndex], 0, 0);
  updateHistoryButtons();
}

function redo() {
  if (state.historyIndex >= state.history.length - 1) return;
  state.historyIndex++;
  drawCtx.putImageData(state.history[state.historyIndex], 0, 0);
  updateHistoryButtons();
}

function updateHistoryButtons() {
  btnUndo.disabled = state.historyIndex <= 0;
  btnRedo.disabled = state.historyIndex >= state.history.length - 1;
}

// ── Drawing Helpers ───────────────────────────────────────────────────────────
function setupCtx(ctx, { color, lineWidth, fill } = {}) {
  ctx.strokeStyle = color || state.color;
  ctx.fillStyle = color || state.color;
  ctx.lineWidth = lineWidth || state.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function drawArrow(ctx, fromX, fromY, toX, toY) {
  const headlen = Math.max(12, state.lineWidth * 4);
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function drawRect(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(4, Math.abs(w) * 0.05, Math.abs(h) * 0.05));
  ctx.stroke();
}

function drawEllipse(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStep(ctx, x, y, number, color) {
  const radius = Math.max(16, state.lineWidth * 6 + 10);
  const fontSize = Math.round(radius * 0.9);

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;

  // Filled circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color || state.color;
  ctx.fill();

  // White border ring
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  // Number text
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), x, y + 1);
  ctx.restore();
}

function drawTextOnCanvas(ctx, text, x, y) {
  const fontSize = Math.max(14, state.lineWidth * 5 + 10);
  ctx.save();
  ctx.font = `600 ${fontSize}px Inter, Arial, sans-serif`;
  ctx.fillStyle = state.color;

  // Text shadow for readability
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  const lines = text.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * (fontSize * 1.3));
  });
  ctx.restore();
}

// ── Blur Tool ─────────────────────────────────────────────────────────────────
function applyBlur(x, y, w, h) {
  const px = Math.round(x), py = Math.round(y);
  const pw = Math.max(2, Math.round(w)), ph = Math.max(2, Math.round(h));
  const pad = state.blurRadius * 2;

  // Build composite of base + draw layers
  const composite = document.createElement('canvas');
  composite.width  = baseCanvas.width;
  composite.height = baseCanvas.height;
  const compCtx = composite.getContext('2d');
  compCtx.drawImage(baseCanvas, 0, 0);
  compCtx.drawImage(drawCanvas, 0, 0);

  // Extract region WITH padding so blur edges don't feather into transparency
  const srcX = Math.max(0, px - pad);
  const srcY = Math.max(0, py - pad);
  const srcW = Math.min(composite.width  - srcX, pw + pad * 2);
  const srcH = Math.min(composite.height - srcY, ph + pad * 2);
  const offX = px - srcX;
  const offY = py - srcY;

  const region = document.createElement('canvas');
  region.width  = srcW;
  region.height = srcH;
  region.getContext('2d').drawImage(composite, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

  // Apply Gaussian blur via canvas filter on a temp canvas
  const blurred = document.createElement('canvas');
  blurred.width  = srcW;
  blurred.height = srcH;
  const blurCtx = blurred.getContext('2d');
  blurCtx.filter = `blur(${state.blurRadius}px)`;
  blurCtx.drawImage(region, 0, 0);
  blurCtx.filter = 'none';

  // Stamp only the target region (crop out padding) onto the draw canvas
  drawCtx.drawImage(blurred, offX, offY, pw, ph, px, py, pw, ph);
}

// ── Live Preview ──────────────────────────────────────────────────────────────
let previewSnapshot = null;

function startPreview() {
  previewSnapshot = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
}

function restorePreview() {
  if (previewSnapshot) drawCtx.putImageData(previewSnapshot, 0, 0);
}

// ── Canvas Events ─────────────────────────────────────────────────────────────
let penPath = [];

drawCanvas.addEventListener('mousedown', (e) => {
  if (state.textActive) commitText();

  const { x, y } = getCanvasPos(e);
  state.startX = x;
  state.startY = y;

  if (state.tool === 'pointer') return;

  if (state.tool === 'text') {
    openTextInput(x, y);
    return;
  }

  if (state.tool === 'step') {
    setupCtx(drawCtx);
    drawStep(drawCtx, x, y, state.stepCounter, state.color);
    state.stepCounter++;
    updateStepBadge();
    saveHistory();
    return;
  }

  state.isDrawing = true;

  if (state.tool === 'pen' || state.tool === 'eraser') {
    penPath = [{ x, y }];
    drawCtx.beginPath();
    drawCtx.moveTo(x, y);
    setupCtx(drawCtx);
    if (state.tool === 'eraser') {
      drawCtx.globalCompositeOperation = 'destination-out';
      drawCtx.lineWidth = state.lineWidth * 6;
    }
  } else {
    startPreview();
  }
});

drawCanvas.addEventListener('mousemove', (e) => {
  if (!state.isDrawing) return;
  const { x, y } = getCanvasPos(e);

  if (state.tool === 'pen' || state.tool === 'eraser') {
    penPath.push({ x, y });
    drawCtx.lineTo(x, y);
    setupCtx(drawCtx);
    if (state.tool === 'eraser') {
      drawCtx.globalCompositeOperation = 'destination-out';
      drawCtx.lineWidth = state.lineWidth * 6;
    }
    drawCtx.stroke();
    return;
  }

  // Live preview for shape tools
  restorePreview();
  setupCtx(drawCtx);
  const dx = x - state.startX;
  const dy = y - state.startY;

  switch (state.tool) {
    case 'line':
      drawCtx.beginPath();
      drawCtx.moveTo(state.startX, state.startY);
      drawCtx.lineTo(x, y);
      drawCtx.stroke();
      break;
    case 'arrow':
      drawArrow(drawCtx, state.startX, state.startY, x, y);
      break;
    case 'rect':
      drawRect(drawCtx, state.startX, state.startY, dx, dy);
      break;
    case 'ellipse':
      drawEllipse(drawCtx, state.startX, state.startY, dx, dy);
      break;
    case 'blur': {
      // Dashed cyan preview rectangle
      drawCtx.save();
      drawCtx.strokeStyle = '#06B6D4';
      drawCtx.lineWidth = 2;
      drawCtx.setLineDash([6, 4]);
      drawCtx.strokeRect(state.startX, state.startY, dx, dy);
      drawCtx.setLineDash([]);
      // Frosted fill tint
      drawCtx.fillStyle = 'rgba(6,182,212,0.08)';
      drawCtx.fillRect(state.startX, state.startY, dx, dy);
      drawCtx.restore();
      break;
    }
  }
});

drawCanvas.addEventListener('mouseup', (e) => {
  if (!state.isDrawing) return;
  state.isDrawing = false;

  if (state.tool === 'pen' || state.tool === 'eraser') {
    drawCtx.globalCompositeOperation = 'source-over';
  }

  if (state.tool === 'blur') {
    const { x, y } = getCanvasPos(e);
    const rx = Math.min(x, state.startX);
    const ry = Math.min(y, state.startY);
    const rw = Math.abs(x - state.startX);
    const rh = Math.abs(y - state.startY);
    restorePreview(); // Remove dashed preview outline
    if (rw >= 10 && rh >= 10) {
      applyBlur(rx, ry, rw, rh);
    }
  }

  previewSnapshot = null;
  saveHistory();
});

drawCanvas.addEventListener('mouseleave', (e) => {
  if (state.isDrawing) {
    state.isDrawing = false;
    drawCtx.globalCompositeOperation = 'source-over';
    previewSnapshot = null;
    saveHistory();
  }
});

function getCanvasPos(e) {
  const rect = drawCanvas.getBoundingClientRect();
  const scaleX = drawCanvas.width / rect.width;
  const scaleY = drawCanvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

// ── Text Tool ─────────────────────────────────────────────────────────────────
function openTextInput(x, y) {
  state.textActive = true;
  state.textX = x;
  state.textY = y;

  const rect = drawCanvas.getBoundingClientRect();
  const scaleX = rect.width / drawCanvas.width;
  const scaleY = rect.height / drawCanvas.height;

  textInputWrap.style.display = 'block';
  textInputWrap.style.left = (x * scaleX) + 'px';
  textInputWrap.style.top = (y * scaleY - 4) + 'px';
  textInput.value = '';
  textInput.style.color = state.color;
  textInput.style.minWidth = '120px';
  setTimeout(() => textInput.focus(), 50);
}

function commitText() {
  if (!state.textActive) return;
  const text = textInput.value.trim();
  if (text) {
    drawTextOnCanvas(drawCtx, text, state.textX, state.textY + 20);
    saveHistory();
  }
  textInputWrap.style.display = 'none';
  textInput.value = '';
  state.textActive = false;
}

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    commitText();
  }
  if (e.key === 'Escape') {
    textInputWrap.style.display = 'none';
    textInput.value = '';
    state.textActive = false;
  }
});

// ── Tool Selection ─────────────────────────────────────────────────────────────
document.getElementById('toolGroup').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tool]');
  if (!btn) return;
  selectTool(btn.dataset.tool);
});

function selectTool(tool) {
  state.tool = tool;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tool-' + tool)?.classList.add('active');

  // Cursor
  const cursorMap = {
    pointer: 'default',
    pen: 'crosshair',
    line: 'crosshair',
    arrow: 'crosshair',
    rect: 'crosshair',
    ellipse: 'crosshair',
    text: 'text',
    step: 'pointer',
    eraser: 'eraser',
    blur: 'crosshair'
  };
  canvasContainer.dataset.cursor = cursorMap[tool] || 'crosshair';

  // Show/hide step counter
  stepCounterWrap.style.display = tool === 'step' ? 'flex' : 'none';
  // Show/hide blur intensity slider
  blurIntensityWrap.style.display = tool === 'blur' ? 'flex' : 'none';
}

// ── Color Swatches ─────────────────────────────────────────────────────────────
document.getElementById('colorSwatches').addEventListener('click', (e) => {
  const sw = e.target.closest('[data-color]');
  if (!sw) return;
  setColor(sw.dataset.color);
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  sw.classList.add('active');
});

document.getElementById('customColor').addEventListener('input', (e) => {
  setColor(e.target.value);
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
});

function setColor(color) {
  state.color = color;
  if (state.textActive) textInput.style.color = color;
}

// ── Size Buttons ──────────────────────────────────────────────────────────────
document.querySelectorAll('.size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.lineWidth = parseInt(btn.dataset.size);
  });
});

// ── Step Counter ──────────────────────────────────────────────────────────────
function updateStepBadge() {
  stepBadge.textContent = state.stepCounter;
}

document.getElementById('resetSteps').addEventListener('click', () => {
  state.stepCounter = 1;
  updateStepBadge();
  showToast('Step counter reset to 1', 'success');
});

// ── Blur Slider ───────────────────────────────────────────────────────────────
blurSlider.addEventListener('input', () => {
  state.blurRadius = parseInt(blurSlider.value);
  blurValue.textContent = blurSlider.value;
});

// ── Undo / Redo ───────────────────────────────────────────────────────────────
btnUndo.addEventListener('click', undo);
btnRedo.addEventListener('click', redo);

// ESC close state
let escPressedOnce = false;
let escTimeout = null;

document.addEventListener('keydown', (e) => {
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && e.key === 'z') { e.preventDefault(); undo(); return; }
  if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }

  // Ctrl+C — copy image to clipboard (only when not selecting text in a textarea)
  if (ctrl && e.key === 'c' && !state.textActive) {
    e.preventDefault();
    document.getElementById('btnCopy').click();
    return;
  }

  // ESC key handling
  if (e.key === 'Escape') {
    // If text tool is active, ESC cancels the text input (handled in textInput listener)
    if (state.textActive) return;

    if (!escPressedOnce) {
      // First press — show hint
      escPressedOnce = true;
      showToast('Press ESC again to close the editor', '');
      escTimeout = setTimeout(() => {
        escPressedOnce = false;
      }, 2000);
    } else {
      // Second press — close tab
      clearTimeout(escTimeout);
      escPressedOnce = false;
      window.close();
    }
    return;
  }

  // Any other key resets ESC state
  if (escPressedOnce && e.key !== 'Escape') {
    clearTimeout(escTimeout);
    escPressedOnce = false;
  }

  // Tool shortcuts
  if (!state.textActive && !e.ctrlKey) {
    const shortcuts = { v: 'pointer', p: 'pen', l: 'line', a: 'arrow', r: 'rect', e: 'ellipse', t: 'text', s: 'step', x: 'eraser', b: 'blur' };
    if (shortcuts[e.key]) selectTool(shortcuts[e.key]);
  }
});

// ── Export ─────────────────────────────────────────────────────────────────────
function getFlattenedCanvas() {
  const flat = document.createElement('canvas');
  flat.width = baseCanvas.width;
  flat.height = baseCanvas.height;
  const ctx = flat.getContext('2d');
  ctx.drawImage(baseCanvas, 0, 0);
  ctx.drawImage(drawCanvas, 0, 0);
  return flat;
}

document.getElementById('btnDownload').addEventListener('click', () => {
  if (state.textActive) commitText();
  const flat = getFlattenedCanvas();
  const link = document.createElement('a');
  link.download = `jsnaps-${Date.now()}.png`;
  link.href = flat.toDataURL('image/png');
  link.click();
  showToast("✅ Image downloaded!", 'success');
});

document.getElementById('btnCopy').addEventListener('click', async () => {
  if (state.textActive) commitText();
  try {
    const flat = getFlattenedCanvas();
    flat.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('✅ Copied to clipboard!', 'success');
      } catch (err) {
        showToast('❌ Clipboard access denied', 'error');
        console.error(err);
      }
    }, 'image/png');
  } catch (err) {
    showToast('❌ Failed to copy', 'error');
    console.error(err);
  }
});

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = '') {
  clearTimeout(toastTimeout);
  toast.textContent = msg;
  toast.className = 'show ' + type;
  toastTimeout = setTimeout(() => {
    toast.className = '';
  }, 2500);
}

// ── Close Button ──────────────────────────────────────────────────────────────
document.getElementById('btnClose').addEventListener('click', () => {
  window.close();
});

// ── Start ─────────────────────────────────────────────────────────────────────
init();
selectTool('pointer');
