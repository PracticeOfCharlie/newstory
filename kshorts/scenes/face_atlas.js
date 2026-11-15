// Debug view of the face atlas and a composed face texture (2D only).
import { faceAtlas, composeFace } from '../character/face.js';
export default function (E) {
  const f = composeFace(E.args.face ? JSON.parse(E.args.face) : { eyes: 'open', mouth: 'smile', blush: true });
  E.overlay((ctx, t, W, H) => {
    ctx.fillStyle = '#556'; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    const a = faceAtlas();
    ctx.drawImage(a, 0, 0, a.width * 1, a.height * 1);
    ctx.drawImage(f, 0, a.height + 10, 256, 256);
  });
  return { duration: 1 };
}
