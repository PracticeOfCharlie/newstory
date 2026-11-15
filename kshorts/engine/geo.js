// Low-poly geometry builders.
import * as THREE from 'three';

// Loft a list of elliptical rings along Y.
// ring: { y, w (half width X), d (half depth Z) | df/db (front/back depth), x, z, v }
// UV: u goes around (0.5 = front, seam at the back), v = 0 at first ring .. 1 at last (or ring.v).
export function loft(rings, { sides = 8, capTop = false, capBottom = false, rot = 0 } = {}) {
  const pos = [], uv = [], idx = [];
  const n = rings.length;
  let total = 0; const acc = [0];
  for (let i = 1; i < n; i++) { total += Math.abs(rings[i].y - rings[i - 1].y) + 1e-6; acc.push(total); }
  for (let i = 0; i < n; i++) {
    const r = rings[i];
    const v = r.v ?? acc[i] / total;
    for (let k = 0; k <= sides; k++) {
      const u = k / sides;
      const a = 2 * Math.PI * u - Math.PI + rot;
      const s = Math.sin(a), c = Math.cos(a);
      const d = c >= 0 ? (r.df ?? r.d ?? r.w) : (r.db ?? r.d ?? r.w);
      const w = s >= 0 ? (r.wl ?? r.w) : (r.wr ?? r.w);
      pos.push((r.x || 0) + s * w, r.y, (r.z || 0) + c * d);
      uv.push(u, v);
    }
  }
  const row = sides + 1;
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) {
    const a = i * row + k, b = a + 1, c = a + row, d = c + 1;
    if (rings[i + 1].y >= rings[i].y) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d);
  }
  const up = rings[n - 1].y >= rings[0].y;
  const addCap = (ri, top) => {
    const r = rings[ri];
    const ci = pos.length / 3;
    pos.push(r.x || 0, r.y, r.z || 0); uv.push(0.5, ri === 0 ? 0 : 1);
    for (let k = 0; k < sides; k++) {
      const a = ri * row + k, b = a + 1;
      const outward = top === up;
      if (outward) idx.push(ci, a, b); else idx.push(ci, b, a);
    }
  };
  if (capTop) addCap(n - 1, true);
  if (capBottom) addCap(0, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Box with per-face UVs covering the whole texture on each face.
export function box(w, h, d, { x = 0, y = 0, z = 0 } = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

// A tapered "strand": flattened ribbon swept along a polyline.
// pts: Vector3[], widths: number[], thick: number[], normals: Vector3[] (outward direction)
export function strand(pts, widths, thick, normals, { inner = 0.45, vScale = 1, v0 = 0 } = {}) {
  const n = pts.length;
  const rings = [];
  let len = 0; const L = [0];
  for (let i = 1; i < n; i++) { len += pts[i].distanceTo(pts[i - 1]); L.push(len); }
  for (let i = 0; i < n; i++) {
    const T = new THREE.Vector3().subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    const N0 = normals[i].clone().normalize();
    const S = new THREE.Vector3().crossVectors(T, N0).normalize();
    const N = new THREE.Vector3().crossVectors(S, T).normalize();
    const p = pts[i], w = widths[i], t = thick[i];
    rings.push([
      p.clone().addScaledVector(S, w),
      p.clone().addScaledVector(N, t),
      p.clone().addScaledVector(S, -w),
      p.clone().addScaledVector(N, -t * inner),
    ]);
  }
  const us = [0, 0.5, 1, 0.5];
  const pos = [], uv = [];
  const push = (v, u, vv) => { pos.push(v.x, v.y, v.z); uv.push(u, vv); };
  for (let i = 0; i < n - 1; i++) {
    const va = v0 + (L[i] / len) * vScale, vb = v0 + (L[i + 1] / len) * vScale;
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      const a = rings[i][k], b = rings[i][k2], c = rings[i + 1][k], d = rings[i + 1][k2];
      const ua = us[k], ub = k2 === 0 ? 1 : us[k2];
      push(a, ua, va); push(c, ua, vb); push(b, ub, va);
      push(b, ub, va); push(c, ua, vb); push(d, ub, vb);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

export function mergeInto(list) {
  // simple non-indexed merge of geometries that all have position+uv
  const pos = [], uv = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    pos.push(...g.attributes.position.array);
    uv.push(...g.attributes.uv.array);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
