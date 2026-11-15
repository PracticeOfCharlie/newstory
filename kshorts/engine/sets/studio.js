// Neutral backdrop for turntables and reference sheets.
import * as THREE from 'three';
import { makeTex, mat } from '../util.js';

export function studio(E, { color = '#b9c6d6', floor = '#d9d4cb' } = {}) {
  E.scene.background = new THREE.Color(color);
  const tex = makeTex(16, 16, (px, ctx) => { ctx.fillStyle = floor; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#c9c3b8'; ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 0, 1, 16); }, { repeat: [12, 12] });
  const f = new THREE.Mesh(new THREE.CircleGeometry(6, 24), mat({ map: tex }));
  f.rotation.x = -Math.PI / 2; E.scene.add(f);
  E.lights({ sunDir: [1.5, 3, 4] });
  return { floor: f };
}
