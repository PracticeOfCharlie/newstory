// Reusable actions. Each action is a pure function (lt, params, ctx) -> pose,
// where lt is seconds since the action started and ctx = { t, dist } (dist = metres walked).
import { pose, armIK, hand, blendPose, REST } from './pose.js';
import { ease, noise1, clamp } from '../engine/util.js';

const TAU = Math.PI * 2;
const add = (p, d) => { for (const k in d) p[k] = (p[k] ?? REST[k] ?? 0) + d[k]; return p; };

export const ACTIONS = {
  idle(lt, p = {}) {
    const base = pose(p.pose || 'relaxed');
    return add(base, { 'hips.side': Math.sin(lt * 0.6) * 1.2, 'spine.side': -Math.sin(lt * 0.6) * 0.8 });
  },

  // static pose by name, with breathing from the idle layer: act(t, 'pose', { name: 'think' })
  pose(lt, p = {}) { const o = pose(p.name || 'stand'); if (p.idle != null) o.idle = p.idle; return o; },

  talk(lt, p = {}) {
    const v = p.variant || 1;
    const beat = Math.pow(0.5 + 0.5 * Math.sin(lt * TAU * 1.4), 2);
    const n1 = noise1(lt * 1.3, 11), n2 = noise1(lt * 1.1, 23);
    let o;
    if (v === 1) { // explaining with one open hand
      o = pose('relaxed', { ...armIK('R', [-0.13 + n1 * 0.03, 0.12 + beat * 0.05, 0.24 + n2 * 0.02], [1, -0.6, -0.2]), 'elbowR.twist': 70, ...hand('R', 'open'), 'handR.bend': -15 + beat * 10 });
      add(o, { 'head.nod': -beat * 3, 'head.tilt': n1 * 4, 'spine.turn': n2 * 3 });
    } else if (v === 2) { // both hands, opening outward on the beat
      const spread = 0.17 + beat * 0.06;
      o = pose('stand', {
        ...armIK('R', [-spread, 0.12 + n1 * 0.02, 0.2], [1, -0.7, 0]), ...armIK('L', [spread, 0.12 - n1 * 0.02, 0.2], [1, -0.7, 0]),
        'elbowR.twist': 80, 'elbowL.twist': -80, ...hand('R', 'open'), ...hand('L', 'open'), 'handL.bend': -10 - beat * 10, 'handR.bend': -10 - beat * 10,
      });
      add(o, { 'head.nod': -beat * 4, 'spine.bend': beat * 2, 'head.tilt': n2 * 3 });
    } else { // mock-serious teacher: finger up, other hand on hip
      o = pose('teach');
      add(o, { 'armR.fwd': beat * 6, 'elbowR.bend': beat * 8, 'head.nod': beat * 3 - 2, 'head.tilt': n1 * 3 });
    }
    return o;
  },

  walk(lt, p = {}, ctx) {
    const stride = p.stride || 1.1; // metres per full cycle (two steps)
    const d = ctx.walking ? ctx.dist : lt * (p.speed || 1.1);
    const ph = (d / stride) * TAU;
    const s = Math.sin(ph), c = Math.cos(ph);
    const amp = clamp(lt / 0.25) * (ctx.walkFade ?? 1);
    const o = pose('stand');
    add(o, {
      'legL.fwd': 24 * s * amp, 'legR.fwd': -24 * s * amp,
      'kneeL.bend': (6 + 38 * Math.pow(Math.max(0, c), 1.5)) * amp, 'kneeR.bend': (6 + 38 * Math.pow(Math.max(0, -c), 1.5)) * amp,
      'armL.fwd': -20 * s * amp, 'armR.fwd': 20 * s * amp, 'elbowL.bend': (8 + 8 * Math.max(0, -s)) * amp, 'elbowR.bend': (8 + 8 * Math.max(0, s)) * amp,
      'armL.out': 3, 'armR.out': 3,
      'spine.turn': 5 * s * amp, 'hips.turn': -6 * s * amp, 'head.turn': -3 * s * amp, 'spine.bend': 3 * amp,
      'hips.side': 2 * Math.sin(ph) * amp,
    });
    o['footL.flat'] = 0.75; o['footR.flat'] = 0.75;
    o.idle = 0.3;
    return o;
  },

  point(lt, p = {}) {
    const name = { fwd: 'point_fwd', viewer: 'point_fwd', side: 'point_side', up: 'point_up' }[p.dir || 'fwd'];
    const k = ease.outBack(lt / 0.35);
    const o = blendPose(pose('relaxed'), pose(name), k);
    return add(o, { 'armR.fwd': Math.sin(lt * 3) * 1.5 });
  },

  hands_on_hips(lt) {
    const o = pose('hands_on_hips');
    return add(o, { 'hips.side': Math.sin(lt * 0.8) * 2.5, 'head.tilt': Math.sin(lt * 0.8) * 2 });
  },

  surprised(lt) {
    const k = ease.out(lt / 0.12);
    const o = blendPose(pose('stand'), pose('surprised'), k);
    const kick = Math.exp(-lt * 6) * Math.sin(lt * 20);
    return add(o, { 'spine.bend': -6 * kick, 'head.nod': -4 * kick, 'armL.out': 4 * kick, 'armR.out': 4 * kick });
  },

  hold(lt, p = {}) {
    const k = ease.inOut(lt / 0.35);
    const o = blendPose(pose('relaxed'), pose('hold'), k);
    return add(o, { 'armR.fwd': Math.sin(lt * 2) * 2, 'handR.side': Math.sin(lt * 1.3) * 4 });
  },

  // reach down to a table in front, grab at ~0.5 s, lift to "hold" by 1.2 s
  pickup(lt, p = {}) {
    if (lt < 0.45) return blendPose(pose('relaxed'), pose('reach_low'), ease.inOut(lt / 0.45));
    if (lt < 0.6) return blendPose(pose('reach_low'), { ...pose('reach_low'), ...hand('R', 'grip') }, ease.inOut((lt - 0.45) / 0.15));
    if (lt < 1.25) return blendPose({ ...pose('reach_low'), ...hand('R', 'grip') }, pose('hold'), ease.inOut((lt - 0.6) / 0.65));
    return ACTIONS.hold(lt - 1.25 + 1, p);
  },

  wave(lt) {
    const k = ease.out(lt / 0.3);
    const o = blendPose(pose('relaxed'), pose('wave'), k);
    return add(o, { 'elbowR.twist': Math.sin(lt * TAU * 1.8) * 25 * k, 'handR.side': Math.sin(lt * TAU * 1.8) * 15 * k });
  },

  think(lt) { const o = pose('think'); return add(o, { 'head.tilt': Math.sin(lt * 0.9) * 3, 'head.nod': Math.sin(lt * 0.6) * 2 }); },

  present(lt) {
    const k = ease.outBack(lt / 0.4);
    return blendPose(pose('relaxed'), pose('present'), k);
  },

  bow(lt) {
    const k = lt < 0.5 ? ease.inOut(lt / 0.5) : lt < 1.0 ? 1 : 1 - ease.inOut((lt - 1.0) / 0.5);
    return blendPose(pose('stand'), pose('bow'), k);
  },

  nod(lt) {
    const o = pose('relaxed');
    return add(o, { 'head.nod': Math.max(0, Math.sin(lt * TAU * 2.2)) * 10 * Math.exp(-lt * 0.8) });
  },

  sit(lt, p = {}) {
    const o = pose('sit', { 'body.y': p.seat != null ? p.seat + 0.07 : 0.5 });
    if (p.talk) add(o, { ...diff(armIK('R', [-0.13, 0.1, 0.24], [1, -0.6, -0.2]), o), 'elbowR.twist': 40, 'handR.curl': -0.28, 'handR.index': -0.25, 'handR.bend': Math.sin(lt * TAU * 1.3) * 10 });
    return o;
  },

  crouch(lt) { return pose('crouch'); },
};

function diff(target, from) { const d = {}; for (const k in target) d[k] = target[k] - (from[k] ?? REST[k] ?? 0); return d; }

export const ACTION_NAMES = Object.keys(ACTIONS);
