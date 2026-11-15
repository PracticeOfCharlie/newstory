// Procedural low-poly character: geometry, pixel textures and the rigid joint hierarchy.
import * as THREE from 'three';
import { loft, strand } from '../engine/geo.js';
import { makeTex, mat, shade, rng, DEG } from '../engine/util.js';
import { COLORS as C, BODY as B, OPTIONS } from './config.js';
import { faceTexture, FACE } from './face.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------- textures ----------------
function blazerTexture() {
  // 128 x 96, u around the torso (64 = front centre), v bottom (hem) .. top (neck)
  return makeTex(128, 96, (px, ctx) => {
    ctx.fillStyle = C.blazer; ctx.fillRect(0, 0, 128, 96);
    // side seams + back seam
    for (let y = 0; y < 96; y++) { px(32, y, C.blazerDark); px(96, y, C.blazerDark); px(0, y, C.blazerDark); }
    // waist line (v ~ 0.31 -> y ~ 66)
    const waist = 66;
    for (let y = 0; y < 96; y++) {
      const open = y < waist ? Math.round(2 + (waist - y) * 0.19) : Math.round(1 + (y - waist) * 0.35); // half-width of the front opening
      for (let x = 64 - open; x <= 64 + open; x++) {
        const dx = Math.abs(x - 63.5);
        let col;
        if (y < waist) {
          // cardigan V inside the blazer, shirt inside the cardigan
          const cardOpen = Math.max(0, (waist - 12 - y) * 0.16);
          col = dx < cardOpen ? C.shirt : C.cardigan;
          if (dx >= cardOpen && dx < cardOpen + 1 && cardOpen > 0) col = C.cardiganDark;
          if (dx > open - 1) col = C.blazerLight; // lapel edge highlight
        } else {
          col = y < waist + 5 ? C.cardigan : C.skirtDark; // below the button: cardigan hem, then the skirt shows
          if (dx > open - 1) col = C.blazerDark;
        }
        px(x, y, col);
      }
    }
    // cardigan rib knit dots
    for (let y = 30; y < waist; y += 3) for (let x = 50; x < 78; x += 2) {
      const open = Math.round(2 + (waist - y) * 0.19), cardOpen = Math.max(0, (waist - 12 - y) * 0.16);
      const dx = Math.abs(x - 63.5);
      if (dx < open - 1 && dx > cardOpen + 1) px(x, y, C.cardiganDark);
    }
    // lapel notch lines
    // gold buttons: one at the waist, two below the opening on the sides
    const btn = (x, y) => { px(x, y, C.button); px(x + 1, y, C.button); px(x, y + 1, shade(C.button, -0.3)); px(x + 1, y + 1, shade(C.button, -0.2)); };
    btn(58, waist - 2); btn(58, waist + 6); btn(68, waist - 2); btn(68, waist + 6);
    // pocket flaps
    for (let x = 40; x < 50; x++) { px(x, 74, C.blazerDark); px(128 - x, 74, C.blazerDark); }
    // red crest on her left chest (screen right when facing camera)
    const cx = 80, cy = 30;
    const crest = ['.GGGGG.', 'GRRRRRG', 'GRGRGRG', 'GRRRRRG', '.GRRRG.', '..GRG..', '...G...'];
    crest.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'R') px(cx + x, cy + y, C.crest); if (ch === 'G') px(cx + x, cy + y, C.crestGold); }));
  });
}
function sleeveTexture(cuffButtons) {
  return makeTex(32, 32, (px, ctx) => {
    ctx.fillStyle = C.blazer; ctx.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y++) px(0, y, C.blazerDark);
    if (cuffButtons) { for (let k = 0; k < 2; k++) { px(3 + k * 3, 3, C.button); px(4 + k * 3, 3, C.button); } for (let x = 0; x < 32; x++) px(x, 6, C.blazerDark); }
  });
}
function knitTexture(base, dark) {
  return makeTex(16, 16, (px, ctx) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, 16, 16);
    for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) px(x, y, dark);
  });
}
function warmerTexture() {
  const r = rng(7);
  return makeTex(32, 32, (px, ctx) => {
    ctx.fillStyle = C.warmer; ctx.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 4) for (let x = 0; x < 32; x++) if ((x + Math.floor(r() * 3)) % 9 !== 0) px(x, y + (x % 5 === 0 ? 1 : 0), C.warmerShade);
    for (let x = 0; x < 32; x += 2) for (let y = 0; y < 32; y++) if (y % 4 === 2) px(x, y, '#ffffff');
  });
}
function shoeTexture() {
  // u around (16 = top centre after rot), v heel(0)..toe(1)
  return makeTex(32, 32, (px, ctx) => {
    ctx.fillStyle = C.shoe; ctx.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if ((x + y) % 7 === 0) px(x, y, C.shoeLight);
    // toe cap (front ~ top rows of canvas)
    for (let y = 0; y < 6; y++) for (let x = 6; x < 26; x++) px(x, y, C.shoeSole);
    for (let x = 6; x < 26; x++) px(x, 6, '#b8b8b4');
    // laces up the top
    for (let y = 9; y < 28; y += 3) { for (let k = -3; k <= 3; k++) px(16 + k, y + (Math.abs(k) > 1 ? 0 : 1), C.lace); }
    for (let y = 9; y < 28; y++) { px(12, y, '#0e0e12'); px(20, y, '#0e0e12'); }
  });
}
function skirtTexture() {
  return makeTex(48, 16, (px, ctx) => {
    ctx.fillStyle = C.skirt; ctx.fillRect(0, 0, 48, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 48; x += 2) px(x, y, C.skirtDark);
  });
}
function hairStrandTexture(withShine) {
  // u across strand, v along (v=0 root is the bottom row of the canvas)
  return makeTex(16, 64, (px, ctx) => {
    ctx.fillStyle = C.hair; ctx.fillRect(0, 0, 16, 64);
    for (let y = 0; y < 64; y++) {
      px(0, y, C.hairDark); px(1, y, C.hairDark); px(15, y, C.hairDark); px(14, y, C.hairDark);
      px(7, y, C.hairLight); px(8, y, C.hairLight);
      if (y % 9 < 5) px(4, y, C.hairDark); if (y % 7 < 3) px(11, y, C.hairLight);
    }
    if (withShine) for (let y = 46; y < 51; y++) for (let x = 3; x < 13; x++) px(x, y, (y === 46 || y === 50) ? C.hairLight : C.hairShine);
  });
}
function hairCapTexture() {
  // u = azimuth, v = elevation (canvas top = crown)
  return makeTex(64, 32, (px, ctx) => {
    ctx.fillStyle = C.hair; ctx.fillRect(0, 0, 64, 32);
    for (let x = 0; x < 64; x += 4) for (let y = 0; y < 32; y++) px(x + ((y >> 3) & 1), y, C.hairDark);
    for (let x = 2; x < 64; x += 8) for (let y = 4; y < 32; y++) px(x, y, C.hairLight);
    // angel ring
    for (let x = 0; x < 64; x++) { const y0 = 8 + ((x >> 2) % 2); if (x % 8 < 6) { px(x, y0, C.hairShine); px(x, y0 + 1, C.hairLight); } }
  });
}

// ---------------- head shape ----------------
export const HEAD = { C: V(0, 0.085, 0.012), rx: 0.100, ry: 0.115, rz: 0.103 };
function deform(d) {
  // unit direction -> point on the head relative to its centre
  let X = d.x * HEAD.rx, Y = d.y * HEAD.ry, Z = d.z * HEAD.rz;
  if (d.y < 0) {
    Y *= 0.84;
    const k = Math.pow(-d.y, 1.6);
    X *= 1 - 0.36 * k;
    if (d.z > 0) Z *= 1 - 0.12 * k; else Z *= 1 - 0.35 * (-d.y);
  }
  if (d.z > 0) Z *= 0.93;
  return V(X, Y, Z);
}
// point on the head surface (head-local) at elevation/azimuth in degrees, pushed out by `off` metres
export function surf(el, az, off = 0) {
  const e = el * DEG, a = az * DEG;
  const d = V(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a));
  const p = deform(d);
  const n = p.clone().normalize();
  return p.add(n.multiplyScalar(off)).add(HEAD.C);
}

function headGeometry() {
  const g = new THREE.SphereGeometry(1, 16, 12);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const d = V(p.getX(i), p.getY(i), p.getZ(i));
    const q = deform(d);
    p.setXYZ(i, q.x + HEAD.C.x, q.y + HEAD.C.y, q.z + HEAD.C.z);
    // planar front projection of the face texture
    if (d.z > -0.2) uv.setXY(i, q.x / (2 * HEAD.rx) + 0.5, q.y / (2 * HEAD.ry) + 0.5);
    else uv.setXY(i, 0.02, 0.4);
  }
  g.computeVertexNormals();
  return g;
}

function capGeometry() {
  const g0 = new THREE.SphereGeometry(1, 18, 12).toNonIndexed();
  const p = g0.attributes.position;
  const pos = [], uv = [];
  for (let i = 0; i < p.count; i += 3) {
    const ds = [0, 1, 2].map((k) => V(p.getX(i + k), p.getY(i + k), p.getZ(i + k)));
    const c = ds[0].clone().add(ds[1]).add(ds[2]).multiplyScalar(1 / 3);
    const face = c.z > 0.1 && c.y < 0.5 && Math.abs(c.x) < (c.y < -0.25 ? 0.86 : 0.58);
    const uc = Math.atan2(c.x, -c.z) / (2 * Math.PI) + 0.5;
    if (face || c.y < -0.62 || (c.z > -0.2 && c.y < -0.2)) continue;
    for (const d of ds) {
      const q = deform(d);
      const n = q.clone().normalize();
      q.addScaledVector(n, 0.011).add(HEAD.C);
      pos.push(q.x, q.y, q.z);
      let u = Math.hypot(d.x, d.z) < 1e-3 ? uc : Math.atan2(d.x, -d.z) / (2 * Math.PI) + 0.5;
      if (u - uc > 0.5) u -= 1; else if (uc - u > 0.5) u += 1;
      uv.push(u * 2, (d.y + 1) / 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// Hair strand along head-surface waypoints [el, az, off] then free points
function headStrand(way, free, w0, th, opt = {}) {
  const pts = way.map(([e, a, o]) => surf(e, a, o));
  for (const f of free) pts.push(V(...f));
  const n = pts.length;
  const widths = pts.map((_, i) => { const s = i / (n - 1); return i === n - 1 ? 0.0008 : w0 * (opt.taper ? (1 - s * opt.taper) : 1); });
  const thick = pts.map((_, i) => (i === n - 1 ? 0.001 : th));
  const normals = pts.map((p) => p.clone().sub(HEAD.C).setY((p.y - HEAD.C.y) * 0.3).normalize());
  return strand(pts, widths, thick, normals, { v0: 0 });
}

// ---------------- build ----------------
export function buildCharacter(opts = {}) {
  const o = { ...OPTIONS, ...opts };
  const M = {
    skin: mat({ color: C.skin, emissive: C.skin, emissiveIntensity: 0.2 }),
    face: mat({ map: faceTexture('neutral'), emissive: '#ffffff', emissiveIntensity: 0.2 }),
    blazer: mat({ map: blazerTexture() }),
    sleeve: mat({ map: sleeveTexture(false) }),
    sleeveCuff: mat({ map: sleeveTexture(true) }),
    cardigan: mat({ map: knitTexture(C.cardigan, C.cardiganDark) }),
    shirt: mat(C.shirt),
    skirt: mat({ map: skirtTexture(), flat: true, double: true }),
    under: mat(C.skirtDark),
    warmer: mat({ map: warmerTexture(), flat: true }),
    shoe: mat({ map: shoeTexture() }),
    sole: mat(C.shoeSole),
    hair: mat({ map: hairStrandTexture(false), flat: true, double: true }),
    hairShine: mat({ map: hairStrandTexture(true), flat: true, double: true }),
    hairCap: mat({ map: hairCapTexture(), flat: true }),
    tie: mat({ map: makeTex(8, 32, (px, ctx) => { ctx.fillStyle = C.tieNavy; ctx.fillRect(0, 0, 8, 32); for (let y = -8; y < 40; y += 6) for (let x = 0; x < 8; x++) { px(x, y + x * 0.6, C.tieRed); px(x, y + 1 + x * 0.6, C.tieRed); px(x, y + 2 + x * 0.6, C.tieLight); } }) }),
    glasses: mat(C.glasses),
    shadow: null,
  };
  const mesh = (g, m, parent) => { const x = new THREE.Mesh(g, m); parent.add(x); return x; };
  const grp = (name, parent, x = 0, y = 0, z = 0, order = 'XZY') => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); g.rotation.order = order; parent.add(g); return g; };

  const root = new THREE.Group(); root.name = 'character';
  const J = {};
  J.hips = grp('hips', root, 0, B.hipY, 0, 'YXZ');
  J.spine = grp('spine', J.hips, 0, B.waistY, 0, 'YXZ');
  J.neck = grp('neck', J.spine, 0, B.neckY, 0, 'YXZ');
  J.head = grp('head', J.neck, 0, B.neckLen, 0, 'YXZ');
  const headModel = grp('headModel', J.head); headModel.scale.setScalar(B.headScale);

  // --- torso (spine space, origin at the waist) ---
  const torsoRings = [
    { y: -0.12, w: 0.162, df: 0.112, db: 0.104 },
    { y: -0.07, w: 0.152, df: 0.102, db: 0.096 },
    { y: 0.0, w: 0.136, df: 0.092, db: 0.088 },
    { y: 0.09, w: 0.146, df: 0.1, db: 0.09 },
    { y: 0.17, w: 0.15, df: 0.106, db: 0.094 },
    { y: 0.25, w: 0.158, df: 0.094, db: 0.09 },
    { y: 0.3, w: 0.158, df: 0.074, db: 0.08 },
    { y: 0.338, w: 0.08, df: 0.052, db: 0.055 },
  ];
  mesh(loft(torsoRings, { sides: 12, capTop: true }), M.blazer, J.spine);
  const frontZ = (y) => { // torso front surface depth at height y (centre line)
    for (let i = 0; i < torsoRings.length - 1; i++) { const a = torsoRings[i], b = torsoRings[i + 1]; if (y >= a.y && y <= b.y) { const t = (y - a.y) / (b.y - a.y); return a.df + (b.df - a.df) * t; } }
    return 0.09;
  };
  // necktie: loose knot + blade lying on the shirt
  const tieTop = 0.295, tieBot = 0.06;
  const tieG = loft([
    { y: tieBot, w: 0.004, d: 0.003, z: frontZ(tieBot) + 0.004 },
    { y: tieBot + 0.02, w: 0.019, d: 0.004, z: frontZ(tieBot + 0.02) + 0.005 },
    { y: 0.2, w: 0.016, d: 0.004, z: frontZ(0.2) + 0.005 },
    { y: tieTop - 0.02, w: 0.011, d: 0.004, z: frontZ(tieTop - 0.02) + 0.007 },
  ], { sides: 4, rot: Math.PI / 4 });
  mesh(tieG, M.tie, J.spine);
  const knot = mesh(new THREE.BoxGeometry(0.024, 0.022, 0.016), mat(C.tieNavy), J.spine); knot.position.set(0, tieTop - 0.008, frontZ(tieTop) + 0.012); knot.rotation.x = -0.25;
  // shirt collar wings
  for (const s of [-1, 1]) {
    const cg = new THREE.BufferGeometry();
    const yb = 0.325, zf = 0.05;
    cg.setAttribute('position', new THREE.Float32BufferAttribute([
      s * 0.012, yb + 0.012, zf + 0.012, s * 0.05, yb + 0.022, zf - 0.008, s * 0.03, yb - 0.035, zf + 0.022,
    ], 3));
    cg.computeVertexNormals();
    mesh(cg, mat({ color: C.shirt, double: true }), J.spine);
  }
  // collar band around the neck
  mesh(loft([{ y: 0.318, w: 0.05, df: 0.05, db: 0.046 }, { y: 0.352, w: 0.044, df: 0.044, db: 0.042 }], { sides: 10 }), M.shirt, J.spine);
  // neck
  const neckM = mesh(loft([{ y: -0.04, w: 0.035, d: 0.034 }, { y: 0.07, w: 0.032, d: 0.031 }], { sides: 8 }), M.skin, J.neck);

  // --- pelvis / underskirt (hips space) ---
  mesh(loft([{ y: -0.15, w: 0.13, d: 0.09 }, { y: 0.0, w: 0.135, d: 0.092 }, { y: 0.12, w: 0.135, d: 0.093 }], { sides: 10, capBottom: true }), M.under, J.hips);

  // --- skirt (deformable) ---
  const skirt = buildSkirt(M.skirt);
  J.hips.add(skirt.mesh);

  // --- arms ---
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    const sh = J['arm' + side] = grp('arm' + side, J.spine, sx * B.shoulderX, B.shoulderY, -0.005, 'XZY');
    mesh(loft([
      { y: 0.03, w: 0.03, d: 0.03 }, { y: 0.0, w: 0.048, d: 0.047 }, { y: -0.06, w: 0.046, d: 0.045 },
      { y: -B.upperArm, w: 0.041, d: 0.04 },
    ], { sides: 8, capTop: true }), M.sleeve, sh);
    const el = J['elbow' + side] = grp('elbow' + side, sh, 0, -B.upperArm, 0, 'XYZ');
    mesh(loft([
      { y: 0.03, w: 0.04, d: 0.039 }, { y: 0.0, w: 0.043, d: 0.041 }, { y: -0.12, w: 0.04, d: 0.038 },
      { y: -B.foreArm + 0.035, w: 0.042, d: 0.04 }, { y: -B.foreArm + 0.03, w: 0.03, d: 0.03 },
    ], { sides: 8, capBottom: true }), M.sleeveCuff, el);
    // cardigan cuff peeking out past the sleeve
    mesh(loft([{ y: -B.foreArm + 0.05, w: 0.036, d: 0.034 }, { y: -B.foreArm + 0.005, w: 0.035, d: 0.033 }], { sides: 8, capBottom: true }), M.cardigan, el);
    const wr = J['hand' + side] = grp('hand' + side, el, 0, -B.foreArm, 0, 'XZY');
    buildHand(wr, side, M.skin, J);
  }

  // --- legs ---
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    const lg = J['leg' + side] = grp('leg' + side, J.hips, sx * B.hipJointX, B.hipJointY, 0, 'XZY');
    mesh(loft([
      { y: 0.06, w: 0.07, d: 0.07 }, { y: -0.08, w: 0.072, d: 0.072 }, { y: -0.24, w: 0.058, d: 0.06 },
      { y: -B.thigh, w: 0.046, d: 0.05 },
    ], { sides: 8 }), M.skin, lg);
    const kn = J['knee' + side] = grp('knee' + side, lg, 0, -B.thigh, 0, 'XZY');
    mesh(loft([
      { y: 0.02, w: 0.045, d: 0.049 }, { y: -0.09, w: 0.048, d: 0.054 }, { y: -0.2, w: 0.04, d: 0.044 },
      { y: -B.shin + 0.01, w: 0.031, d: 0.033 },
    ], { sides: 8 }), M.skin, kn);
    // loose bunched leg warmers
    const wr = [];
    const bumps = [0.048, 0.055, 0.052, 0.057, 0.054, 0.059, 0.056, 0.06, 0.057];
    for (let i = 0; i < bumps.length; i++) wr.push({ y: -0.165 - i * 0.026, w: bumps[i], d: bumps[i] * 1.03, z: 0.004 });
    mesh(loft(wr, { sides: 9 }), M.warmer, kn);
    const an = J['foot' + side] = grp('foot' + side, kn, 0, -B.shin, 0, 'XZY');
    const shoeG = grp('shoe' + side, an); shoeG.scale.set(0.82, 0.9, 0.86); shoeG.position.y = -B.ankleH * 0.1;
    buildShoe(shoeG, M);
  }

  // --- head ---
  const headMesh = mesh(headGeometry(), M.face, headModel);
  buildHair(headModel, J.spine, M);
  const glasses = buildGlasses(headModel, M.glasses);
  glasses.visible = !!o.glasses;

  // anchors for props
  const anchors = {};
  for (const side of ['L', 'R']) {
    const a = new THREE.Group(); a.name = 'grip' + side;
    a.position.set(side === 'L' ? -0.02 : 0.02, -0.075, 0.0);
    J['hand' + side].add(a); anchors['hand' + side] = a;
  }
  anchors.head = J.head; anchors.headModel = headModel; anchors.spine = J.spine; anchors.hips = J.hips;

  // sole markers for grounding
  const soles = [];
  for (const side of ['L', 'R']) for (const z of [-0.048, 0.138]) { const m = new THREE.Object3D(); m.position.set(0, -0.068, z); J['foot' + side].add(m); soles.push(m); }

  return { root, J, M, skirt, headMesh, glasses, anchors, soles, headModel };
}

function buildHand(wr, side, skinM, J) {
  const sx = side === 'L' ? 1 : -1;
  const m = (g, parent) => { const x = new THREE.Mesh(g, skinM); parent.add(x); return x; };
  // palm: thin in X (palm faces inward), wide in Z
  m(loft([{ y: 0.005, w: 0.016, d: 0.024 }, { y: -0.035, w: 0.018, d: 0.03 }, { y: -0.068, w: 0.015, d: 0.029 }], { sides: 6, capBottom: true }), wr);
  const mk = (name, z, w, l1, l2) => {
    const f1 = new THREE.Group(); f1.name = name + '1' + side; f1.position.set(0, -0.066, z); wr.add(f1);
    m(new THREE.BoxGeometry(0.016, l1, w).translate(0, -l1 / 2, 0), f1);
    const f2 = new THREE.Group(); f2.name = name + '2' + side; f2.position.set(0, -l1, 0); f1.add(f2);
    m(new THREE.BoxGeometry(0.014, l2, w * 0.95).translate(0, -l2 / 2, 0), f2);
    J[name + '1' + side] = f1; J[name + '2' + side] = f2;
  };
  mk('fing', -0.007, 0.032, 0.03, 0.026);
  mk('index', 0.018, 0.012, 0.031, 0.026);
  const th = new THREE.Group(); th.name = 'thumb' + side; th.position.set(-sx * 0.004, -0.018, 0.024); wr.add(th);
  m(new THREE.BoxGeometry(0.012, 0.05, 0.013).translate(0, -0.025, 0), th);
  J['thumb' + side] = th;
}

function buildShoe(an, M) {
  const h = B.ankleH;
  // high-top shaft (mostly hidden by the leg warmer)
  an.add(new THREE.Mesh(loft([{ y: -h + 0.02, w: 0.042, d: 0.046, z: 0.0 }, { y: 0.05, w: 0.04, d: 0.042 }], { sides: 8 }), M.shoe));
  // upper: lofted along +Z (built along Y then rotated)
  const up = loft([
    { y: -0.06, w: 0.03, d: 0.03, z: h - 0.035 },
    { y: -0.045, w: 0.04, d: 0.042, z: h - 0.03 },
    { y: 0.03, w: 0.043, d: 0.036, z: h - 0.036 },
    { y: 0.09, w: 0.045, d: 0.028, z: h - 0.044 },
    { y: 0.14, w: 0.04, d: 0.02, z: h - 0.05 },
    { y: 0.165, w: 0.026, d: 0.014, z: h - 0.054 },
  ], { sides: 10, rot: Math.PI, capTop: true });
  up.rotateX(Math.PI / 2);
  an.add(new THREE.Mesh(up, M.shoe));
  // white rubber sole
  const so = loft([
    { y: -0.064, w: 0.033, d: 0.008, z: h - 0.004 },
    { y: -0.05, w: 0.044, d: 0.009, z: h - 0.004 },
    { y: 0.1, w: 0.048, d: 0.009, z: h - 0.004 },
    { y: 0.163, w: 0.032, d: 0.009, z: h - 0.004 },
    { y: 0.172, w: 0.012, d: 0.008, z: h - 0.004 },
  ], { sides: 10, capTop: true, capBottom: true });
  so.rotateX(Math.PI / 2);
  an.add(new THREE.Mesh(so, M.sole));
}

function buildHair(headModel, spine, M) {
  const cap = new THREE.Mesh(capGeometry(), M.hairCap); cap.name = 'hairCap';
  headModel.add(cap);
  const add = (g, m = M.hair, parent = headModel) => { const x = new THREE.Mesh(g, m); parent.add(x); return x; };

  // wispy see-through bangs: thin separated pieces, forehead visible between them
  const bangs = [
    // [azimuth, tip elevation, half-width, tip lean]
    [-46, 10, 0.012, 4], [-36, 3, 0.011, 2], [-27, 9, 0.009, -3], [-17, 0, 0.012, 3], [-8, 7, 0.009, -2],
    [1, 2, 0.011, 2], [10, 9, 0.009, -1], [19, 0, 0.012, -3], [29, 6, 0.01, 2], [38, 2, 0.011, -2], [47, 10, 0.012, -4],
  ];
  for (const [az, tip, w, lean] of bangs) {
    add(headStrand([[70, az * 0.6, 0.0], [56, az * 0.85, 0.014], [36, az, 0.013], [19, az + lean * 0.5, 0.009], [tip, az + lean, 0.006]], [], w, 0.005, { taper: 0.5 }), M.hairShine);
  }
  // side bangs that sweep down beside the eyes (frame the face)
  for (const s of [-1, 1]) {
    add(headStrand([[70, s * 34, 0.014], [45, s * 54, 0.016], [20, s * 63, 0.012], [-8, s * 67, 0.01], [-34, s * 70, 0.008]], [], 0.02, 0.008, { taper: 0.6 }), M.hairShine);
  }
  // long face-framing strands that fall in front of the shoulders
  for (const s of [-1, 1]) {
    for (const [az, dz, len, w] of [[74, 0.0, 0.0, 0.022], [84, -0.012, -0.03, 0.024]]) {
      add(headStrand([[62, s * (az - 25), 0.014], [35, s * az, 0.016], [8, s * (az + 4), 0.014]],
        [[s * 0.104, -0.03, 0.052 + dz], [s * 0.112, -0.11, 0.082 + dz], [s * 0.112, -0.18 + len, 0.093 + dz], [s * 0.104, -0.235 + len, 0.088 + dz]],
        w, 0.009, { taper: 0.4 }), M.hairShine);
    }
  }
  // layered side volume behind the ears
  for (const s of [-1, 1]) for (const [az, tipY, w] of [[100, -0.07, 0.03], [118, -0.1, 0.034], [138, -0.08, 0.034]]) {
    add(headStrand([[55, s * (az - 20), 0.014], [25, s * az, 0.018], [-10, s * (az + 3), 0.018]],
      [[s * 0.1 * Math.sin(az * DEG) * 1.05, tipY, 0.1 * Math.cos(az * DEG) + 0.0]], w, 0.01, { taper: 0.5 }));
  }
  // long back hair, attached to the spine so it stays down the back
  const hc = V(0, B.neckY + B.neckLen + HEAD.C.y * B.headScale, HEAD.C.z * B.headScale);
  const layers = [
    { n: 11, spread: 112, r: 1.0, tip: [0.02, 0.1], w: 0.034, out: 0.0 },
    { n: 8, spread: 95, r: 1.0, tip: [0.13, 0.2], w: 0.036, out: 0.012 },
  ];
  const R = rng(3);
  for (const L of layers) for (let i = 0; i < L.n; i++) {
    const ph = (-L.spread + (2 * L.spread * i) / (L.n - 1)) * DEG;
    const s = Math.sin(ph), c = Math.cos(ph);
    const tipY = L.tip[0] + (L.tip[1] - L.tip[0]) * R();
    const pts = [
      V(s * 0.105, hc.y + 0.03, hc.z - c * 0.1),
      V(s * 0.118, hc.y - 0.05, hc.z - c * 0.112 - 0.004 - L.out),
      V(s * 0.135, B.neckY - 0.01, -0.09 - c * 0.05 - L.out),
      V(s * 0.148, 0.2, -0.118 - c * 0.03 - L.out),
      V(s * 0.142, tipY + 0.06, -0.118 - c * 0.025 - L.out),
      V(s * 0.13, tipY, -0.112 - c * 0.02 - L.out),
    ];
    const n = pts.length;
    const widths = pts.map((_, k) => (k === n - 1 ? 0.001 : L.w * (k === n - 2 ? 0.6 : 1)));
    const thick = pts.map((_, k) => (k === n - 1 ? 0.001 : 0.012));
    const normals = pts.map((p) => V(p.x, 0, p.z + 0.02).normalize());
    add(strand(pts, widths, thick, normals), M.hair, spine);
  }
}

function buildGlasses(headModel, m) {
  const g = new THREE.Group(); g.name = 'glasses';
  const ey = HEAD.ry * 2 * (0.5 - FACE.eyeY / FACE.size) + 0.001;
  const ex = (FACE.eyeDX / FACE.size) * 2 * HEAD.rx;
  const hw = 0.026, hh = 0.019, r = 0.0016;
  const zAt = (x) => surf(0, Math.asin(Math.max(-1, Math.min(1, x / HEAD.rx))) / DEG, 0).z;
  for (const s of [-1, 1]) {
    const pts = [];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const c = Math.cos(a), sn = Math.sin(a);
      const x = s * ex + hw * Math.sign(c) * Math.pow(Math.abs(c), 0.6);
      const y = ey + hh * Math.sign(sn) * Math.pow(Math.abs(sn), 0.6);
      pts.push(V(x, y + HEAD.C.y, zAt(x) + 0.016));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 3, true), m));
    // temple arm to behind the hair
    const ox = s * (ex + hw), p0 = V(ox, ey + HEAD.C.y + 0.006, zAt(ox) + 0.012);
    const p1 = V(s * 0.104, ey + HEAD.C.y + 0.012, HEAD.C.z - 0.01);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 2, r, 3, false), m));
  }
  // bridge
  const b0 = V(-(ex - hw), ey + HEAD.C.y + 0.006, zAt(0) + 0.018), b1 = V(ex - hw, ey + HEAD.C.y + 0.006, zAt(0) + 0.018);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(b0, V(0, ey + HEAD.C.y + 0.01, zAt(0) + 0.02), b1), 4, r, 3, false), m));
  headModel.add(g);
  return g;
}

// ---------------- skirt ----------------
const SK = { N: 28, M: 4, top: 0.115, len: 0.43, w0: 0.138, d0: 0.096, w1: 0.205, d1: 0.175, pleat: 0.012 };
function buildSkirt(m) {
  const { N, M: Mr } = SK;
  const rest = [];
  const pos = new Float32Array((N + 1) * Mr * 3), uv = [];
  const idx = [];
  for (let j = 0; j < Mr; j++) for (let k = 0; k <= N; k++) {
    const u = k / N, a = 2 * Math.PI * u - Math.PI;
    const s = j / (Mr - 1);
    rest.push({ a, s, pleat: (k % 2 ? 1 : -1) });
    uv.push(u, 1 - s);
  }
  for (let j = 0; j < Mr - 1; j++) for (let k = 0; k < N; k++) {
    const a = j * (N + 1) + k, b = a + 1, c = a + N + 1, d = c + 1;
    idx.push(a, d, b, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, m); mesh.name = 'skirt'; mesh.frustumCulled = false;
  return { mesh, rest, g };
}

// Re-shape the skirt so it clears the thighs. legs: [{hip: Vector3, dir: Vector3}] in hips space.
export function updateSkirt(skirt, legs) {
  const { N, M: Mr, top, len, w0, d0, w1, d1, pleat } = SK;
  const pos = skirt.g.attributes.position.array;
  const tilt = new Float32Array(N + 1);
  const L = new Float32Array(N + 1);
  for (let k = 0; k <= N; k++) {
    const a = skirt.rest[k].a, sa = Math.sin(a), ca = Math.cos(a);
    const wx = sa * w0, wz = ca * d0;
    const hx = sa * w1, hz = ca * d1;
    const dirx = hx - wx, dirz = hz - wz;
    const out = Math.hypot(dirx, dirz);
    let t0 = Math.atan2(out, len);
    L[k] = Math.hypot(out, len);
    const dx = sa, dz = ca;
    let t = t0;
    for (const lg of legs) for (const f of [0.18, 0.3, 0.42]) {
      // a point on the top/outer surface of the thigh
      const px = lg.hip.x + lg.dir.x * f + dx * 0.07, py = lg.hip.y + lg.dir.y * f + 0.06, pz = lg.hip.z + lg.dir.z * f + dz * 0.07;
      const vx = px - wx, vy = py - top, vz = pz - wz;
      const hor = Math.hypot(vx, vz);
      if (hor < 1e-4) continue;
      const align = (vx * dx + vz * dz) / hor;
      let w = Math.min(1, Math.max(0, (align - 0.72) / 0.22));
      if (w <= 0) continue;
      w = w * w;
      const req = Math.atan2(hor, -vy);
      const want = t0 + (req - t0) * w;
      if (want > t) t = want;
    }
    tilt[k] = Math.min(t, 1.55);
  }
  // smooth around the ring
  const sm = new Float32Array(N + 1);
  for (let k = 0; k <= N; k++) {
    const p = (k + N - 1) % N, n = (k + 1) % N;
    sm[k] = Math.max(tilt[k], 0.25 * tilt[p] + 0.5 * tilt[k] + 0.25 * tilt[n]);
  }
  sm[N] = sm[0];
  for (let j = 0; j < Mr; j++) for (let k = 0; k <= N; k++) {
    const i = j * (N + 1) + k;
    const r = skirt.rest[i];
    const sa = Math.sin(r.a), ca = Math.cos(r.a);
    const wx = sa * w0, wz = ca * d0;
    const t = sm[k];
    const l = L[k] * r.s;
    const pl = r.pleat * pleat * r.s;
    // when the panel lies over a raised thigh, drape the part past the knee downwards
    const lk = 0.42 * Math.min(1, 0.75 / Math.max(0.3, Math.sin(t)) * 0.8 + 0.2), drape = Math.min(1, Math.max(0, (t - 0.45) / 0.4));
    const l1 = drape > 0 ? Math.min(l, lk + (1 - drape) * 1) : l, l2 = l - l1;
    const t2 = t + (0.3 - t) * drape;
    const out = Math.sin(t) * l1 + Math.sin(t2) * l2 + pl;
    pos[i * 3] = wx + sa * out;
    pos[i * 3 + 1] = top - Math.cos(t) * l1 - Math.cos(t2) * l2;
    pos[i * 3 + 2] = wz + ca * out;
  }
  skirt.g.attributes.position.needsUpdate = true;
  skirt.g.computeVertexNormals();
  skirt.g.computeBoundingSphere();
}
