// Reference sheet of every expression preset and every face part.
//   node engine/render.js scenes/expressions.js --sheet --out out/expressions.png
import { EXPRESSIONS, EYES, BROWS, MOUTHS } from '../character/face.js';

export default function (E) {
  E.set('studio', { color: '#c9d3df' });
  const her = E.character({ glasses: E.args.glasses !== '0' });
  her.blink(false);
  her.act(0, 'pose', { name: 'stand', idle: 0 }, { blend: 0 });
  const cells = [];
  let t = 0.5;
  const add = (label, face) => { her.face(t - 0.5, typeof face === 'string' ? face : { preset: 'neutral', blush: false, ...face }); cells.push({ t, label }); t += 1; };
  for (const name of Object.keys(EXPRESSIONS)) add(name, name);
  for (const e of EYES) add('eyes:' + e, { eyes: e, brows: 'neutral', mouth: 'closed' });
  for (const b of BROWS) add('brows:' + b, { eyes: 'open', brows: b, mouth: 'closed' });
  for (const m of MOUTHS) add('mouth:' + m, { eyes: 'open', brows: 'neutral', mouth: m });
  add('+blush', { eyes: 'open', brows: 'neutral', mouth: 'smile', blush: true });
  E.shot(0, { preset: 'close', subject: her, yaw: 0 });
  // freeze idle head drift so every cell is framed the same way
  return { duration: t, sheet: { cells, cols: 6, crop: [30, 30, 300, 330], title: '츄리 expressions' } };
}
