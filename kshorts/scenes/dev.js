// Dev viewer: node engine/render.js scenes/dev.js --still 0 --out x.png --arg preset=close --arg yaw=20 --arg face=smug --arg act=idle
export default function (E) {
  const a = E.args;
  E.set(a.set || 'studio');
  const her = E.character({ glasses: a.glasses !== '0' });
  her.blink(false);
  if (a.only === 'head') her.root.traverse((o) => { if (o.isMesh && o !== her.rig.headMesh) o.visible = false; });
  if (a.extras) { E.prop('earphones').attach(0, { to: her, anchor: 'headModel' }); E.prop('bag').attach(0, { to: her, anchor: 'spine' }); }
  if (a.act) her.act(0, a.act, a.variant ? { variant: Number(a.variant) } : {}, { blend: 0 });
  if (a.pose) her.act(0, 'pose', { name: a.pose }, { blend: 0 });
  if (a.face) her.face(0, a.face);
  E.shot(0, { preset: a.preset || 'full', subject: her, yaw: Number(a.yaw || 0), height: Number(a.h || 0) });
  return { duration: 1 };
}
