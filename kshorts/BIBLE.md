# Series bible (working draft)

Shared brief for every agent on this project. If something here conflicts with a task prompt, the task prompt wins and you report the conflict.

## The show

Short vertical videos (60-90 s, 1080x1920) in which one recurring character walks the viewer through a piece of South Korean childhood from roughly 2007-2015: snacks, playground games, toys, TV, phones, school habits. The audience is Koreans born 2000-2005, so the target feeling is "wait, I had completely forgotten that".

## Format rules (taken from the reference teardown)

- Low-poly 3D character in a simple low-poly 3D set, rendered at low internal resolution and upscaled with nearest-neighbour, so it reads like an early-2000s console game.
- The character is always physically doing the thing being described (opening the snack, flipping the ddakji, queueing at the stationery shop). No talking-head stretches longer than about 3 seconds.
- A new shot every 2-4 seconds. Cutaways are either flat 2D diagrams or props on the set (price tags, signs, screens).
- Captions: one word (or one short Korean eojeol) at a time, pixel font, white with dark outline, lower-middle of frame. Key terms also pop up as a yellow label near the top of frame.
- Mosaic/pixelate transition between locations.
- Cold open: the character is already mid-situation and speaks straight to the viewer. Ending returns to the opening set for a character reaction.
- Explanation runs as a chain: what we did, the catch, what replaced it or where it went.

## The character

- Name: 츄리 (Chyuri).
- Original character. Do not copy the design of any reference channel's character or any real person. The user's style photo is a reference for hair and outfit only; her face is an original anime design, never a likeness.
- South Korean high school student, female. Long black hair to mid-back, slightly layered, with wispy see-through bangs and long face-framing strands. Thin dark-rimmed glasses.
- Uniform (from the user's style photo): navy blazer with gold buttons and a small red crest on the chest, cream knit cardigan under it with the cuffs showing past the blazer sleeves, white shirt, navy-and-burgundy diagonally striped necktie worn slightly loose, navy pleated skirt, loose white leg warmers, black high-top canvas sneakers with white soles and laces. Optional props: wired white earphones, a dark shoulder bag covered in charms.
- Personality: the classmate who remembers everything. Warm, a little smug about her memory, easily delighted by small things, mock-serious when "teaching".
- Speech: Korean, 반말 throughout. She calls the viewer "야". Narration and captions are Korean.

## Episode 1

츄리 goes to a 문방구 after school and buys four snacks: 쫀디기, 아폴로, 맥주사탕, 차카니 (lineup chosen by the user). Research: research/ep01_munbanggu.md; use the "VERIFIED FACTS" section at its top.

Chosen outline: option C, a mock lesson on how to eat each snack properly, one 교시 per snack (scripts/ep01_outlines.md). The user does not want the snacks run down: no 4대악, no crackdown or safety-scare material, and do not use the word 불량식품. The tone is affectionate.

## Hard rules

- She is a minor character in school uniform: keep every design choice, pose and camera angle modest and ordinary. Skirt at or just above the knee (longer than in the style photo), no low or lingering body shots, nothing suggestive, ever.
- Original characters only. No real people, no caricatures of real people, no existing fictional characters. Real brands and products may be named and described as facts, but draw props as generic look-alikes without real logos.
- Every factual claim in a script needs a source in the research pack.
- AI-made is disclosed on every post.

## Tech

- Project root: /home/user/kshorts
- three.js scenes rendered frame by frame in headless Chromium (software WebGL), assembled with ffmpeg.
- Playwright and Chromium are preinstalled: `require('playwright')` works with `NODE_PATH=$(npm root -g)`. Never install Playwright or browsers.
- WebGL launch flags that work here: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`
- Network: npm and PyPI are reachable; most other hosts are not. Do not depend on CDNs at render time; vendor everything locally.
