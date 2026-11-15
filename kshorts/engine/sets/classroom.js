// Placeholder set: the back corner of a Korean classroom (windows on the left, chalkboard behind).
import * as THREE from 'three';
import { makeTex, mat, rng, shade } from '../util.js';
import { pixelText } from '../text.js';

// Korean school desk and chair; usable from any scene: makeDesk(E.scene, x, z, ry)
export function makeDesk(S, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  const wood = mat('#d9b07a'), metal = mat('#5c6f68');
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.035, 0.46), wood); top.position.y = 0.72; g.add(top);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.38), metal); shelf.position.set(0, 0.63, -0.02); g.add(shelf);
  for (const sx of [-0.3, 0.3]) for (const sz of [-0.19, 0.19]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.7, 0.03), metal); l.position.set(sx, 0.35, sz); g.add(l); }
  return g;
}
export function makeChair(S, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  const wood = mat('#cf9f66'), metal = mat('#5c6f68');
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.38), wood); seat.position.y = 0.43; g.add(seat);
  const backr = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.03), wood); backr.position.set(0, 0.7, -0.19); g.add(backr);
  for (const sx of [-0.18, 0.18]) for (const sz of [-0.17, 0.17]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.43, 0.025), metal); l.position.set(sx, 0.215, sz); g.add(l); }
  for (const sx of [-0.18, 0.18]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.32, 0.025), metal); p.position.set(sx, 0.6, -0.19); g.add(p); }
  return g;
}

export function classroom(E, { seed = 4, deskChair = true } = {}) {
  const S = E.scene;
  const R = rng(seed);
  S.background = new THREE.Color('#cfe3f2');
  const add = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); S.add(o); return o; };

  // floor: wooden planks
  const floorTex = makeTex(64, 64, (px, ctx) => {
    const cols = ['#b07a48', '#a8703f', '#b98552', '#9f6a3c'];
    for (let r = 0; r < 8; r++) {
      ctx.fillStyle = cols[r % 4]; ctx.fillRect(0, r * 8, 64, 8);
      ctx.fillStyle = '#7b4f2b'; ctx.fillRect(0, r * 8 + 7, 64, 1);
      const off = Math.floor(R() * 64); ctx.fillRect(off, r * 8, 1, 7);
      for (let k = 0; k < 10; k++) px(Math.floor(R() * 64), r * 8 + 1 + Math.floor(R() * 6), shade(cols[r % 4], -0.12));
    }
  }, { repeat: [5, 5] });
  const floor = add(new THREE.PlaneGeometry(10, 10), mat({ map: floorTex }));
  floor.rotation.x = -Math.PI / 2;

  // walls
  const wallTex = makeTex(32, 32, (px, ctx) => { ctx.fillStyle = '#efe7d3'; ctx.fillRect(0, 0, 32, 32); for (let k = 0; k < 30; k++) px(Math.floor(R() * 32), Math.floor(R() * 32), '#e4dbc4'); }, { repeat: [8, 3] });
  const wainTex = makeTex(32, 16, (px, ctx) => { ctx.fillStyle = '#8eaa96'; ctx.fillRect(0, 0, 32, 16); ctx.fillStyle = '#7d9884'; ctx.fillRect(0, 0, 1, 16); ctx.fillRect(16, 0, 1, 16); }, { repeat: [10, 1] });
  const wallM = mat({ map: wallTex });
  const back = add(new THREE.PlaneGeometry(10, 3.2), wallM, 0, 1.6, -2.6);
  const left = add(new THREE.PlaneGeometry(10, 3.2), wallM, -2.8, 1.6, 0); left.rotation.y = Math.PI / 2;
  add(new THREE.BoxGeometry(10, 0.9, 0.04), mat({ map: wainTex }), 0, 0.45, -2.58);
  const lw = add(new THREE.BoxGeometry(10, 0.9, 0.04), mat({ map: wainTex }), -2.78, 0.45, 0); lw.rotation.y = Math.PI / 2;
  add(new THREE.BoxGeometry(10, 0.05, 0.07), mat('#7a5232'), 0, 0.92, -2.56);
  const rl = add(new THREE.BoxGeometry(10, 0.05, 0.07), mat('#7a5232'), -2.76, 0.92, 0); rl.rotation.y = Math.PI / 2;
  // ceiling with fluorescent lights
  const ceil = add(new THREE.PlaneGeometry(10, 10), mat('#e9e6df'), 0, 3.2, 0); ceil.rotation.x = Math.PI / 2;
  for (const z of [-1.6, 0.6]) add(new THREE.BoxGeometry(1.2, 0.04, 0.16), mat({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.9 }), 0.2, 3.17, z);

  // chalkboard on the back wall
  const boardTex = makeTex(128, 48, (px, ctx) => {
    ctx.fillStyle = '#2f5a47'; ctx.fillRect(0, 0, 128, 48);
    for (let k = 0; k < 120; k++) px(Math.floor(R() * 128), Math.floor(R() * 48), '#3a6a55');
    const t1 = pixelText('자습', { font: 'bold', color: '#e8efe6', outline: null });
    ctx.drawImage(t1, 10, 8);
    const t2 = pixelText('11월 15일', { font: 'small', color: '#e8efe6', outline: null });
    ctx.drawImage(t2, 98 - t2.width / 2, 6);
    ctx.fillStyle = '#cfdccf'; for (let k = 0; k < 4; k++) ctx.fillRect(12, 26 + k * 5, 30 + Math.floor(R() * 40), 1);
    ctx.fillStyle = '#f2d36b'; ctx.fillRect(84, 22, 22, 1); ctx.fillRect(84, 22, 1, 12);
  });
  add(new THREE.BoxGeometry(2.7, 1.05, 0.04), mat('#7a5232'), 0.4, 1.55, -2.57);
  add(new THREE.PlaneGeometry(2.6, 0.95), mat({ map: boardTex }), 0.4, 1.55, -2.545);
  add(new THREE.BoxGeometry(2.6, 0.04, 0.08), mat('#8a6a48'), 0.4, 1.02, -2.53);
  // bulletin board with notices
  const noticeTex = makeTex(48, 32, (px, ctx) => {
    ctx.fillStyle = '#b98a5a'; ctx.fillRect(0, 0, 48, 32);
    const papers = [[3, 3, 12, 15, '#ffffff'], [18, 2, 12, 12, '#fff3a8'], [33, 4, 12, 16, '#ffffff'], [6, 20, 16, 10, '#ffd3d3'], [27, 18, 14, 11, '#cfe8ff']];
    for (const [x, y, w, h, c] of papers) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#9aa0aa'; for (let k = 2; k < h - 2; k += 2) ctx.fillRect(x + 2, y + k, w - 4 - (k % 3), 1); px(x + w / 2, y, '#d83a3a'); }
  });
  add(new THREE.PlaneGeometry(1.1, 0.75), mat({ map: noticeTex }), 2.3, 1.6, -2.575);

  // windows along the left wall
  const winTex = makeTex(32, 32, (px, ctx) => {
    for (let y = 0; y < 32; y++) { ctx.fillStyle = y < 18 ? (y < 8 ? '#a9d4f5' : '#c4e2f8') : '#8cc08a'; ctx.fillRect(0, y, 32, 1); }
    ctx.fillStyle = '#5f9a64'; for (let k = 0; k < 6; k++) ctx.fillRect(k * 6, 14 - (k % 3) * 2, 5, 6);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(4, 4, 7, 2); ctx.fillRect(20, 6, 9, 2);
  });
  for (const z of [-1.7, -0.3, 1.1]) {
    const w = add(new THREE.PlaneGeometry(1.2, 1.3), mat({ map: winTex, emissive: '#ffffff', emissiveIntensity: 0.8 }), -2.775, 1.75, z); w.rotation.y = Math.PI / 2;
    const fm = mat('#d7dbe0');
    for (const dz of [-0.62, 0, 0.62]) add(new THREE.BoxGeometry(0.06, 1.36, 0.05), fm, -2.76, 1.75, z + dz);
    for (const dy of [-0.66, 0.66]) add(new THREE.BoxGeometry(0.06, 0.05, 1.3), fm, -2.76, 1.75 + dy, z);
    add(new THREE.BoxGeometry(0.16, 0.04, 1.3), mat('#c9cdd2'), -2.72, 1.08, z);
  }

  const d1 = makeDesk(S, 1.05, -0.9); if (deskChair) makeChair(S, 1.05, -0.45, Math.PI);
  makeDesk(S, -0.9, -1.6); makeChair(S, -0.9, -1.15, Math.PI);
  makeDesk(S, 1.4, -2.0);
  // lockers along the back-right
  const lockTex = makeTex(16, 16, (px, ctx) => { ctx.fillStyle = '#9fb3c2'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#7f93a3'; ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 0, 1, 16); ctx.fillRect(3, 3, 6, 1); ctx.fillRect(3, 5, 6, 1); px(12, 9, '#4a5864'); });
  for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.42, 0.42, 0.4), mat({ map: lockTex }), 2.0 + i * 0.43, 0.21, -2.38);
  for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.42, 0.42, 0.4), mat({ map: lockTex }), 2.0 + i * 0.43, 0.63, -2.38);

  E.lights({ sky: '#fff3e2', ground: '#7a6450', hemi: 2.2, sun: '#fff0d8', sunI: 1.5, sunDir: [-3, 3, 2], ambient: 0.4 });
  return { deskTop: [1.05, 0.74, -0.9], desk: d1, spots: { center: [0, 0], window: [-1.6, -0.5], board: [0.4, -1.8] } };
}
