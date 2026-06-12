// J'Snaps Content Script — Freeze & Select
// Flow: background captures viewport silently → sends to content script → freezes UI → user selects

(function () {
  'use strict';

  // Prevent multiple message listeners from being attached on repeated injections
  if (window.__jsnaps_injected) return;
  window.__jsnaps_injected = true;

  let fullShot    = null;
  let scaleX      = 1, scaleY = 1;
  let isSelecting = false;
  let startX      = 0, startY = 0;
  let selCtx      = null;

  let freezeEl, bgCanvas, selCanvas, tooltip, sizeLabel;

  (async () => {
    const dataUrl = await window.electronAPI.getOverlayData();
    if (dataUrl && !document.getElementById('jsnaps-freeze')) {
      startFreeze(dataUrl);
    }
  })();

  function startFreeze(dataUrl) {
    const img = new Image();
    img.onload = () => {
      fullShot = document.createElement('canvas');
      fullShot.width  = img.width;
      fullShot.height = img.height;
      fullShot.getContext('2d').drawImage(img, 0, 0);
      buildFreezeUI();
    };
    img.src = dataUrl;
  }

  // ── Step 2: Build the frozen overlay ──────────────────────────────────────
  function buildFreezeUI() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Scale factors: screenshot px ↔ viewport px
    scaleX = fullShot.width  / vw;
    scaleY = fullShot.height / vh;

    // Freeze container
    freezeEl = document.createElement('div');
    freezeEl.id = 'jsnaps-freeze';

    // Background — the frozen screenshot
    bgCanvas = document.createElement('canvas');
    bgCanvas.id = 'jsnaps-bg';
    bgCanvas.width  = vw;
    bgCanvas.height = vh;
    bgCanvas.getContext('2d').drawImage(fullShot, 0, 0, vw, vh);

    // Selection canvas — dim + selection rect drawn here
    selCanvas = document.createElement('canvas');
    selCanvas.id = 'jsnaps-sel';
    selCanvas.width  = vw;
    selCanvas.height = vh;
    selCtx = selCanvas.getContext('2d');

    // Initial dim
    selCtx.fillStyle = 'rgba(0,0,0,0.45)';
    selCtx.fillRect(0, 0, vw, vh);

    // Tooltip bar at bottom
    tooltip = document.createElement('div');
    tooltip.id = 'jsnaps-tooltip';
    tooltip.innerHTML = `
      <span class="jt-icon">📸</span>
      <span class="jt-text">Drag to select area</span>
      <span class="jt-divider"></span>
      <span class="jt-key">Enter</span><span class="jt-label">Full screen</span>
      <span class="jt-divider"></span>
      <span class="jt-key">ESC</span><span class="jt-label">Cancel</span>
    `;

    // Size label
    sizeLabel = document.createElement('div');
    sizeLabel.id = 'jsnaps-size-label';

    freezeEl.appendChild(bgCanvas);
    freezeEl.appendChild(selCanvas);
    document.body.appendChild(freezeEl);
    document.body.appendChild(tooltip);
    document.body.appendChild(sizeLabel);

    // Events
    selCanvas.addEventListener('mousedown', onMouseDown);
    selCanvas.addEventListener('mousemove', onMouseMove);
    selCanvas.addEventListener('mouseup',   onMouseUp);
    document.addEventListener('keydown', onKeyDown, true);
  }

  // ── Drawing ────────────────────────────────────────────────────────────────
  function drawSelection(x, y, w, h) {
    const vw = selCanvas.width;
    const vh = selCanvas.height;
    selCtx.clearRect(0, 0, vw, vh);

    // Dim outer area
    selCtx.fillStyle = 'rgba(0,0,0,0.5)';
    selCtx.fillRect(0, 0, vw, vh);

    if (w > 0 && h > 0) {
      // Cut out selection (shows frozen screenshot clearly)
      selCtx.clearRect(x, y, w, h);

      // Border
      selCtx.strokeStyle = '#4F8EF7';
      selCtx.lineWidth = 2;
      selCtx.strokeRect(x, y, w, h);

      // Corner handles
      const hs = 8;
      selCtx.fillStyle = '#4F8EF7';
      [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([cx,cy]) => {
        selCtx.fillRect(cx - hs/2, cy - hs/2, hs, hs);
      });

      // Rule-of-thirds guide lines (subtle)
      selCtx.strokeStyle = 'rgba(255,255,255,0.15)';
      selCtx.lineWidth = 1;
      [1/3, 2/3].forEach(t => {
        selCtx.beginPath();
        selCtx.moveTo(x + w*t, y);
        selCtx.lineTo(x + w*t, y+h);
        selCtx.stroke();
        selCtx.beginPath();
        selCtx.moveTo(x, y + h*t);
        selCtx.lineTo(x+w, y + h*t);
        selCtx.stroke();
      });

      // Size label (shows real screenshot pixel size)
      const realW = Math.round(w * scaleX);
      const realH = Math.round(h * scaleY);
      sizeLabel.style.display = 'block';
      sizeLabel.style.left    = Math.min(x + w/2, selCanvas.width - 80) + 'px';
      sizeLabel.style.top     = (y > 36 ? y - 34 : y + h + 8) + 'px';
      sizeLabel.textContent   = `${realW} × ${realH} px`;
    }
  }

  // ── Mouse Events ───────────────────────────────────────────────────────────
  function onMouseDown(e) {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    tooltip.style.opacity = '0';
    sizeLabel.style.display = 'none';
    // Redraw dim cleanly
    selCtx.clearRect(0, 0, selCanvas.width, selCanvas.height);
    selCtx.fillStyle = 'rgba(0,0,0,0.45)';
    selCtx.fillRect(0, 0, selCanvas.width, selCanvas.height);
  }

  function onMouseMove(e) {
    if (!isSelecting) return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    drawSelection(x, y, w, h);
  }

  function onMouseUp(e) {
    if (!isSelecting) return;
    isSelecting = false;

    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);

    if (w < 10 || h < 10) {
      // Too small — reset
      selCtx.clearRect(0, 0, selCanvas.width, selCanvas.height);
      selCtx.fillStyle = 'rgba(0,0,0,0.45)';
      selCtx.fillRect(0, 0, selCanvas.width, selCanvas.height);
      tooltip.style.opacity = '1';
      sizeLabel.style.display = 'none';
      return;
    }

    cropAndSend(x, y, w, h);
  }

  // ── Crop & Send ────────────────────────────────────────────────────────────
  function cropAndSend(vx, vy, vw, vh) {
    // Map viewport coords → full screenshot coords
    const sx = Math.round(vx * scaleX);
    const sy = Math.round(vy * scaleY);
    const sw = Math.round(vw * scaleX);
    const sh = Math.round(vh * scaleY);

    // Crop from the full screenshot canvas
    const crop = document.createElement('canvas');
    crop.width  = sw;
    crop.height = sh;
    crop.getContext('2d').drawImage(fullShot, sx, sy, sw, sh, 0, 0, sw, sh);

    const dataUrl = crop.toDataURL('image/png');

    try {
      window.electronAPI.openEditor({
        dataUrl,
        rect: { x: 0, y: 0, w: sw, h: sh, dpr: 1 }
      });
    } catch (e) { console.error("Failed to send image to editor", e); }
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cleanup();
    }
    // Enter = full screen
    if (e.key === 'Enter') {
      e.preventDefault();
      cropAndSend(0, 0, selCanvas.width, selCanvas.height);
    }
  }

  function cleanup() {
    document.removeEventListener('keydown', onKeyDown, true);
    if (freezeEl)   freezeEl.remove();
    if (tooltip)    tooltip.remove();
    if (sizeLabel)  sizeLabel.remove();
    window.electronAPI.closeOverlay();
  }

})();
