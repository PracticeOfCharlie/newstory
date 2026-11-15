// Props: simple low-poly objects that can sit in the world or be attached to a character's hand.
import * as THREE from 'three';
import { makeTex, mat, canvas, pixelTexture, shade, DEG } from './util.js';
import { pixelText } from './text.js';

// Paint a sign/label texture with pixel-font lines.
export function signTexture(lines, { w = 64, h = 32, bg = '#f4f1e8', fg = '#1a1a22', border = null, font = 'bold', scale = 1 } = {}) {
  const c = canvas(w, h); const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  if (border) { ctx.fillStyle = border; ctx.fillRect(0, 0, w, 1); ctx.fillRect(0, h - 1, w, 1); ctx.fillRect(0, 0, 1, h); ctx.fillRect(w - 1, 0, 1, h); }
  ctx.imageSmoothingEnabled = false;
  const imgs = lines.map((l) => pixelText(l, { font, color: fg, outline: null }));
  const total = imgs.reduce((a, i) => a + i.height * scale + 2, -2);
  let y = Math.round((h - total) / 2);
  for (const im of imgs) { ctx.drawImage(im, Math.round((w - im.width * scale) / 2), y, im.width * scale, im.height * scale); y += im.height * scale + 2; }
  return pixelTexture(c);
}

export const PROP_KINDS = {
  box({ size = [0.2, 0.2, 0.2], color = '#c98a4a', map = null }) {
    return new THREE.Mesh(new THREE.BoxGeometry(...size), mat({ color: map ? '#ffffff' : color, map }));
  },
  // flat card / sign / price tag with pixel text. Origin at its centre.
  card({ w = 0.3, h = 0.2, lines = ['TEXT'], bg = '#f4f1e8', fg = '#1a1a22', texW = 64, texH = 40, border = '#888888', thick = 0.006 }) {
    const tex = signTexture(lines, { w: texW, h: texH, bg, fg, border });
    const front = mat({ map: tex });
    const side = mat(shade(bg, -0.25));
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, thick), [side, side, side, side, front, side]);
  },
  // generic snack bag (pillow shape), no real logos
  snack({ color = '#e0442e', text = '과자', w = 0.14, h = 0.2, d = 0.05 }) {
    const g = new THREE.BoxGeometry(w, h, d, 4, 1, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i); const k = 1 - Math.pow(Math.abs(y) / (h / 2), 4) * 0.85; p.setZ(i, p.getZ(i) * k * (1 - Math.pow(Math.abs(x) / (w / 2), 2) * 0.3)); }
    g.computeVertexNormals();
    const tex = makeTex(32, 48, (px, ctx) => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, 32, 48);
      ctx.fillStyle = shade(color, -0.35); ctx.fillRect(0, 0, 32, 4); ctx.fillRect(0, 44, 32, 4);
      ctx.fillStyle = '#ffe9a8'; ctx.fillRect(4, 26, 24, 12);
      ctx.fillStyle = '#d99a3a'; for (let k = 0; k < 4; k++) ctx.fillRect(7 + k * 5, 30 + (k % 2), 4, 3);
      const t = pixelText(text, { font: 'small', color: '#ffffff', outline: shade(color, -0.5) });
      ctx.drawImage(t, Math.round(16 - t.width / 2), 9);
    });
    return new THREE.Mesh(g, mat({ map: tex }));
  },
  can({ color = '#3a7bd5', r = 0.033, h = 0.12 }) {
    const g = new THREE.CylinderGeometry(r, r, h, 10);
    const tex = makeTex(32, 16, (px, ctx) => { ctx.fillStyle = color; ctx.fillRect(0, 0, 32, 16); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 6, 32, 3); ctx.fillStyle = '#c8ccd2'; ctx.fillRect(0, 0, 32, 1); ctx.fillRect(0, 15, 32, 1); });
    return new THREE.Mesh(g, [mat({ map: tex }), mat('#c8ccd2'), mat('#c8ccd2')]);
  },
  // generic folder phone (closed), no logos
  phone({ color = '#d8d8e0' }) {
    const g = new THREE.Group();
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.012), mat(color)); a.position.z = -0.006; g.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.012), mat(shade(color, -0.15))); b.position.z = 0.006; g.add(b);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.002), mat({ color: '#223', emissive: '#4a8cff', emissiveIntensity: 0.6 })); s.position.set(0, 0.025, 0.013); g.add(s);
    return g;
  },
  // wired white earphones: two buds and a short dangling cable; attach to the head anchor
  earphones() {
    const g = new THREE.Group();
    const m = mat('#f4f4f4');
    for (const s of [-1, 1]) {
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), m); bud.position.set(s * 0.108, 0.075, 0.01); g.add(bud);
      const pts = [new THREE.Vector3(s * 0.108, 0.07, 0.012), new THREE.Vector3(s * 0.1, -0.02, 0.05), new THREE.Vector3(s * 0.06, -0.12, 0.09), new THREE.Vector3(0, -0.2, 0.1)];
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.0015, 3), m));
    }
    return g;
  },
  // dark shoulder bag with a few charms; attach to 'spine'
  bag({ color = '#1d1a22' }) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.2), mat(color)); body.position.set(0.21, -0.12, 0.0); g.add(body);
    const strap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.21, 0.0, 0.0), new THREE.Vector3(0.16, 0.31, 0.02), new THREE.Vector3(0.1, 0.34, 0.0)]), 8, 0.008, 3), mat('#121016')); g.add(strap);
    const cols = ['#e04a6a', '#f2d24a', '#7ac8f0', '#ffffff', '#b07ae0'];
    cols.forEach((c, i) => { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), mat(c)); ch.position.set(0.25, -0.05 - i * 0.04, -0.06 + (i % 3) * 0.05); ch.rotation.set(i, i * 0.7, 0); g.add(ch); });
    return g;
  },
};

export function createProp(E, kind, opts = {}) {
  const obj = kind && kind.isObject3D ? kind : PROP_KINDS[kind](opts);
  E.scene.add(obj);
  const attaches = [{ t: -1e9, world: opts.pos || [0, 0, 0], rot: opts.rot || [0, 0, 0] }];
  const shows = [];
  const api = {
    obj,
    // attach(t, { world:[x,y,z], rot:[deg] })  or  attach(t, { to: character|Object3D, anchor:'handR', offset, rot })
    attach(t, spec) { attaches.push({ t, ...spec }); attaches.sort((a, b) => a.t - b.t); return api; },
    at(t, pos, rot) { return api.attach(t, { world: pos, rot }); },
    show(t, on = true) { shows.push({ t, on }); shows.sort((a, b) => a.t - b.t); return api; },
    update(t) {
      let a = attaches[0];
      for (const x of attaches) if (x.t <= t + 1e-9) a = x;
      let parent = E.scene;
      if (a.to) parent = a.to.isObject3D ? a.to : a.to.anchor(a.anchor || 'handR');
      if (obj.parent !== parent) parent.add(obj);
      const p = a.world || a.offset || [0, 0, 0], r = a.rot || [0, 0, 0];
      obj.position.set(...p); obj.rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG);
      let vis = true; for (const s of shows) if (s.t <= t) vis = s.on;
      obj.visible = vis;
    },
  };
  return api;
}
