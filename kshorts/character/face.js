// Pixel-art face: a texture atlas of eye / brow / mouth parts, composed on demand
// into a 128x128 face texture that is projected onto the front of the head.
import { canvas, pixelTexture } from '../engine/util.js';
import { COLORS as C } from './config.js';

export const FACE = {
  size: 128,
  eyeDX: 23, eyeY: 73,      // eye centres at 64 +- eyeDX
  browY: 54,
  mouthY: 101,
  blushDX: 31, blushY: 90,
};

export const EYES = ['open', 'half', 'closed', 'happy', 'wide', 'side_r', 'side_l', 'down'];
export const BROWS = ['neutral', 'raised', 'angry', 'worried'];
export const MOUTHS = ['closed', 'smile', 'smirk', 'small', 'open', 'wide', 'o', 'pout', 'grin'];

const EW = 26, EH = 30;
const EC = (EW - 1) / 2, EHALF = EC - 1;

// ---------- eyes ----------
function drawEye(px, state, mirror) {
  // px(x, y, col) in cell space (0..EW-1, 0..EH-1). Screen-space: mirror=false is the eye on screen right.
  const shift = state === 'side_r' ? 3 : state === 'side_l' ? -3 : 0;
  const base = state.startsWith('side') ? 'open' : state;
  const sx = (x) => (mirror ? EW - 1 - x : x); // shape-local x for a screen x
  const nxOf = (x) => (sx(x) - EC) / EHALF;  // -1 inner corner .. +1 outer corner

  if (base === 'closed' || base === 'happy') {
    for (let x = 0; x < EW; x++) {
      const nx = nxOf(x);
      if (Math.abs(nx) > 1.02) continue;
      const q = 1 - nx * nx;
      const y = base === 'closed' ? 19 + 3.5 * q - 0.8 * nx : 24 - 7 * q + 0.6 * nx;
      const th = Math.abs(nx) < 0.75 ? 2 : 1;
      for (let k = 0; k < th; k++) px(x, Math.round(y) + k, C.lash);
    }
    // little outer lash flick
    const ox = mirror ? 0 : EW - 1;
    const oy = base === 'closed' ? 18 : 23;
    px(ox, oy - 1, C.lash); px(mirror ? 1 : EW - 2, oy - 1, C.lash);
    return;
  }

  let top, bot, irx, iry, icy, prx, pry, lashTh;
  if (base === 'wide') { top = (n) => 4 + 3.6 * (n - 0.1) ** 2; bot = (n) => 28 - 3 * n * n; irx = 5.8; iry = 7.6; icy = 16.8; prx = 1.6; pry = 2.5; lashTh = 2; }
  else { top = (n) => 7 + 4.5 * (n - 0.15) ** 2; bot = (n) => 27 - 3 * n * n; irx = 7.4; iry = 9.8; icy = 18.2; prx = 2.6; pry = 4.1; lashTh = 3; }
  if (base === 'down') { icy += 2; }
  const lid = base === 'half' ? (n) => 15.5 + 1.2 * n : base === 'down' ? (n) => 13.5 + 0.7 * n : null;
  const icx = EC + shift;

  for (let x = 0; x < EW; x++) {
    const nx = nxOf(x);
    if (Math.abs(nx) > 1.0) continue;
    let t = top(nx); const b = bot(nx);
    let th = nx < -0.45 ? 2 : lashTh;
    if (lid) { t = Math.max(t, lid(nx)); th = 2; }
    const t0 = Math.round(t), b0 = Math.round(b);
    for (let y = t0; y <= b0; y++) {
      let col;
      if (y < t0 + th) col = C.lash;
      else {
        col = y === t0 + th ? C.whiteShade : C.white;
        const dx = (x - icx) / irx, dy = (y - icy) / iry;
        const d = dx * dx + dy * dy;
        if (d <= 1) {
          const iy = (y - (icy - iry)) / (2 * iry);
          col = iy < 0.32 ? C.iris0 : iy < 0.56 ? C.iris1 : iy < 0.8 ? C.iris2 : C.iris3;
          if (d > 0.8 && iy < 0.8) col = C.iris0;
          const px2 = (x - icx) / prx, py2 = (y - (icy - 0.5)) / pry;
          if (px2 * px2 + py2 * py2 <= 1) col = C.pupil;
          if (y === t0 + th) col = C.iris0; // lid shadow on iris
        }
      }
      if (y === b0 && nx > 0.15 && nx < 0.95) col = C.lashLow; // lower lash
      px(x, y, col);
    }
    if (nx < -0.9) px(x, b0, C.lash);
  }
  // highlights (same screen side on both eyes: light from upper left)
  const hx = Math.round(icx - irx * 0.55), hy = Math.round(icy - iry * 0.55);
  const visible = (x, y) => { const nx = nxOf(x); let t = top(nx); if (lid) t = Math.max(t, lid(nx)); return y >= Math.round(t) + (lid ? 2 : lashTh); };
  const hl = (x, y) => { if (visible(x, y)) px(x, y, C.white); };
  if (base === 'wide') { hl(hx, hy); hl(hx + 1, hy); hl(hx, hy + 1); hl(hx + 1, hy + 1); }
  else { for (let a = 0; a < 3; a++) for (let b2 = 0; b2 < 3; b2++) if (!(a === 2 && b2 === 2)) hl(hx + a, hy + b2); }
  const sx2 = Math.round(icx + irx * 0.35), sy2 = Math.round(icy + iry * 0.45);
  hl(sx2, sy2); hl(sx2 + 1, sy2);
  // outer wing of the upper lash
  if (!lid) {
    const ox = mirror ? 0 : EW - 1, ox2 = mirror ? 1 : EW - 2;
    const ty = Math.round(top(1.0));
    px(ox, ty - 1, C.lash); px(ox, ty, C.lash); px(ox2, ty - 1, C.lash);
  } else {
    const ox = mirror ? 0 : EW - 1;
    px(ox, Math.round(lid(1)) + 1, C.lash);
  }
}

// ---------- brows ----------
const BW = 22, BH = 8;
function drawBrow(px, state, mirror) {
  for (let x = 2; x < BW - 1; x++) {
    const xs = mirror ? BW - 1 - x : x;
    const nx = (xs - 10.5) / 8.5; // -1 inner .. +1 outer
    if (Math.abs(nx) > 1) continue;
    let y;
    if (state === 'neutral') y = 4.5 - 1.6 * (1 - nx * nx) + 0.3 * nx;
    else if (state === 'raised') y = 4 - 2.6 * (1 - nx * nx);
    else if (state === 'angry') y = 3.6 - 2.0 * nx;
    else y = 3.6 + 2.0 * nx - 0.8 * (1 - nx * nx); // worried
    const th = nx < 0.4 ? 2 : 1;
    for (let k = 0; k < th; k++) px(x, Math.round(y) + k, C.brow);
  }
}

// ---------- mouths (hand-drawn pixel maps) ----------
const MOUTH_ART = {
  closed: [
    'LLLLLL',
  ],
  smile: [
    'L..........L',
    '.L........L.',
    '..LLLLLLLL..',
  ],
  smirk: [
    '..........L',
    '.........L.',
    '.LLLLLLLL..',
  ],
  small: [
    '.LLLL.',
    'LDDDDL',
    'LIIIIL',
    '.LLLL.',
  ],
  open: [
    '.LLLLLL.',
    'LDDDDDDL',
    'LDDDDDDL',
    'LDIIIIDL',
    '.LLLLLL.',
  ],
  wide: [
    'LLLLLLLLLLL',
    'LWWWWWWWWWL',
    'LDDDDDDDDDL',
    'LDDDDDDDDDL',
    '.LDDTTTDDL.',
    '..LTTTTTL..',
    '...LLLLL...',
  ],
  o: [
    '.LLL.',
    'LDDDL',
    'LDDDL',
    'LDIDL',
    '.LLL.',
  ],
  pout: [
    '...LL...',
    '.LL..LL.',
    'L......L',
  ],
  grin: [
    'LLLLLLLLL',
    'LDDDDDDDL',
    '.LDDTTDL.',
    '..LTTTL..',
    '...LLL...',
  ],
};
const MOUTH_PAL = { L: C.mouthLine, D: C.mouthDark, I: C.mouthIn, T: C.tongue, W: C.teeth };
const MW = 14, MH = 10;

// ---------- atlas ----------
// Layout: row 0: eyes (screen-left copies), row 1: eyes (screen-right), row 2: brows L/R, row 3: mouths + blush
let ATLAS = null;
const REG = {}; // name -> {x,y,w,h}

function buildAtlas() {
  const cols = Math.max(EYES.length, MOUTHS.length + 1);
  const cw = 28, ch = 32;
  const c = canvas(cols * cw, 4 * ch);
  const ctx = c.getContext('2d');
  const at = (ox, oy) => (x, y, col) => { if (!col || x < 0 || y < 0) return; ctx.fillStyle = col; ctx.fillRect(ox + x, oy + y, 1, 1); };
  EYES.forEach((e, i) => {
    drawEye(at(i * cw, 0), e, true); REG['eyeL:' + e] = { x: i * cw, y: 0, w: EW, h: EH };
    drawEye(at(i * cw, ch), e, false); REG['eyeR:' + e] = { x: i * cw, y: ch, w: EW, h: EH };
  });
  BROWS.forEach((b, i) => {
    drawBrow(at(i * cw, 2 * ch), b, true); REG['browL:' + b] = { x: i * cw, y: 2 * ch, w: BW, h: BH };
    drawBrow(at(i * cw, 2 * ch + 10), b, false); REG['browR:' + b] = { x: i * cw, y: 2 * ch + 10, w: BW, h: BH };
  });
  MOUTHS.forEach((m, i) => {
    const art = MOUTH_ART[m];
    const w = art[0].length, h = art.length;
    const ox = i * cw + Math.floor((MW - w) / 2), oy = 3 * ch + Math.floor((MH - h) / 2);
    art.forEach((row, y) => [...row].forEach((ch2, x) => { if (MOUTH_PAL[ch2]) at(ox, oy)(x, y, MOUTH_PAL[ch2]); }));
    REG['mouth:' + m] = { x: i * cw, y: 3 * ch, w: MW, h: MH };
  });
  // blush patch
  const bi = MOUTHS.length;
  const bp = at(bi * cw, 3 * ch);
  for (let y = 0; y < 6; y++) for (let x = 0; x < 14; x++) {
    const dx = (x - 6.5) / 7, dy = (y - 2.5) / 3;
    if (dx * dx + dy * dy <= 1) bp(x, y, C.blush);
  }
  for (let k = 0; k < 3; k++) { const x0 = 3 + k * 4; bp(x0 + 2, 1, C.blushLine); bp(x0 + 1, 2, C.blushLine); bp(x0, 3, C.blushLine); }
  REG.blush = { x: bi * cw, y: 3 * ch, w: 14, h: 6 };
  ATLAS = c;
}

export function faceAtlas() { if (!ATLAS) buildAtlas(); return ATLAS; }

function blit(ctx, key, cx, cy) {
  const r = REG[key];
  if (!r) throw new Error('unknown face part ' + key);
  ctx.drawImage(ATLAS, r.x, r.y, r.w, r.h, Math.round(cx - r.w / 2), Math.round(cy - r.h / 2), r.w, r.h);
}

const cache = new Map();
export function normalizeFace(f) {
  return {
    eyeL: f.eyeL || f.eyes || 'open', eyeR: f.eyeR || f.eyes || 'open',
    brows: f.brows || 'neutral', mouth: f.mouth || 'closed', blush: !!f.blush,
  };
}
export function faceKey(f) { const n = normalizeFace(f); return `${n.eyeL}|${n.eyeR}|${n.brows}|${n.mouth}|${n.blush ? 1 : 0}`; }

export function composeFace(f) {
  faceAtlas();
  const n = normalizeFace(f);
  const S = FACE.size;
  const c = canvas(S, S);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = C.skin; ctx.fillRect(0, 0, S, S);
  // soft hair shadow on the forehead under the bangs
  // nose
  ctx.fillStyle = C.nose; ctx.fillRect(64, 90, 1, 2); ctx.fillRect(63, 91, 1, 1);
  const cxL = 64 - FACE.eyeDX, cxR = 64 + FACE.eyeDX;
  if (n.blush) { blit(ctx, 'blush', cxL - 6, FACE.blushY); blit(ctx, 'blush', cxR + 6, FACE.blushY); }
  blit(ctx, 'eyeL:' + n.eyeL, cxL, FACE.eyeY);
  blit(ctx, 'eyeR:' + n.eyeR, cxR, FACE.eyeY);
  const by = FACE.browY + (n.brows === 'raised' ? -2 : 0);
  blit(ctx, 'browL:' + n.brows, cxL - 1, by);
  blit(ctx, 'browR:' + n.brows, cxR + 1, by);
  blit(ctx, 'mouth:' + n.mouth, 64, FACE.mouthY);
  return c;
}

export function faceTexture(f) {
  const k = faceKey(f);
  let t = cache.get(k);
  if (!t) { t = pixelTexture(composeFace(f)); cache.set(k, t); }
  return t;
}

// Expression presets: shorthand names usable anywhere a face is expected.
export const EXPRESSIONS = {
  neutral:   { eyes: 'open', brows: 'neutral', mouth: 'closed' },
  happy:     { eyes: 'happy', brows: 'raised', mouth: 'grin' },
  smile:     { eyes: 'open', brows: 'neutral', mouth: 'smile' },
  smug:      { eyes: 'half', brows: 'raised', mouth: 'smirk' },
  surprised: { eyes: 'wide', brows: 'raised', mouth: 'o' },
  shocked:   { eyes: 'wide', brows: 'worried', mouth: 'wide' },
  angry:     { eyes: 'half', brows: 'angry', mouth: 'pout' },
  worried:   { eyes: 'open', brows: 'worried', mouth: 'small' },
  sulky:     { eyes: 'half', brows: 'worried', mouth: 'pout', blush: true },
  shy:       { eyes: 'down', brows: 'worried', mouth: 'smile', blush: true },
  laugh:     { eyes: 'happy', brows: 'raised', mouth: 'wide', blush: true },
  thinking:  { eyes: 'side_r', brows: 'worried', mouth: 'pout' },
  glance:    { eyes: 'side_l', brows: 'raised', mouth: 'smirk' },
  wink:      { eyeL: 'open', eyeR: 'happy', brows: 'raised', mouth: 'grin' },
  sleepy:    { eyes: 'half', brows: 'worried', mouth: 'closed' },
};
export function resolveFace(f) {
  if (typeof f === 'string') { if (!EXPRESSIONS[f]) throw new Error('unknown expression ' + f); return { ...EXPRESSIONS[f] }; }
  if (f && f.preset) return { ...EXPRESSIONS[f.preset], ...f };
  return { ...f };
}
