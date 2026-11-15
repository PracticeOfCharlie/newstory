// Example + smoke test of the documented API (walk, card prop, follow camera, overlay).
export default function (E) {
  E.set('classroom');
  const her = E.character({ x: -1, z: 0.5, ry: 90, glasses: false });
  her.walk(0.3, 2.3, [0.6, 0.2], { then: 'point', thenParams: { dir: 'fwd' } });
  her.face(0, 'happy');
  E.prop('card', { w: 0.4, h: 0.25, lines: ['500원'] }).at(0, [0.9, 1.2, -0.5]);
  E.shot(0, { preset: 'full', subject: her, yaw: -60, follow: true });
  E.overlay((ctx, t, W) => E.text.draw(ctx, 't=' + t.toFixed(1), W - 40, 12, { scale: 1, font: 'small' }));
  return { duration: 3 };
}
