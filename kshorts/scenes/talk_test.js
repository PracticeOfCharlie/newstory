// Talk test: ~6.5 s in the classroom corner. Three shots, gesture + lip-sync, word captions
// (Korean 반말 lines + one English line), one yellow key-term label, mosaic transition.
//   node engine/render.js scenes/talk_test.js --out out/talk_test.mp4 --jobs 3

// Made-up word timings (seconds). Real ones will come from forced alignment.
const LINE1 = [
  { start: 0.30, end: 0.62, text: '야,' },
  { start: 0.78, end: 0.98, text: '너' },
  { start: 1.04, end: 1.40, text: '이거' },
  { start: 1.46, end: 2.05, text: '기억나?' },
];
const LINE2 = [
  { start: 2.65, end: 3.05, text: '문방구' },
  { start: 3.10, end: 3.40, text: '앞에서' },
  { start: 3.45, end: 3.75, text: '팔던' },
  { start: 3.80, end: 4.20, text: '거!' },
];
const LINE3 = [
  { start: 4.75, end: 5.05, text: 'Totally' },
  { start: 5.10, end: 5.55, text: 'remember' },
  { start: 5.60, end: 5.95, text: 'it!' },
];

export default function (E) {
  const room = E.set('classroom', { deskChair: false });
  const [dx, dy, dz] = room.deskTop;

  // she stands in front of the desk, facing the camera side of the room
  const her = E.character({ x: dx + 0.05, z: dz + 0.5, ry: 10 });
  const snack = E.prop('snack', { color: '#e0442e', text: '과자' });

  // --- shot 1: medium, talking to camera ---
  her.act(0, 'talk', { variant: 1 });
  her.face(0, 'smug');
  her.face(1.45, { preset: 'smug', eyes: 'open', brows: 'raised' });
  her.say(LINE1);

  // --- shot 2: turn to the desk, pick the snack up ---
  her.turn(2.15, 190, 0.45);
  her.act(2.15, 'idle', {}, { blend: 0.3 });
  her.face(2.3, 'smile');
  // put the snack where her right hand will be when she grabs it (pure: just evaluates the pose)
  her.pickUp(2.6, snack, { offset: [0, -0.02, 0.03], rot: [90, 0, 0] });
  const tGrab = 2.6 + 0.5;
  her.update(tGrab);
  const grip = her.anchor('handR').getWorldPosition(new E.THREE.Vector3());
  snack.at(0, [grip.x, dy + 0.026, grip.z], [-90, 0, 15]);
  her.turn(3.75, 15, 0.5);
  her.face(3.6, 'happy');
  her.say(LINE2);

  // --- shot 3: close, showing it off ---
  her.face(4.55, 'wink');
  her.face(5.2, 'laugh');
  her.say(LINE3);

  // camera
  E.shot(0, { preset: 'medium', subject: her, yaw: 10, dist: 1.15, to: { dist: 1.05 } });
  E.shot(2.2, { pos: [dx + 1.75, 1.5, dz - 0.15], look: [dx + 0.05, 0.88, dz + 0.42], fov: 42, to: { pos: [dx + 1.6, 1.46, dz - 0.05] }, mosaic: true });
  E.shot(4.45, { preset: 'close', subject: her, yaw: 12, dist: 1.3, lookY: -0.04 });

  E.captions([...LINE1, ...LINE2, ...LINE3]);
  E.label(2.55, 4.4, '추억의 과자');
  return { duration: 6.5 };
}
