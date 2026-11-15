// Dev: one pose from a chosen angle. --arg act=sit --arg yaw=0 --arg at=0.6
export default function (E) {
  const a = E.args;
  E.set('studio');
  const her = E.character({});
  her.blink(false);
  if (a.act === 'sit') E.furniture.chair(0, 0.02, 0);
  her.act(0, a.act || 'idle', a.act === 'sit' ? { seat: 0.445 } : {}, { blend: 0 });
  her.face(0, a.face || 'smile');
  E.shot(0, { preset: a.preset || 'full', subject: her, yaw: Number(a.yaw || 0) });
  return { duration: 3 };
}
