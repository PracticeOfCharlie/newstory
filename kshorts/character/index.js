// Character API used by scenes:  const her = E.character({ x, z, ry, glasses })
import * as THREE from 'three';
import { buildCharacter, updateSkirt } from './build.js';
import { ACTIONS } from './actions.js';
import { REST, blendPose, applyPose } from './pose.js';
import { faceTexture, resolveFace } from './face.js';
import { lipsyncFromWords, mouthAt } from './lipsync.js';
import { ease, clamp, noise1, hash01, lerp, DEG, makeTex } from '../engine/util.js';
import { NAME } from './config.js';

const angLerp = (a, b, t) => { let d = ((b - a + 540) % 360) - 180; return a + d * t; };

export function createCharacter(E, opts = {}) {
  const rig = buildCharacter(opts);
  const seed = opts.seed ?? 1;
  E.scene.add(rig.root);
  // blob shadow
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({
    map: makeTex(16, 16, (px) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 7.5) px(x, y, d < 5 ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.25)'); } }),
    transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; sh.renderOrder = 1;
  rig.root.add(sh);

  const acts = [], moves = [], faces = [], looks = [], speech = [];
  let mouthTL = [];
  let blinking = opts.blink ?? true;
  moves.push({ t: -1e9, type: 'place', x: opts.x ?? 0, z: opts.z ?? 0, ry: opts.ry ?? 0 });
  acts.push({ t: -1e9, name: 'idle', params: {}, blend: 0 });
  faces.push({ t: -1e9, f: resolveFace('neutral'), replace: true });
  const sortT = (l) => l.sort((a, b) => a.t - b.t);

  const api = {
    name: NAME, rig, root: rig.root,
    // put her somewhere (instantly) at time t. ry in degrees, 0 = facing +Z
    place(t, { x, z, ry }) { moves.push({ t, type: 'place', x, z, ry }); sortT(moves); return api; },
    // walk to [x, z] between t0 and t1, then switch to action `then` (default idle)
    walk(t0, t1, to, { then = 'idle', thenParams = {}, face = null } = {}) {
      moves.push({ t: t0, t1, type: 'walk', to, face }); sortT(moves);
      api.act(t0, 'walk', {}, { blend: 0.25 });
      if (then) api.act(t1, then, thenParams, { blend: 0.35 });
      return api;
    },
    turn(t, ry, dur = 0.4) { moves.push({ t, type: 'turn', ry, dur }); sortT(moves); return api; },
    // play an action from time t (blending from whatever was playing)
    act(t, name, params = {}, { blend = 0.3 } = {}) {
      if (!ACTIONS[name]) throw new Error('unknown action ' + name);
      acts.push({ t, name, params, blend }); sortT(acts); return api;
    },
    // set the face from time t: preset name ('smug') replaces; an object ({mouth:'o'}) merges
    face(t, f) {
      if (typeof f === 'string' || f.preset) faces.push({ t, f: resolveFace(f), replace: true });
      else faces.push({ t, f, replace: false });
      sortT(faces); return api;
    },
    // lip-sync from word timings [{start, end, text}]
    say(words) { mouthTL = sortT(mouthTL.concat(lipsyncFromWords(words))); for (const w of words) speech.push([w.start, w.end + 0.05]); return api; },
    // or a raw viseme timeline [{t, mouth}] plus the time range it covers
    mouth(tl, range) { mouthTL = sortT(mouthTL.concat(tl)); speech.push(range || [tl[0].t, tl[tl.length - 1].t + 0.05]); return api; },
    // additive head aim: look(t, {turn, nod}) or look(t, null) to release
    look(t, l, dur = 0.35) { looks.push({ t, turn: l ? l.turn || 0 : 0, nod: l ? l.nod || 0 : 0, dur }); sortT(looks); return api; },
    blink(on) { blinking = on; return api; },
    glasses(on) { rig.glasses.visible = on; return api; },
    anchor(name) { const a = rig.anchors[name]; if (!a) throw new Error('unknown anchor ' + name); return a; },
    // convenience: pick a prop up off a table at time t (prop attaches to the right hand at t + 0.5)
    pickUp(t, prop, { offset, rot } = {}) { api.act(t, 'pickup', {}, { blend: 0.25 }); prop.attach(t + 0.5, { to: api, anchor: 'handR', offset, rot }); return api; },
    stateAt, poseAt, faceAt,
    update(t) {
      const st = stateAt(t);
      rig.root.position.set(st.x, 0, st.z);
      rig.root.rotation.y = st.ry * DEG;
      const p = poseAt(t, st);
      applyPose(rig, p);
      const J = rig.J;
      const legs = ['L', 'R'].map((s) => ({ hip: J['leg' + s].position.clone(), dir: new THREE.Vector3(0, -1, 0).applyQuaternion(J['leg' + s].quaternion) }));
      updateSkirt(rig.skirt, legs);
      const ft = faceTexture(faceAt(t)); rig.M.face.map = ft; rig.M.face.emissiveMap = ft;
    },
  };

  function stateAt(t) {
    let x = 0, z = 0, ry = 0, walking = false, dist = 0, walkFade = 1;
    for (const m of moves) {
      if (m.t > t) break;
      if (m.type === 'place') { x = m.x ?? x; z = m.z ?? z; ry = m.ry ?? ry; }
      else if (m.type === 'turn') { const k = ease.inOut((t - m.t) / m.dur); ry = angLerp(ry, m.ry, k); }
      else if (m.type === 'walk') {
        const dx = m.to[0] - x, dz = m.to[1] - z, len = Math.hypot(dx, dz);
        const dir = Math.atan2(dx, dz) / DEG;
        const T = m.t1 - m.t, tau = Math.min(t, m.t1) - m.t;
        const a = Math.min(0.3, T / 3), v = 1 / (T - a);
        const s = tau < a ? (v * tau * tau) / (2 * a) : tau < T - a ? v * (tau - a / 2) : 1 - (v * (T - tau) ** 2) / (2 * a);
        const startRy = ry;
        if (t < m.t1) {
          walking = true; dist = s * len;
          x += dx * s; z += dz * s;
          ry = angLerp(startRy, dir, ease.inOut(tau / 0.3));
          walkFade = clamp((T - tau) / 0.2);
        } else {
          x = m.to[0]; z = m.to[1];
          ry = m.face != null ? angLerp(dir, m.face, ease.inOut((t - m.t1) / 0.4)) : dir;
        }
      }
    }
    return { x, z, ry, walking, dist, walkFade };
  }

  function evalAct(i, t, st) {
    const a = acts[i];
    return ACTIONS[a.name](Math.max(0, t - a.t), a.params, { t, dist: st.dist, walking: st.walking, walkFade: st.walkFade });
  }
  function blended(i, t, st, depth) {
    const a = acts[i];
    const p = evalAct(i, t, st);
    if (i === 0 || depth > 3 || a.blend <= 0) return p;
    const w = ease.inOut((t - a.t) / a.blend);
    if (w >= 1) return p;
    return blendPose(blended(i - 1, t, st, depth + 1), p, w);
  }
  function poseAt(t, st = stateAt(t)) {
    let i = 0;
    for (let k = 0; k < acts.length; k++) if (acts[k].t <= t + 1e-9) i = k;
    const p = { ...REST, ...blended(i, t, st, 0) };
    // idle life: breathing + tiny head drift
    const amt = p.idle ?? 1;
    const br = Math.sin((t / 3.6) * Math.PI * 2);
    p['spine.bend'] += br * 0.8 * amt;
    p['armL.out'] += br * 0.8 * amt; p['armR.out'] += br * 0.8 * amt;
    p['head.nod'] += (noise1(t * 0.45, seed + 5) * 1.6 - br * 0.5) * amt;
    p['head.turn'] += noise1(t * 0.32, seed + 9) * 2.2 * amt;
    p['head.tilt'] += noise1(t * 0.38, seed + 13) * 1.6 * amt;
    // look offsets
    let lt = 0, ln = 0;
    for (const l of looks) { if (l.t > t) break; const k = ease.inOut((t - l.t) / l.dur); lt = lerp(lt, l.turn, k); ln = lerp(ln, l.nod, k); }
    p['head.turn'] += lt; p['head.nod'] += ln;
    return p;
  }

  function faceAt(t) {
    let f = {};
    for (const e of faces) { if (e.t > t) break; f = e.replace ? { ...e.f } : { ...f, ...e.f }; }
    // eyes: resolve per side
    let eyeL = f.eyeL || f.eyes || 'open', eyeR = f.eyeR || f.eyes || 'open';
    // blinking
    if (blinking) {
      const b = blinkPhase(t, seed);
      if (b) {
        const blinkable = (e) => ['open', 'wide', 'side_r', 'side_l', 'down', 'half'].includes(e);
        const sh = b === 1 ? 'closed' : 'half';
        if (blinkable(eyeL)) eyeL = eyeL === 'half' && sh === 'half' ? 'closed' : sh;
        if (blinkable(eyeR)) eyeR = eyeR === 'half' && sh === 'half' ? 'closed' : sh;
      }
    }
    let mouth = f.mouth || 'closed';
    if (speech.some(([a, b]) => t >= a && t < b)) {
      const m = mouthAt(mouthTL, t);
      if (m) {
        if (m === 'closed' && ['smile', 'smirk', 'grin'].includes(mouth)) mouth = mouth === 'grin' ? 'smile' : mouth;
        else if (m === 'wide' && ['grin', 'smile'].includes(mouth)) mouth = 'wide';
        else mouth = m;
      }
    }
    return { eyeL, eyeR, brows: f.brows, mouth, blush: f.blush };
  }
  return api;
}

// 0 = no blink, 0.5 = half, 1 = closed. Pure function of time.
function blinkPhase(t, seed) {
  const P = 3.1;
  const k = Math.floor(t / P);
  for (const kk of [k - 1, k]) {
    const s0 = kk * P + 0.3 + hash01(kk, seed) * 2.3;
    const starts = [s0]; if (hash01(kk, seed + 7) > 0.8) starts.push(s0 + 0.32);
    for (const s of starts) {
      const d = t - s;
      if (d >= 0 && d < 0.17) return d < 0.04 ? 0.5 : d < 0.11 ? 1 : 0.5;
    }
  }
  return 0;
}
