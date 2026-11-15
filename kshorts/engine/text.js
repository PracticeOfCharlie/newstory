// Crisp pixel-font text: rasterise at the font's native pixel size, threshold to 1-bit,
// add a hard outline, then scale up by an integer factor with nearest-neighbour.
import { canvas } from './util.js';

export const FONTS = {
  // family name registered in index.html -> native pixel size
  bold: { family: 'Galmuri11B', size: 12 },
  regular: { family: 'Galmuri11', size: 12 },
  small: { family: 'Galmuri9', size: 10 },
  large: { family: 'Galmuri14', size: 15 },
};

const cache = new Map();
export function pixelText(text, { font = 'bold', color = '#ffffff', outline = '#141018', outlineW = 1, shadow = null } = {}) {
  const key = [text, font, color, outline, outlineW, shadow].join('|');
  if (cache.has(key)) return cache.get(key);
  const F = FONTS[font] || FONTS.bold;
  const m = canvas(4, 4).getContext('2d');
  m.font = `${F.size}px ${F.family}`;
  const w = Math.ceil(m.measureText(text).width) + 2;
  const h = F.size + 4;
  const pad = outlineW + (shadow ? 1 : 0) + 1;
  const W = w + pad * 2, H = h + pad * 2;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  ctx.font = `${F.size}px ${F.family}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  ctx.fillText(text, pad + 1, pad + 1);
  const img = ctx.getImageData(0, 0, W, H);
  const a = img.data;
  const on = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) on[i] = a[i * 4 + 3] >= 110 ? 1 : 0;
  const ol = new Uint8Array(W * H);
  if (outline) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (on[y * W + x]) continue;
    let hit = 0;
    for (let dy = -outlineW; dy <= outlineW && !hit; dy++) for (let dx = -outlineW; dx <= outlineW; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && on[yy * W + xx]) { hit = 1; break; }
    }
    ol[y * W + x] = hit;
  }
  const out = ctx.createImageData(W, H);
  const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const fc = hex(color), oc = outline ? hex(outline) : null, sc = shadow ? hex(shadow) : null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    let col = null;
    if (on[i]) col = fc; else if (ol[i]) col = oc;
    else if (sc && y > 0 && x > 0 && (on[i - W - 1] || ol[i - W - 1])) col = sc;
    if (col) { out.data[i * 4] = col[0]; out.data[i * 4 + 1] = col[1]; out.data[i * 4 + 2] = col[2]; out.data[i * 4 + 3] = 255; }
  }
  ctx.clearRect(0, 0, W, H);
  ctx.putImageData(out, 0, 0);
  // trim empty borders
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (out.data[(y * W + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  let res = c;
  if (x1 >= x0) { res = canvas(x1 - x0 + 1, y1 - y0 + 1); res.getContext('2d').drawImage(c, -x0, -y0); }
  cache.set(key, res);
  return res;
}

// Draw text centred at (cx, cy) on ctx with integer pixel scale (and optional extra float scale for pops).
export function drawText(ctx, text, cx, cy, { scale = 2, pop = 1, maxW = Infinity, ...style } = {}) {
  const img = pixelText(text, style);
  let s = scale;
  while (s > 1 && img.width * s > maxW) s--;
  const w = img.width * s * pop, h = img.height * s * pop;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
}
