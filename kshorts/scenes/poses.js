// Reference sheet of the poses/actions, each sampled at a representative moment.
//   node engine/render.js scenes/poses.js --sheet --out out/poses.png
export default function (E) {
  E.set('studio', { color: '#c9d3df' });
  const her = E.character({ glasses: true });
  her.blink(false);
  const chair = E.furniture.chair(0, 0.02, 0); chair.visible = false;
  const desk = E.furniture.desk(0, 0.62, 0); desk.visible = false;
  const snack = E.prop('snack', { text: '과자' }).show(0, false);
  const cells = [];
  let t = 0;
  // [label, action, params, sample time inside the action, face, extra setup(t0)]
  const list = [
    ['stand', 'pose', { name: 'stand' }, 0.5, 'neutral'],
    ['idle', 'idle', {}, 1.0, 'smile'],
    ['talk 1', 'talk', { variant: 1 }, 0.55, 'smile'],
    ['talk 2', 'talk', { variant: 2 }, 0.2, 'happy'],
    ['talk 3 (teach)', 'talk', { variant: 3 }, 0.4, 'smug'],
    ['walk', 'walk', { speed: 1.1 }, 0.62, 'smile'],
    ['point fwd', 'point', { dir: 'fwd' }, 0.8, 'smug'],
    ['point side', 'point', { dir: 'side' }, 0.8, 'glance'],
    ['point up', 'point', { dir: 'up' }, 0.8, 'happy'],
    ['hands on hips', 'hands_on_hips', {}, 0.6, 'smug'],
    ['surprised', 'surprised', {}, 0.5, 'surprised'],
    ['hold', 'hold', {}, 0.8, 'happy', (t0) => snack.attach(t0, { to: her, anchor: 'handR', offset: [0, -0.02, 0.03], rot: [90, 0, 0] }).show(t0, true).show(t0 + 1.9, false)],
    ['pick up (reach)', 'pickup', {}, 0.5, 'neutral', (t0) => { desk.userData.on = [t0, t0 + 2]; snack.attach(t0, { world: [-0.1, 0.77, 0.45], rot: [-90, 0, 0] }).show(t0, true).show(t0 + 1.9, false); }],
    ['wave', 'wave', {}, 0.7, 'happy'],
    ['think', 'think', {}, 0.6, 'thinking'],
    ['present', 'present', {}, 0.7, 'smile'],
    ['bow', 'bow', {}, 0.7, 'smile'],
    ['nod', 'nod', {}, 0.12, 'smile'],
    ['sit', 'sit', { seat: 0.445 }, 0.6, 'smile', (t0) => { chair.userData.on = [t0, t0 + 2]; }],
    ['crouch', 'crouch', {}, 0.6, 'neutral'],
  ];
  for (const [label, act, params, at, face, setup] of list) {
    her.act(t, act, params, { blend: 0 });
    her.face(t, face);
    if (setup) setup(t);
    cells.push({ t: t + at, label });
    t += 2;
  }
  E.onUpdate((tt) => {
    for (const o of [chair, desk]) o.visible = !!(o.userData.on && tt >= o.userData.on[0] && tt < o.userData.on[1]);
  });
  E.shot(0, { preset: 'full', subject: her, yaw: 28 });
  return { duration: t, sheet: { cells, cols: 5, crop: [50, 40, 260, 560], title: '츄리 poses / actions' } };
}
