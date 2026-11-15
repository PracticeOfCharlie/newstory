// Pose channels, the static pose library, arm IK and application of a pose to the rig.
// All angles are in degrees. Conventions (as seen from a camera in front of her):
//   armX.fwd   raise arm forward          armX.out  raise arm sideways      armX.twist  roll
//   elbowX.bend  bend forearm forward/up   elbowX.twist roll forearm
//   handX.bend  wrist flex, handX.side, handX.curl 0..1 (fist), handX.index 0..1 (index curl), handX.thumb 0..1
//   legX.fwd  swing leg forward, legX.out, legX.twist, kneeX.bend, footX.bend (+ = toes down), footX.flat 0..1 keep sole level
//   spine.bend + = lean forward, spine.side + = lean to her left (screen right), spine.turn + = turn to her left
//   head.nod + = look down, head.turn + = her left (screen right), head.tilt + = toward her left
//   hips.bend/side/turn like spine; body.ground 1 = feet planted on the floor, 0 = use body.y as hips height (sitting)
import * as THREE from 'three';
import { BODY as B } from './config.js';
import { DEG } from '../engine/util.js';

export const REST = {
  'body.ground': 1, 'body.y': B.hipY, 'body.dx': 0, 'body.dz': 0, idle: 1,
  'hips.bend': 0, 'hips.side': 0, 'hips.turn': 0,
  'spine.bend': 0, 'spine.side': 0, 'spine.turn': 0,
  'head.nod': 0, 'head.turn': 0, 'head.tilt': 0,
};
for (const s of ['L', 'R']) Object.assign(REST, {
  [`arm${s}.fwd`]: 2, [`arm${s}.out`]: 4, [`arm${s}.twist`]: 0,
  [`elbow${s}.bend`]: 10, [`elbow${s}.twist`]: 0,
  [`hand${s}.bend`]: 0, [`hand${s}.side`]: 0, [`hand${s}.curl`]: 0.3, [`hand${s}.index`]: 0.25, [`hand${s}.thumb`]: 0.2,
  [`leg${s}.fwd`]: 0, [`leg${s}.out`]: 2, [`leg${s}.twist`]: 0, [`knee${s}.bend`]: 0, [`foot${s}.bend`]: 0, [`foot${s}.flat`]: 1,
});

// Hand shapes
export const HANDS = {
  relaxed: { curl: 0.3, index: 0.25, thumb: 0.2 },
  open: { curl: 0.02, index: 0.0, thumb: 0.0 },
  fist: { curl: 1, index: 1, thumb: 0.9 },
  point: { curl: 1, index: 0, thumb: 0.8 },
  grip: { curl: 0.62, index: 0.58, thumb: 0.75 },
  pinch: { curl: 0.7, index: 0.35, thumb: 0.6 },
};
export function hand(side, shape) {
  const h = HANDS[shape]; const o = {};
  for (const k in h) o[`hand${side}.${k}`] = h[k];
  return o;
}

// ---------- 2-bone arm IK ----------
const SH = (s) => new THREE.Vector3((s === 'L' ? 1 : -1) * B.shoulderX, B.shoulderY, -0.005);
// target: wrist position in spine space [x,y,z]; pole: preferred elbow direction [x,y,z]
export function armIK(side, target, pole = [0, -0.3, -1]) {
  const sx = side === 'L' ? 1 : -1;
  const S = SH(side), T = new THREE.Vector3(...target);
  const l1 = B.upperArm, l2 = B.foreArm;
  const D = T.clone().sub(S); let d = D.length();
  d = Math.min(Math.max(d, Math.abs(l1 - l2) + 1e-3), (l1 + l2) * 0.999);
  const dir = D.normalize();
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const P = new THREE.Vector3(pole[0] * sx, pole[1], pole[2]);
  const pn = P.sub(dir.clone().multiplyScalar(P.dot(dir))).normalize();
  const E = S.clone().addScaledVector(dir, a).addScaledVector(pn, h);
  const W = S.clone().addScaledVector(dir, d);
  const A = E.clone().sub(S).normalize();
  const out = Math.asin(Math.max(-1, Math.min(1, sx * A.x)));
  const fwd = Math.atan2(A.z, -A.y);
  const R = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-fwd, 0, sx * out, 'XZY'));
  const F = W.clone().sub(E).normalize().applyMatrix4(R.clone().invert());
  const twist = Math.atan2(F.x, F.z);
  const bend = Math.acos(Math.max(-1, Math.min(1, -F.y)));
  return { [`arm${side}.fwd`]: fwd / DEG, [`arm${side}.out`]: out / DEG, [`arm${side}.twist`]: sx * twist / DEG, [`elbow${side}.bend`]: bend / DEG };
}

// ---------- static poses ----------
// Each is a partial override of REST; actions build on these.
export const POSES = {
  stand: {},
  relaxed: { 'hips.side': -3, 'spine.side': 2, 'legR.out': 4, 'legL.fwd': 6, 'kneeL.bend': 12, 'head.tilt': 3, 'armL.out': 9, 'armR.out': 8 },
  hands_on_hips: {
    ...armIK('L', [0.17, -0.02, -0.02], [1, 0.1, -0.6]), ...armIK('R', [-0.17, -0.02, -0.02], [1, 0.1, -0.6]),
    'elbowL.twist': -60, 'elbowR.twist': 60, 'handL.bend': -20, 'handR.bend': -20,
    ...hand('L', 'open'), ...hand('R', 'open'),
    'spine.bend': -4, 'head.tilt': 6, 'head.nod': -3, 'legL.out': 6, 'legR.out': 6,
  },
  point_fwd: {
    'armR.fwd': 80, 'armR.out': 12, 'armR.twist': 0, 'elbowR.bend': 8, ...hand('R', 'point'), 'handR.bend': 0,
    'spine.turn': -10, 'head.turn': 0, 'spine.bend': 2,
  },
  point_side: {
    'armL.fwd': 35, 'armL.out': 62, 'elbowL.bend': 8, 'armL.twist': -40, ...hand('L', 'point'),
    'head.turn': 25, 'spine.turn': 8, 'spine.side': -3,
  },
  point_up: {
    'armR.fwd': 150, 'armR.out': 8, 'elbowR.bend': 10, ...hand('R', 'point'), 'head.nod': -10, 'spine.side': 3,
  },
  talk_explain: {
    ...armIK('R', [-0.12, 0.14, 0.24], [1, -0.6, -0.2]), 'elbowR.twist': 70, ...hand('R', 'open'), 'handR.bend': -15,
  },
  talk_both: {
    ...armIK('R', [-0.2, 0.12, 0.2], [1, -0.7, 0]), ...armIK('L', [0.2, 0.12, 0.2], [1, -0.7, 0]),
    'elbowR.twist': 80, 'elbowL.twist': -80, ...hand('R', 'open'), ...hand('L', 'open'), 'handL.bend': -15, 'handR.bend': -15,
  },
  teach: {
    ...armIK('R', [-0.15, 0.36, 0.13], [1, -1, -0.2]), ...hand('R', 'point'), 'elbowR.twist': 20,
    ...armIK('L', [0.17, -0.02, -0.02], [1, 0.1, -0.6]), 'elbowL.twist': -60, 'handL.bend': -20, ...hand('L', 'open'),
    'head.tilt': -5, 'spine.side': -2,
  },
  surprised: {
    ...armIK('R', [-0.11, 0.24, 0.17], [1, -1, -0.1]), ...armIK('L', [0.11, 0.24, 0.17], [1, -1, -0.1]),
    ...hand('R', 'open'), ...hand('L', 'open'), 'elbowR.twist': 40, 'elbowL.twist': -40, 'handR.bend': 20, 'handL.bend': 20,
    'spine.bend': -10, 'head.nod': -6, 'kneeL.bend': 8, 'kneeR.bend': 8, 'legL.fwd': 4, 'legR.fwd': 4,
  },
  hold: {
    ...armIK('R', [-0.1, 0.2, 0.24], [1, -0.8, -0.2]), 'elbowR.twist': 10, ...hand('R', 'grip'), 'handR.bend': 0, 'handR.side': -10,
    'head.nod': 6,
  },
  reach_low: {
    'spine.bend': 32, 'head.nod': 15, 'hips.bend': 8, 'kneeL.bend': 14, 'kneeR.bend': 14, 'legL.fwd': 10, 'legR.fwd': 10,
    ...armIK('R', [-0.1, -0.15, 0.33], [1, -0.5, -0.4]), ...hand('R', 'open'), 'elbowR.twist': 0,
  },
  wave: {
    ...armIK('R', [-0.3, 0.55, 0.08], [1, -1, -0.2]), 'elbowR.twist': 0, ...hand('R', 'open'), 'handR.bend': -10, 'head.tilt': -6,
  },
  think: {
    ...armIK('R', [-0.03, 0.29, 0.15], [1, -1, 0.2]), ...hand('R', 'fist'), 'elbowR.twist': 40, 'handR.bend': 30,
    ...armIK('L', [0.05, 0.08, 0.14], [1, -0.4, 0]), 'elbowL.twist': -30, ...hand('L', 'relaxed'),
    'head.tilt': -8, 'head.nod': -4,
  },
  present: {
    ...armIK('L', [0.36, 0.1, 0.22], [1, -1, -0.3]), 'elbowL.twist': -80, ...hand('L', 'open'), 'handL.bend': -25,
    'spine.turn': 6, 'head.turn': 18, 'head.tilt': 4,
  },
  bow: {
    'spine.bend': 30, 'hips.bend': 10, 'head.nod': 10,
    ...armIK('R', [-0.04, -0.17, 0.12], [1, 0, 0.2]), ...armIK('L', [0.04, -0.17, 0.12], [1, 0, 0.2]),
  },
  sit: {
    'body.ground': 0, 'body.y': 0.5, 'body.dz': 0.0,
    'legL.fwd': 88, 'legR.fwd': 88, 'kneeL.bend': 86, 'kneeR.bend': 86, 'legL.out': 1, 'legR.out': 1,
    'spine.bend': -2, ...armIK('R', [-0.13, -0.08, 0.22], [1, 0, 0]), ...armIK('L', [0.13, -0.08, 0.22], [1, 0, 0]),
    'elbowR.twist': 30, 'elbowL.twist': -30,
  },
  // modest one-knee kneel (used for "crouch": looking at / picking something up from the floor)
  crouch: {
    'legL.fwd': 88, 'kneeL.bend': 95, 'legR.fwd': -12, 'kneeR.bend': 95, 'footR.flat': 0, 'footR.bend': 40, 'legL.out': 2, 'legR.out': 2,
    'spine.bend': 18, 'head.nod': 4,
    ...armIK('R', [-0.08, -0.12, 0.3], [1, -0.4, 0]), ...armIK('L', [0.12, -0.03, 0.27], [1, -0.4, 0]), 'elbowL.twist': -20,
  },
  walk_contact: { 'legL.fwd': 24, 'legR.fwd': -16, 'kneeR.bend': 12, 'armL.fwd': -14, 'armR.fwd': 18, 'elbowR.bend': 22 },
};

export function pose(name, extra = {}) {
  if (!POSES[name]) throw new Error('unknown pose ' + name);
  return { ...REST, ...POSES[name], ...extra };
}

export function blendPose(a, b, w) {
  const o = {};
  for (const k in a) o[k] = a[k];
  for (const k in b) o[k] = (a[k] ?? REST[k] ?? 0) + ((b[k]) - (a[k] ?? REST[k] ?? 0)) * w;
  return o;
}

// ---------- apply to rig ----------
const _v = new THREE.Vector3();
export function applyPose(rig, p) {
  const J = rig.J;
  const g = (k) => (p[k] ?? REST[k] ?? 0);
  J.hips.rotation.set(g('hips.bend') * DEG, g('hips.turn') * DEG, -g('hips.side') * DEG);
  J.spine.rotation.set(g('spine.bend') * DEG, g('spine.turn') * DEG, -g('spine.side') * DEG);
  const nod = g('head.nod'), turn = g('head.turn'), tilt = g('head.tilt');
  J.neck.rotation.set(nod * 0.3 * DEG, turn * 0.3 * DEG, -tilt * 0.3 * DEG);
  J.head.rotation.set(nod * 0.7 * DEG, turn * 0.7 * DEG, -tilt * 0.7 * DEG);
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    J['arm' + s].rotation.set(-g(`arm${s}.fwd`) * DEG, sx * g(`arm${s}.twist`) * DEG, sx * g(`arm${s}.out`) * DEG);
    J['elbow' + s].rotation.set(-g(`elbow${s}.bend`) * DEG, sx * g(`elbow${s}.twist`) * DEG, 0);
    J['hand' + s].rotation.set(-g(`hand${s}.bend`) * DEG, 0, sx * g(`hand${s}.side`) * DEG);
    const curl = g(`hand${s}.curl`), idx = g(`hand${s}.index`), th = g(`hand${s}.thumb`);
    J['fing1' + s].rotation.set(0, 0, -sx * curl * 85 * DEG); J['fing2' + s].rotation.set(0, 0, -sx * curl * 95 * DEG);
    J['index1' + s].rotation.set(0, 0, -sx * idx * 85 * DEG); J['index2' + s].rotation.set(0, 0, -sx * idx * 95 * DEG);
    J['thumb' + s].rotation.set((-25 - th * 25) * DEG, 0, -sx * (10 + th * 45) * DEG);
    const lf = g(`leg${s}.fwd`), kb = g(`knee${s}.bend`);
    J['leg' + s].rotation.set(-lf * DEG, sx * g(`leg${s}.twist`) * DEG, sx * g(`leg${s}.out`) * DEG);
    J['knee' + s].rotation.set(kb * DEG, 0, 0);
    const flatBend = lf - kb - g('hips.bend');
    const fl = g(`foot${s}.flat`);
    J['foot' + s].rotation.set((g(`foot${s}.bend`) * (1 - fl) + flatBend * fl) * DEG, 0, 0);
  }
  // hips height: blend between "feet on the floor" and an explicit height
  const ground = g('body.ground');
  J.hips.position.set(g('body.dx'), B.hipY, g('body.dz'));
  rig.root.updateMatrixWorld(true);
  let minY = Infinity;
  const inv = new THREE.Matrix4().copy(rig.root.matrixWorld).invert();
  for (const m of rig.soles) { _v.setFromMatrixPosition(m.matrixWorld).applyMatrix4(inv); minY = Math.min(minY, _v.y); }
  const groundedY = B.hipY - minY;
  J.hips.position.y = groundedY * ground + g('body.y') * (1 - ground);
  rig.root.updateMatrixWorld(true);
}
