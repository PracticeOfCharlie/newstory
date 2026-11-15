// 360-degree turntable: full body, then head-and-shoulders.
//   node engine/render.js scenes/turntable.js --out out/turntable.mp4 --jobs 3
export default function (E) {
  E.set('studio', { color: '#c9d3df' });
  const her = E.character({ glasses: E.args.glasses !== '0' });
  her.act(0, 'idle');
  her.face(0, 'smile');
  her.face(5.0, 'smug');
  E.shot(0, { preset: 'full', subject: her, yaw: 0, ease: 'linear', to: { yaw: 360 } });
  E.shot(5.0, { preset: 'close', subject: her, yaw: 0, ease: 'linear', to: { yaw: 360 }, mosaic: { dur: 0.4 } });
  E.label(0.2, 2.2, '츄리', { y: 0.1 });
  return { duration: 10 };
}
