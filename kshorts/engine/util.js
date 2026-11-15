// Small deterministic helpers shared by the engine, the character and scenes.
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const DEG = Math.PI / 180;

export const ease = {
  linear: (t) => clamp(t),
  in: (t) => { t = clamp(t); return t * t; },
  out: (t) => { t = clamp(t); return 1 - (1 - t) * (1 - t); },
  inOut: (t) => { t = clamp(t); return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t); },
  smooth,
  // overshoot then settle, good for pop-ins and snappy gestures
  outBack: (t) => { t = clamp(t); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};

// Seeded PRNG (mulberry32). Never use Math.random in scenes.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Stateless hash of an integer (+seed) into [0,1).
export function hash01(n, seed = 0) {
  let x = (Math.imul(n | 0, 374761393) + Math.imul(seed | 0, 668265263)) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
// Smooth 1D value noise in [-1,1], a pure function of t.
export function noise1(t, seed = 0) {
  const i = Math.floor(t), f = t - i;
  const a = hash01(i, seed) * 2 - 1, b = hash01(i + 1, seed) * 2 - 1;
  return lerp(a, b, smooth(f));
}

// Find the last entry with entry.t <= t in a list sorted by t.
export function lastAt(list, t) {
  let r = null;
  for (const e of list) { if (e.t <= t + 1e-9) r = e; else break; }
  return r;
}

// ---------- pixel textures ----------
export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
// Make a nearest-filtered sRGB texture from a canvas (or from a draw function).
export function pixelTexture(src, { repeat = null } = {}) {
  let c = src;
  if (typeof src === 'function') throw new Error('pass a canvas');
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat[0], repeat[1]); }
  return tex;
}
// drawPixels(w, h, (px, ctx) => {...}) : px(x, y, color) sets one texel.
export function drawPixels(w, h, fn) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const px = (x, y, col) => { if (!col) return; ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  fn(px, ctx, c);
  return c;
}
export function makeTex(w, h, fn, opts) { return pixelTexture(drawPixels(w, h, fn), opts); }

// colour helpers
export function shade(hex, f) {
  const c = new THREE.Color(hex);
  if (f >= 0) c.lerp(new THREE.Color('#ffffff'), f); else c.multiplyScalar(1 + f);
  return '#' + c.getHexString();
}
export function mix(hexA, hexB, t) {
  const c = new THREE.Color(hexA).lerp(new THREE.Color(hexB), t);
  return '#' + c.getHexString();
}

// Lambert material shortcut used everywhere for the retro look.
export function mat(opts = {}) {
  if (typeof opts === 'string') opts = { color: opts };
  const m = new THREE.MeshLambertMaterial({ color: opts.color ?? '#ffffff', map: opts.map ?? null, flatShading: !!opts.flat,
    side: opts.double ? THREE.DoubleSide : THREE.FrontSide, transparent: !!opts.transparent, alphaTest: opts.alphaTest ?? 0 });
  if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity ?? 1; if (opts.map && opts.emissiveMap !== false) m.emissiveMap = opts.map; }
  return m;
}
