// Lip-sync: mouth timelines [{t, mouth}] and a heuristic generator from word timings.
// Mouth shapes used: closed, small, open, wide, o (all exist in the face atlas).

const HANGUL_VOWEL = [
  'wide', 'open', 'wide', 'open', 'open', 'open', 'open', 'open', // ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ
  'o', 'wide', 'open', 'o', 'o', 'o', 'open', 'open', 'o', 'o', // ㅗ ㅘ ㅙ ㅚ ㅛ ㅜ ㅝ ㅞ ㅟ ㅠ
  'small', 'small', 'small', // ㅡ ㅢ ㅣ
];
const BILABIAL_INITIAL = new Set([6, 7, 8, 17]); // ㅁ ㅂ ㅃ ㅍ
const BILABIAL_FINAL = new Set([16, 17, 18, 26, 10, 11, 14]);

// Break one word into a list of {shape, weight} segments.
function segments(text) {
  const out = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code >= 0 && code < 11172) {
      const ini = Math.floor(code / 588), med = Math.floor((code % 588) / 28), fin = code % 28;
      if (BILABIAL_INITIAL.has(ini)) out.push({ shape: 'closed', w: 0.35 });
      out.push({ shape: HANGUL_VOWEL[med], w: 1 });
      if (BILABIAL_FINAL.has(fin)) out.push({ shape: 'closed', w: 0.35 });
      else if (fin) out.push({ shape: 'small', w: 0.3 });
    }
  }
  if (out.length) return out;
  // Latin text: vowel groups + bilabial consonants
  const s = text.toLowerCase().replace(/[^a-z]/g, '');
  const re = /([aeiouy]+)|([mbp])/g; let m;
  while ((m = re.exec(s))) {
    if (m[2]) { out.push({ shape: 'closed', w: 0.35 }); continue; }
    const v = m[1];
    const shape = /o|u|w/.test(v) ? 'o' : /a/.test(v) ? 'wide' : /e/.test(v) ? 'open' : 'small';
    out.push({ shape, w: 1 });
  }
  if (!out.length && s.length) out.push({ shape: 'small', w: 1 });
  return out;
}

// words: [{start, end, text}] (seconds) -> [{t, mouth}]
export function lipsyncFromWords(words, { minHold = 1 / 15 } = {}) {
  const tl = [];
  words.forEach((w, i) => {
    const seg = segments(w.text);
    const dur = Math.max(0.05, w.end - w.start);
    const total = seg.reduce((a, s) => a + s.w, 0) || 1;
    let t = w.start, last = null;
    for (const s of seg) {
      const d = (s.w / total) * dur;
      if (s.shape !== last && (tl.length === 0 || t - tl[tl.length - 1].t >= minHold)) { tl.push({ t, mouth: s.shape }); last = s.shape; }
      t += d;
    }
    const next = words[i + 1];
    if (!next || next.start - w.end > 0.06) tl.push({ t: w.end, mouth: 'closed' });
    else tl.push({ t: w.end - Math.min(0.04, dur * 0.2), mouth: 'small' });
  });
  tl.sort((a, b) => a.t - b.t);
  return tl;
}

export function mouthAt(tl, t) {
  let m = null;
  for (const e of tl) { if (e.t <= t + 1e-9) m = e.mouth; else break; }
  return m;
}
