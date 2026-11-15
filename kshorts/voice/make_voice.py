#!/usr/bin/env python3
"""Synthesise narration with Supertonic and align known text to it with WhisperX.

usage: .venv-wx/bin/python make_voice.py script.txt --voice F3 --speed 1.05 --out out/clip

script.txt: one sentence per line (numbers spelled out in hangul). Blank lines skipped.
Outputs: <out>.wav (all sentences joined with a short gap) and <out>.json.

Each sentence is synthesised on its own, so sentence offsets are exact. Words
(eojeol, whitespace-separated) are placed inside their sentence by wav2vec2
forced alignment of the known text (no ASR).
"""
import argparse, json, os, sys

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")  # only use approved HF hosts

import numpy as np
import soundfile as sf

MIN_WORD = 0.04  # seconds
ALIGN_SR = 16000


def resample(x, sr_from, sr_to):
    if sr_from == sr_to:
        return x
    n = int(round(len(x) * sr_to / sr_from))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def trim_silence(x, sr, pad=0.06, rel=0.02):
    """Cut leading/trailing near-silence (the TTS pads its output), keep a small pad."""
    thr = rel * float(np.max(np.abs(x))) if len(x) else 0.0
    idx = np.flatnonzero(np.abs(x) > thr)
    if len(idx) == 0:
        return x
    a = max(idx[0] - int(pad * sr), 0)
    b = min(idx[-1] + int(pad * sr), len(x))
    return x[a:b]


def fill_words(words, t0, t1):
    """words: list of dict(text, start|None, end|None) in sentence-local seconds.
    Interpolate untimed words, make times monotonic, close gaps, no zero-length."""
    n = len(words)
    for i, w in enumerate(words):
        if w["start"] is None or w["end"] is None:
            w["start"] = w["end"] = None
    i = 0
    while i < n:
        if words[i]["start"] is None:
            j = i
            while j < n and words[j]["start"] is None:
                j += 1
            lo = words[i - 1]["end"] if i > 0 else t0
            hi = words[j]["start"] if j < n else t1
            span = max(hi - lo, MIN_WORD * (j - i))
            weights = [max(len(words[k]["text"]), 1) for k in range(i, j)]
            acc = lo
            for k, wt in zip(range(i, j), weights):
                d = span * wt / sum(weights)
                words[k]["start"], words[k]["end"] = acc, acc + d
                acc += d
            i = j
        else:
            i += 1
    # first word starts at speech onset, last ends at speech end; fill gaps
    words[0]["start"] = min(words[0]["start"], t0) if words[0]["start"] > t0 else words[0]["start"]
    for k in range(n - 1):
        words[k]["end"] = words[k + 1]["start"]
    words[-1]["end"] = max(words[-1]["end"], words[-1]["start"] + MIN_WORD)
    # enforce monotonic + minimum length
    for k in range(n):
        if k > 0 and words[k]["start"] < words[k - 1]["end"]:
            words[k]["start"] = words[k - 1]["end"]
        if words[k]["end"] < words[k]["start"] + MIN_WORD:
            words[k]["end"] = words[k]["start"] + MIN_WORD
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("--voice", default="F3")
    ap.add_argument("--speed", type=float, default=1.05)
    ap.add_argument("--gap", type=float, default=0.30, help="silence between sentences (s)")
    ap.add_argument("--out", required=True, help="output prefix (writes .wav and .json)")
    a = ap.parse_args()

    sentences = [l.strip() for l in open(a.script, encoding="utf-8") if l.strip()]
    if not sentences:
        sys.exit("empty script")

    from supertonic import TTS
    import whisperx
    import whisperx.alignment as wxa

    # whisperx.align loads an nltk punkt model (downloaded from raw.githubusercontent.com)
    # only to split a segment into sub-sentences. We always pass one sentence per
    # segment and only want words, so use a no-op splitter and avoid that download.
    class _OneSpan:
        def span_tokenize(self, text):
            return [(0, len(text))]
    wxa.nltk_load = lambda *_a, **_k: _OneSpan()

    tts = TTS()
    style = tts.get_voice_style(a.voice)
    sr = tts.sample_rate
    align_model, meta = whisperx.load_align_model(language_code="ko", device="cpu")

    gap = np.zeros(int(round(a.gap * sr)), dtype=np.float32)
    pieces, words_out, cursor = [], [], 0  # cursor in samples
    for si, text in enumerate(sentences):
        wav, _ = tts.synthesize(text, voice_style=style, lang="ko", speed=a.speed)
        wav = trim_silence(np.asarray(wav, dtype=np.float32).reshape(-1), sr)
        dur = len(wav) / sr
        off = cursor / sr
        res = whisperx.align(
            [{"text": text, "start": 0.0, "end": dur}],
            align_model, meta, resample(wav, sr, ALIGN_SR), "cpu",
            return_char_alignments=False,
        )
        ws = [{"text": w["word"], "start": w.get("start"), "end": w.get("end")}
              for w in res["segments"][0]["words"]]
        # keep our own eojeol split in case the aligner dropped a token
        toks = text.split()
        if [w["text"] for w in ws] != toks:
            ws = [{"text": t, "start": None, "end": None} for t in toks]
        timed = [w["start"] for w in ws if w["start"] is not None]
        t0 = min(timed) if timed else 0.0
        ends = [w["end"] for w in ws if w["end"] is not None]
        t1 = max(ends) if ends else dur
        ws = fill_words(ws, t0, t1)
        for w in ws:
            words_out.append({"i": len(words_out), "text": w["text"],
                              "start": round(off + w["start"], 3),
                              "end": round(off + w["end"], 3), "sentence": si})
        pieces.append(wav)
        cursor += len(wav)
        if si < len(sentences) - 1:
            pieces.append(gap)
            cursor += len(gap)

    # close inter-sentence gaps in the word list so captions never flicker off:
    # last word of a sentence holds until the next sentence's first word starts.
    for k in range(len(words_out) - 1):
        if words_out[k + 1]["sentence"] != words_out[k]["sentence"]:
            words_out[k]["end"] = words_out[k + 1]["start"]

    audio = np.concatenate(pieces)
    total = len(audio) / sr
    words_out[-1]["end"] = round(min(max(words_out[-1]["end"], words_out[-1]["start"] + MIN_WORD), total), 3)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    sf.write(a.out + ".wav", audio, sr, subtype="PCM_16")
    with open(a.out + ".json", "w", encoding="utf-8") as f:
        json.dump({"version": 1, "voice": f"supertonic-3:{a.voice}", "speed": a.speed,
                   "sample_rate": sr, "duration": round(total, 3),
                   "words": words_out}, f, ensure_ascii=False, indent=1)
    print(f"wrote {a.out}.wav ({total:.2f}s) and {a.out}.json ({len(words_out)} words)")


if __name__ == "__main__":
    main()
