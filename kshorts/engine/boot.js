// Browser side of the renderer. render.js drives these functions through Playwright.
import { createEngine } from './engine.js';
import { drawText } from './text.js';

let E = null;

window.__boot = async ({ scene, width = 360, height = 640, fps = 30, args = {} }) => {
  for (const f of ['12px Galmuri11B', '12px Galmuri11', '10px Galmuri9', '15px Galmuri14']) await document.fonts.load(f, '가A');
  E = createEngine({ width, height, fps, glCanvas: document.getElementById('gl'), outCanvas: document.getElementById('out') });
  E.args = args;
  const mod = await import(scene);
  const res = (await mod.default(E)) || {};
  if (res.duration) E.duration = res.duration;
  window.__sheetCells = res.sheet || mod.sheet || null;
  return { duration: E.duration, sheet: window.__sheetCells };
};

// Render time t; returns PNG data URL of the composited low-res frame.
window.__frame = (t) => { E.frame(t); return document.getElementById('out').toDataURL('image/png'); };

// Reference sheet: cells [{t, label}] rendered into a labelled grid (low-res), returned as PNG.
window.__sheet = ({ cells, cols = 4, crop = null, title = '' }) => {
  const out = document.getElementById('out');
  const cw = crop ? crop[2] : E.W, ch = crop ? crop[3] : E.H;
  const lh = 18, th = title ? 26 : 0;
  const rows = Math.ceil(cells.length / cols);
  const c = document.createElement('canvas');
  c.width = cols * cw; c.height = th + rows * (ch + lh);
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#1b1820'; ctx.fillRect(0, 0, c.width, c.height);
  if (title) drawText(ctx, title, c.width / 2, 13, { scale: 1, color: '#ffd43b' });
  cells.forEach((cell, i) => {
    E.frame(cell.t);
    const x = (i % cols) * cw, y = th + Math.floor(i / cols) * (ch + lh);
    if (crop) ctx.drawImage(out, crop[0], crop[1], cw, ch, x, y, cw, ch); else ctx.drawImage(out, x, y);
    drawText(ctx, cell.label, x + cw / 2, y + ch + lh / 2, { scale: 1, color: '#ffffff' });
  });
  return c.toDataURL('image/png');
};
