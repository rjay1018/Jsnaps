function calculateEditorWindowBounds({ rect = {}, workArea = { width: 1920, height: 1080 } } = {}) {
  const safeRect = rect || {};
  const safeWorkArea = workArea || { width: 1920, height: 1080 };

  const dpr = safeRect.dpr || 1;
  const displayW = Math.round((safeRect.w || 800) / dpr);
  const displayH = Math.round((safeRect.h || 600) / dpr);

  const maxW = Math.round(safeWorkArea.width * 0.95);
  const maxH = Math.round(safeWorkArea.height * 0.92);

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
