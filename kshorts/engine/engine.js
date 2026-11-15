// The engine object `E` handed to every scene module.
import * as THREE from 'three';
import * as U from './util.js';
import { drawText, pixelText } from './text.js';
import { createProp, PROP_KINDS } from './props.js';
import { createCharacter } from '../character/index.js';
import { SETS, makeDesk, makeChair } from './sets/index.js';

export const PRESETS = {
  // look height, camera height, distance, fov (all cameras are at or above chest height: no low angles)
  wide:   { look: 0.9,  cam: 1.4,  dist: 3.8,  fov: 40 },
  full:   { look: 0.82, cam: 1.18, dist: 2.75, fov: 40 },
  knee:   { look: 1.0,  cam: 1.3,  dist: 1.95, fov: 38 },
  medium: { look: 1.18, cam: 1.36, dist: 1.35, fov: 36 },
  close:  { look: 1.36, cam: 1.45, dist: 0.86, fov: 34 },
  face:   { look: 1.43, cam: 1.48, dist: 0.56, fov: 32 },
};

export function createEngine({ width = 360, height = 640, fps = 30, glCanvas, outCanvas }) {
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9fb6c8');
  const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 80);
  const out = outCanvas; out.width = width; out.height = height;
  const octx = out.getContext('2d');
  const small = document.createElement('canvas');

  const updaters = [], shots = [], transitions = [], captions = [], labels = [], overlays = [];
  let duration = 5;

  const E = {
    THREE, U, W: width, H: height, fps, scene, camera, renderer,
    get duration() { return duration; }, set duration(d) { duration = d; },
    PRESETS,

    // ---- content ----
    character(opts = {}) { const c = createCharacter(E, opts); updaters.push((t) => c.update(t)); return c; },
    set(name, opts = {}) { if (!SETS[name]) throw new Error('unknown set ' + name); return SETS[name](E, opts); },
    prop(kind, opts = {}) { const p = createProp(E, kind, opts); updaters.push((t) => p.update(t)); return p; },
    add(obj) { scene.add(obj); return obj; },
    furniture: { desk: (x, z, ry) => makeDesk(scene, x, z, ry), chair: (x, z, ry) => makeChair(scene, x, z, ry) },
    onUpdate(fn) { updaters.push(fn); },
    lights({ sky = '#fff4e6', ground = '#6d625c', hemi = 2.0, sun = '#fff1dd', sunI = 1.6, sunDir = [2, 4, 3], ambient = 0.35 } = {}) {
      const h = new THREE.HemisphereLight(sky, ground, hemi); scene.add(h);
      const d = new THREE.DirectionalLight(sun, sunI); d.position.set(...sunDir); scene.add(d);
      const a = new THREE.AmbientLight('#ffffff', ambient); scene.add(a);
      return { hemi: h, sun: d, ambient: a };
    },

    // ---- camera ----
    // shot(t, { preset, subject, yaw, frame, dist, height, fov, to:{...}, follow, mosaic })
    // or shot(t, { pos:[x,y,z], look:[x,y,z], fov, to:{ pos, look, fov }, ease })
    shot(t, spec) { shots.push({ t, ...spec }); shots.sort((a, b) => a.t - b.t); if (spec.mosaic) E.mosaic(t, spec.mosaic === true ? {} : spec.mosaic); return E; },
    // pixelate transition centred on time t
    mosaic(t, { dur = 0.5, max = 18 } = {}) { transitions.push({ t, dur, max }); return E; },

    // ---- 2D overlays ----
    // words: [{start, end, text}]; one word on screen at a time, lower-middle
    captions(words, { y = 0.7, scale = 2, color = '#ffffff', outline = '#15101a', hold = 0.3, font = 'bold' } = {}) {
      words.forEach((w, i) => {
        const next = words[i + 1];
        const end = next ? Math.min(next.start, w.end + hold) : w.end + hold;
        captions.push({ t0: w.start, t1: Math.max(end, w.start + 0.12), text: w.text, y, scale, color, outline, font });
      });
      return E;
    },
    // yellow key-term label near the top, with a pop-in
    label(t0, t1, text, { y = 0.15, scale = 2, color = '#ffd43b', outline = '#2a1a06', font = 'bold' } = {}) {
      labels.push({ t0, t1, text, y, scale, color, outline, font }); return E;
    },
    // custom 2D drawing on top of the frame: fn(ctx, t, W, H)
    overlay(fn) { overlays.push(fn); return E; },
    text: { draw: drawText, raster: pixelText },
  };

  function cameraAt(t) {
    let s = null, next = null;
    for (const sh of shots) { if (sh.t <= t + 1e-9) s = sh; else { next = next || sh; } }
    if (!s) s = shots[0] || { pos: [0, 1.4, 3], look: [0, 1, 0], fov: 36 };
    const end = next ? next.t : duration;
    const k = (U.ease[s.ease || 'inOut'] || U.ease.inOut)((t - s.t) / Math.max(0.01, end - s.t));
    let pos, look, fov;
    if (s.preset) {
      const P = PRESETS[s.preset];
      const resolve = (spec, tt) => {
        const st = spec.subject ? spec.subject.stateAt(tt) : { x: 0, z: 0, ry: 0 };
        const yaw = (st.ry + (spec.yaw ?? 0)) * U.DEG;
        const dist = P.dist * (spec.zoom ? 1 / spec.zoom : 1) * (spec.dist ?? 1);
        const camY = P.cam + (spec.height ?? 0);
        const fx = Math.cos(yaw), fz = -Math.sin(yaw); // screen-right vector
        const shift = spec.frame === 'left' ? 0.18 : spec.frame === 'right' ? -0.18 : (spec.shift ?? 0);
        const lx = st.x + fx * shift * dist * 0.5, lz = st.z + fz * shift * dist * 0.5;
        return { pos: [st.x + Math.sin(yaw) * dist + fx * shift * dist * 0.5, camY, st.z + Math.cos(yaw) * dist + fz * shift * dist * 0.5], look: [lx, P.look + (spec.lookY ?? 0), lz], fov: spec.fov ?? P.fov };
      };
      const tt = s.follow ? t : s.t;
      let spec = s;
      if (s.to) { // interpolate the shot parameters (so a yaw change orbits instead of cutting across)
        spec = { ...s };
        for (const key of ['yaw', 'zoom', 'dist', 'height', 'shift', 'lookY', 'fov']) {
          if (s.to[key] == null) continue;
          const a0 = s[key] ?? (key === 'zoom' || key === 'dist' ? 1 : key === 'fov' ? P.fov : 0);
          spec[key] = U.lerp(a0, s.to[key], k);
        }
      }
      ({ pos, look, fov } = resolve(spec, tt));
    } else {
      pos = s.pos; look = s.look; fov = s.fov ?? 36;
      if (s.to) { pos = pos.map((v, i) => U.lerp(v, s.to.pos ? s.to.pos[i] : v, k)); look = look.map((v, i) => U.lerp(v, s.to.look ? s.to.look[i] : v, k)); fov = U.lerp(fov, s.to.fov ?? fov, k); }
    }
    if (s.shake) { const a = s.shake; look = [look[0] + U.noise1(t * 0.7, 3) * a, look[1] + U.noise1(t * 0.6, 4) * a, look[2]]; }
    camera.position.set(...pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(...look);
  }

  function mosaicAt(t) {
    let b = 1;
    for (const tr of transitions) {
      const a = 1 - Math.abs(t - tr.t) / (tr.dur / 2);
      if (a > 0) b = Math.max(b, 1 + Math.round(Math.pow(a, 1.3) * (tr.max - 1)));
    }
    return b;
  }

  E.frame = (t) => {
    for (const u of updaters) u(t);
    cameraAt(t);
    renderer.render(scene, camera);
    octx.imageSmoothingEnabled = false;
    const b = mosaicAt(t);
    if (b > 1) {
      small.width = Math.ceil(width / b); small.height = Math.ceil(height / b);
      const sctx = small.getContext('2d');
      sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'medium';
      sctx.drawImage(glCanvas, 0, 0, small.width, small.height);
      octx.drawImage(small, 0, 0, small.width * b, small.height * b);
    } else octx.drawImage(glCanvas, 0, 0);
    for (const o of overlays) { octx.save(); o(octx, t, width, height); octx.restore(); }
    for (const l of labels) {
      if (t < l.t0 || t >= l.t1) continue;
      const a = t - l.t0, r = l.t1 - t;
      const pop = a < 0.25 ? Math.max(0.05, U.ease.outBack(a / 0.25)) : r < 0.12 ? Math.max(0.05, r / 0.12) : 1;
      drawText(octx, l.text, width / 2, height * l.y, { scale: l.scale, pop, color: l.color, outline: l.outline, font: l.font, maxW: width - 12 });
    }
    for (const c of captions) {
      if (t < c.t0 || t >= c.t1) continue;
      drawText(octx, c.text, width / 2, height * c.y, { scale: c.scale, color: c.color, outline: c.outline, font: c.font, maxW: width - 12 });
    }
  };
  return E;
}
