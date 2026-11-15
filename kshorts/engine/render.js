#!/usr/bin/env node
// Deterministic frame-by-frame renderer.
//
//   node engine/render.js scenes/talk_test.js --out out/talk_test.mp4            # whole clip
//   node engine/render.js scenes/talk_test.js --out out/talk_test.mp4 --jobs 3    # parallel ranges, then encode
//   node engine/render.js scenes/talk_test.js --still 2.5 --out out/still.png     # one frame, 1080x1920
//   node engine/render.js scenes/talk_test.js --frames out/frames/talk --start 0 --end 60   # a frame range only
//   node engine/render.js --encode out/frames/talk --out out/talk.mp4 [--audio a.wav]      # encode existing frames
//   node engine/render.js scenes/expressions.js --sheet --out out/expressions.png         # labelled grid
// Options: --res 360x640 (internal), --fps 30, --audio file.wav|mp3, --scale 3 (upscale factor), --arg k=v (scene args)
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const opt = { args: {} };
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const flag = ['sheet', 'keep', 'quiet'].includes(k);
    const v = flag ? true : argv[++i];
    if (k === 'arg') { const [kk, vv] = v.split('='); opt.args[kk] = vv; } else opt[k] = v;
  } else pos.push(a);
}
const [W, H] = (opt.res || '360x640').split('x').map(Number);
const FPS = Number(opt.fps || 30);
const SCALE = Number(opt.scale || Math.round(1080 / W));
const OW = W * SCALE, OH = H * SCALE;
const log = (...m) => { if (!opt.quiet) console.log(...m); };

function serve() {
  const types = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json', '.jpg': 'image/jpeg' };
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function openPage(scene) {
  const { chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'));
  const srv = await serve();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/engine/index.html`);
  await page.waitForFunction(() => !!window.__boot);
  const sceneUrl = '/' + path.relative(ROOT, path.resolve(scene)).split(path.sep).join('/');
  const info = await page.evaluate((o) => window.__boot(o), { scene: sceneUrl, width: W, height: H, fps: FPS, args: opt.args });
  if (errors.length) throw errors[0];
  return { page, info, close: async () => { await browser.close(); srv.close(); } };
}

const b64 = (d) => Buffer.from(d.split(',')[1], 'base64');

function upscalePng(src, dst, scale) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', `scale=iw*${scale}:ih*${scale}:flags=neighbor`, dst]);
}

function encode(framesDir, out, audio) {
  const args = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, '%05d.png')];
  if (audio) args.push('-i', audio);
  args.push('-vf', `scale=${OW}:${OH}:flags=neighbor`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS));
  if (audio) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push('-movflags', '+faststart', out);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
}

async function renderRange(scene, dir, start, end) {
  const { page, info, close } = await openPage(scene);
  const total = Math.round(info.duration * FPS);
  const s = Number(start ?? 0), e = Math.min(Number(end ?? total), total);
  fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  for (let f = s; f < e; f++) {
    const data = await page.evaluate((t) => window.__frame(t), f / FPS);
    fs.writeFileSync(path.join(dir, String(f).padStart(5, '0') + '.png'), b64(data));
  }
  const spf = (Date.now() - t0) / 1000 / Math.max(1, e - s);
  log(`rendered frames ${s}..${e - 1} (${e - s}) at ${spf.toFixed(3)} s/frame`);
  await close();
  return { total, spf };
}

(async () => {
  if (opt.encode) { encode(opt.encode, opt.out, opt.audio); log('wrote', opt.out); return; }
  const scene = pos[0];
  if (!scene) { console.error('usage: node engine/render.js <scene.js> [--out file] [--still t] [--sheet] [--jobs n] [--start f --end f --frames dir]'); process.exit(1); }
  fs.mkdirSync(path.dirname(path.resolve(opt.out || 'out/x')), { recursive: true });

  if (opt.still != null || opt.sheet) {
    const { page, info, close } = await openPage(scene);
    const tmp = path.resolve(opt.out) + '.lowres.png';
    let data;
    if (opt.sheet) data = await page.evaluate((s) => window.__sheet(s), info.sheet);
    else data = await page.evaluate((t) => window.__frame(t), Number(opt.still));
    fs.writeFileSync(tmp, b64(data));
    upscalePng(tmp, opt.out, opt.sheet ? Number(opt.scale || 2) : SCALE);
    if (!opt.keep) fs.unlinkSync(tmp);
    await close();
    log('wrote', opt.out);
    return;
  }

  if (opt.frames) { await renderRange(scene, opt.frames, opt.start, opt.end); return; }

  // full clip
  const out = opt.out || path.join('out', path.basename(scene, '.js') + '.mp4');
  const dir = path.resolve('out/frames', path.basename(out, path.extname(out)));
  fs.rmSync(dir, { recursive: true, force: true });
  const jobs = Number(opt.jobs || 1);
  const t0 = Date.now();
  if (jobs <= 1) await renderRange(scene, dir, 0, undefined);
  else {
    // ask for the duration once, then split into ranges rendered by child processes
    const { info, close } = await openPage(scene); await close();
    const total = Math.round(info.duration * FPS);
    const per = Math.ceil(total / jobs);
    await Promise.all(Array.from({ length: jobs }, (_, j) => new Promise((res, rej) => {
      const a = ['--frames', dir, '--start', String(j * per), '--end', String(Math.min(total, (j + 1) * per)), '--res', `${W}x${H}`, '--fps', String(FPS)];
      for (const k in opt.args) a.push('--arg', `${k}=${opt.args[k]}`);
      const p = spawn(process.execPath, [__filename, scene, ...a], { stdio: 'inherit' });
      p.on('exit', (c) => (c ? rej(new Error('job failed')) : res()));
    })));
  }
  encode(dir, out, opt.audio);
  if (!opt.keep) fs.rmSync(dir, { recursive: true, force: true });
  log(`wrote ${out} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
})().catch((e) => { console.error(e); process.exit(1); });
