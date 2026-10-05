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
