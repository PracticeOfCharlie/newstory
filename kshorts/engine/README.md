# kshorts engine: building a scene

Retro low-poly renderer for 츄리 shorts. three.js r160 in headless Chromium (SwiftShader), rendered
frame by frame at 360x640, upscaled nearest-neighbour x3 to 1080x1920, 30 fps, H.264.
Everything is vendored (`engine/vendor/`); nothing is loaded from the network.

## Render

```
node engine/render.js scenes/talk_test.js --out out/talk_test.mp4 --jobs 3      # clip, 3 parallel ranges
node engine/render.js scenes/talk_test.js --out out/x.mp4 --audio voice/x.wav   # mux audio (wav/mp3 -> aac)
node engine/render.js scenes/talk_test.js --still 2.5 --out out/still.png       # one frame at t=2.5 s, 1080x1920
node engine/render.js scenes/expressions.js --sheet --out out/expressions.png  # labelled grid (scene returns `sheet`)
# manual ranges (e.g. on several machines), then encode:
node engine/render.js scenes/x.js --frames out/frames/x --start 0 --end 150
node engine/render.js scenes/x.js --frames out/frames/x --start 150 --end 300
node engine/render.js --encode out/frames/x --out out/x.mp4 [--audio a.wav]
```
Options: `--res 270x480` (internal size; output = 1080 wide), `--fps 30`, `--arg key=value` (scene reads `E.args.key`),
`--keep` (keep frames), `--quiet`. Speed here: about 0.1-0.17 s per frame per job (a 6.5 s clip takes ~20 s with `--jobs 3`).

Rendering is a pure function of time: every frame is computed from `t` alone, so any range can be
rendered in any order or process. Never use `Math.random()` or `Date`; use `E.U.rng(seed)`, `E.U.hash01`, `E.U.noise1`.

## Scene module shape

```js
// scenes/my_scene.js
export default function (E) {
  const room = E.set('classroom', { deskChair: false });   // or 'studio'; returns handy points (room.deskTop)
  const her = E.character({ x: 0, z: 0, ry: 0, glasses: true });   // ry in degrees, 0 = facing +Z

  her.act(0, 'talk', { variant: 1 });          // actions blend into each other (default 0.3 s)
  her.face(0, 'smug');                          // preset name replaces; object merges: her.face(1, { mouth: 'o' })
  her.say(words);                               // lip-sync from word timings
  her.walk(3, 5, [1, -0.5], { then: 'idle' });  // walk to x,z between t=3 and t=5
  her.turn(5.2, 180, 0.4);                      // turn on the spot
  her.look(2, { turn: 20, nod: 5 });            // extra head aim (degrees), look(t, null) to release

  E.shot(0,   { preset: 'medium', subject: her, yaw: 10 });
  E.shot(2.2, { pos: [2, 1.5, 1], look: [0, 1, 0], fov: 40, to: { pos: [1.8, 1.5, 1] }, mosaic: true });
  E.shot(4.5, { preset: 'close', subject: her, yaw: 0, to: { zoom: 1.1 } });

  E.captions(words);                 // one word on screen at a time, lower-middle
  E.label(2.5, 4.4, '추억의 과자');   // yellow key term near the top, pops in
  return { duration: 6.5 };
}
```
`words` is `[{ start, end, text }]` in seconds (Korean eojeol or English words).

### Camera
- `preset`: `wide`, `full`, `knee`, `medium`, `close` (head and shoulders), `face`. Framed on `subject` at the shot's start
  (`follow: true` to track a walking subject). `yaw` = degrees around her (0 = in front, + = her left / screen right),
  `dist`/`zoom` multipliers, `height` (m), `lookY` (m), `frame: 'left'|'right'` puts her on one side, `fov`.
- Explicit: `pos`, `look`, `fov`. Either kind can move with `to: {...}` across the shot (`ease: 'linear'|'inOut'|...`).
- A shot lasts until the next one. `mosaic: true` (or `E.mosaic(t, { dur, max })`) pixelates in and out around the cut.
- **Hard rule:** presets keep the camera at or above chest height looking level or down. Do not place explicit cameras
  low, aimed up, or lingering on her body. Skirt stays knee-length; poses stay ordinary.

### Captions and labels
- `E.captions(words, { y: 0.7, scale: 2, font: 'bold' })`. Fonts: `bold` (Galmuri11 Bold, default), `regular`, `large`
  (Galmuri14), `small` (Galmuri9). All are OFL pixel fonts with full Hangul. Text is rasterised at the font's native
  pixel size and scaled by an integer, so it stays crisp. Long words shrink to fit.
- `E.label(t0, t1, text, { y: 0.15, color: '#ffd43b' })`.
- `E.overlay((ctx, t, W, H) => {...})` draws anything 2D on the 360x640 frame (diagrams, cutaways). Use
  `E.text.draw(ctx, text, cx, cy, { scale, color, outline, font })` for text.

## Character reference

**Actions** (`her.act(t, name, params)`):
`idle` · `pose {name}` (hold any static pose; `idle: 0` freezes the breathing) · `talk {variant: 1|2|3}`
(1 one open hand explaining, 2 both hands, 3 mock-serious finger up + hand on hip) · `walk` (use `her.walk`) ·
`point {dir: 'fwd'|'side'|'up'}` · `hands_on_hips` · `surprised` (recoil) · `hold` (right hand, attach a prop) ·
`pickup` (reach down, grab at +0.5 s, lift to hold by +1.25 s; use `her.pickUp(t, prop)`) · `wave` · `think` ·
`present` (open palm to her left) · `bow` · `nod` · `sit {seat: 0.445}` (put a chair under her) · `crouch` (one-knee kneel).

**Static poses** (`character/pose.js` `POSES`, joint angles in degrees): stand, relaxed, hands_on_hips, point_fwd,
point_side, point_up, talk_explain, talk_both, teach, surprised, hold, reach_low, wave, think, present, bow, sit,
crouch, walk_contact. Channels are documented at the top of `pose.js`; `armIK(side, [x,y,z], pole)` places a wrist
in spine space. New actions go in `character/actions.js` as `(lt, params, ctx) => pose`.

**Expressions** (`her.face(t, name)`): neutral, happy, smile, smug, surprised, shocked, angry, worried, sulky, shy,
laugh, thinking, glance, wink, sleepy. Or set parts: `{ eyes, eyeL, eyeR, brows, mouth, blush }` with
eyes: open, half, closed, happy, wide, side_r, side_l, down · brows: neutral, raised, angry, worried ·
mouth: closed, smile, smirk, small, open, wide, o, pout, grin · blush: true/false.
Blinking is automatic (`her.blink(false)` to stop). While `say` words are active, lip-sync drives the mouth
(`closed/small/open/wide/o`); outside them the expression's mouth shows. `her.mouth(tl, [t0, t1])` takes a raw
viseme timeline `[{ t, mouth }]` (for forced-alignment output later).

**Look constants** (hair, skin, eye, uniform colours, proportions, glasses on/off) are in `character/config.js`.

## Props

```js
const snack = E.prop('snack', { color: '#e0442e', text: '과자' });   // kinds: box, card, snack, can, phone, earphones, bag
snack.at(0, [x, y, z], [rx, ry, rz]);                                 // in the world (degrees)
snack.attach(3.1, { to: her, anchor: 'handR', offset: [0, -0.02, 0.03], rot: [90, 0, 0] });  // in her hand
snack.show(5, false);                                                  // hide
E.prop(myObject3D).at(0, [1, 0, 0]);                                   // any three.js object
E.prop('card', { w: 0.4, h: 0.25, lines: ['500원'] });                 // sign / price tag with pixel text
E.prop('earphones').attach(0, { to: her, anchor: 'headModel' });
E.prop('bag').attach(0, { to: her, anchor: 'spine' });
```
Anchors: `handR`, `handL`, `head`, `headModel`, `spine`, `hips`. To put a prop exactly where her hand will be,
schedule the action first, then `her.update(t)` and read `her.anchor('handR').getWorldPosition(...)` (see talk_test.js).
Furniture: `E.furniture.desk(x, z, ry)`, `E.furniture.chair(x, z, ry)`. Draw real products as generic look-alikes, no logos.
Pixel textures: `E.U.makeTex(w, h, (px, ctx) => {...})` gives a nearest-filtered texture; `E.U.mat({ map })` a Lambert material.

## Files
- `engine/render.js` CLI (Node, Playwright) · `engine/boot.js` page side · `engine/engine.js` scene API, camera, overlays
- `engine/text.js` pixel text · `engine/props.js` · `engine/sets/` (classroom, studio) · `engine/util.js` · `engine/geo.js`
- `character/` config, face atlas (`face.js`), geometry and rig (`build.js`), poses, actions, lip-sync, API (`index.js`)
- `scenes/` turntable, expressions, poses, talk_test, plus dev helpers: `dev.js` (`--arg preset=close --arg face=smug
  --arg glasses=0 --arg extras=1`), `dev_pose.js` (`--arg act=sit --arg yaw=30`), `face_atlas.js`, `example_walk.js` (walk, card prop, follow camera, overlay)
