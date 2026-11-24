# 2D kit: fullscreen dig scene, v2 (better art and animation)

The scene is the page. A layered dusk scene fills the viewport (sky with stars and a moon, drifting clouds, far hills with ruins, a treeline, a textured meadow with the dig site). A thin top bar shows 7 progress squares, the score and the timer. The question sits in a panel in the upper middle, over the sky; the dig site is below it. An archaeologist stands at the pit: after each answer he digs with the tool that belongs to the rarity, the find rises out of the pit, he reacts, and a pixel reaction text floats up.

Open `demo.html` (serve over http: `python -m http.server 8000` in the folder above the kit) to play a fake game with the real kit code. `demo.html?screen=rare&still=1` jumps to a state with final frames; `screen=` takes `intro | ask | common | uncommon | rare | veryRare | none | end`; `&hint=1` shows the "did you mean" line; `&nofocus=1` keeps the input unfocused.

Older layouts are kept, not deleted: the first card layout is `theme-card.css` + `dig-scene-card.js` + `styleguide.html`. The 8-bit kit is untouched.

## What is new in v2
| | |
|---|---|
| **Scene** | 6 stacked layers that share one coordinate system (`scene/sky.png`, `twinkle.png`, `clouds.png`, `far.png`, `ground.png`, `mid.png`) plus `grass.png` and `bird.png`. Dusk palette: night blues and purples into brick and gold at the horizon, warm lantern light on the meadow. A far temple, an arch and an aqueduct make it feel like a place. |
| **Ambient, quiet motion** | Clouds drift sideways (one tile in 7 minutes, in whole pixels), stars twinkle, a bird crosses the sky every 46 s, the grass round the site sways. All stop under reduced motion. |
| **Archaeologist** | Rebuilt: bigger (about 50 art pixels with the hat), a two-bone skeleton for arms and legs so poses are smooth, hat, face with eyes and brows and a mouth that changes, scarf, vest, backpack, boots. 1 px dark brown outline (never black) so he reads on any ground. 12 rows x 6 frames in `scene/man.png`: idle, ready, brush, pickaxe, digger, truck, spoon, and 5 reactions. |
| **Reactions** | none = head shake and a sweat drop, common = shrug, uncommon = nod and fist bump, rare = jump with sparkles, very rare = a bigger victory jump with confetti. The last frame of each is a hold pose (arms still up for rare and very rare), which is also the still frame for reduced motion. |
| **Machines** | The digger and the dump truck are now a separate layer (`scene/machine.png`, 6 frames each, 144 x 80) behind him, so they stay in place while he reacts. More detail: tracks with rollers, cab with glass, hydraulic piston, bucket with teeth, tipping bed with earth pouring out. |
| **Finds** | Redrawn at 48 x 48 with real shading: painted pottery shard with a Greek key, a coin with a profile and a beaded rim, a crown with velvet and gems, a marble bust, a mossy rock. `scene/reveal.png`: 6 frames each, the find rises, overshoots by 3 px and settles; `sparkle.png` for rare and very rare. |
| **HUD** | 7 progress squares top centre (filled = answered, current = highlighted), score chip top right, optional text chip top left, the timer under them. Compact one-row form when the screen is short. |
| **Panel** | The question is a large panel in the upper middle, in big pixel type (16 px on a phone, 24 px on wide screens). After an answer the question shrinks to one small line, so the panel leaves the dig site and the reaction text uncovered. |
| **Reaction text** | A pixel label (1:1 with the art pixels) that floats up over the dig site: `Nothing`, `Common`, `Nice!`, `Rare find!`, `One in a million!`. |

## The API (what `main.js` calls)
```js
import { mountScene, museum, DIG, REACTIONS } from "../kit-b/dig-scene.js";
const scene = mountScene();                  // once at start-up

scene.hud({ progress: { current: 3, total: 7 }, counter: t.question(3, 7), score: t.scoreLabel(total), timer, chip })
//   progress: the squares. counter: the same in words, visually hidden, read by screen readers. score: text of the score chip.
//   timer: your <p class="timer" role="timer">, moved into the bar (omit it on the feedback screen). chip: optional text chip, top left.
scene.hud(null)                              // hide the bar (intro and end screens)
scene.ready()                                // a question starts: he picks up his shovel, about 1 s, never blocks, any key or tap ends it
scene.dig(key, label)                        // after an answer; key = common | uncommon | rare | veryRare | none; label = the floating text
scene.idle() / scene.reset()                 // back to idle
museum([{ find, label }, ...])               // end screen, unchanged
```
`DIG` is unchanged (common = brush + shard, uncommon = pickaxe + coin, rare = digger + crown, very rare = truck + statue, none = spoon + rock).

## Exact edits in `js/main.js` and `js/strings/en.js`
You already made the v1 edits (`mountScene`, `key` in `grade()`, `scene.hud/ready/dig/reset`, museum on the end screen). v2 needs only these changes on top of them:

1. **`ask()`**: replace the `scene.hud({...})` call, and drop the question counter text; the squares replace it.
   ```js
   scene.hud({
     progress: { current: i + 1, total: day.questions.length },
     counter: t.question(i + 1, day.questions.length),                       // for screen readers, visually hidden
     score: t.scoreLabel(results.reduce((s, r) => s + r.pts, 0)),
     timer,
   });
   ```
2. **`feedback()`**: same `scene.hud({ progress, counter, score })` without `timer`, and pass the reaction text:
   ```js
   scene.dig(r.key, t.reaction[r.key]);
   ```
3. **`js/strings/en.js`**: add
   ```js
   scoreLabel: (n) => `Score ${n}`,                                           // already there from v1
   reaction: { none: "Nothing", common: "Common", uncommon: "Nice!", rare: "Rare find!", veryRare: "One in a million!" },
   ```
   (Short, uppercase in the art. `REACTIONS` in `dig-scene.js` holds the same English defaults, so `scene.dig(key)` works without them.)
4. **Nothing else changes.** `main#app` still holds the question, the input and `p.msg`; the timer is still `p.timer` with `role="timer"`; feedback keeps `p.dig` and `p.points`. If your `index.html` has no `viewport-fit=cover`, add it (`width=device-width, initial-scale=1, viewport-fit=cover`) so the notch is respected.

## How it is built
- **Zoom in whole steps.** `dig-scene.js` picks a whole-number zoom `--s` (3 on a 375 px phone, up to 4 on a laptop) so every art pixel is the same size, and `--sy` so the dig site sits in the space below the panel. The layers are 640 art pixels wide and centred on the screen, so a 1440 px screen shows more meadow and the far ruins and trees, a phone shows the sky behind the bar and the dig site.
- **Sprite sheets** are small PNGs played with CSS `steps()` (`man.png` 46 KB, `machine.png` 8 KB, `reveal.png` 9 KB, `sparkle.png` under 1 KB). The whole scene is about 150 KB.
- **Timing after an answer** (measured in a browser by sampling the CSS frame positions): digging 0 to 0.6 s, the find rises 0.35 to 0.7 s, the reaction animation 0.65 to 1.25 s, the label floats 0.7 to 1.2 s, sparkles 0.65 s on. About 1.3 s in total. Nothing blocks: the input, Enter and Next work at once, and any key press or tap during the beat jumps everything to its end state.
- **Reduced motion.** Nothing moves: the man shows his hold pose, the find is fully risen, the clouds, stars, grass and bird are still (the bird is hidden), the timer bar and blink are off. The timer's colour change stays. The reaction label still appears, at rest. `mountScene(document.body, { still: true })` forces the same for tests and screenshots.
- **Short screens** (the `compact` class, set when the usable height is under 560 px: keyboard open, landscape phones): a one-row bar (squares, timer, score), a smaller panel with the input and button on one row, a smaller zoom. Checked at 375 x 470: the question, the input, the hint line, the man and the pit are all visible. The scene follows `visualViewport` (height and keyboard offset `--kb`).

## Contrast (WCAG, measured)
Text is on plates. Cream on wood (panel, chips) 15.4:1; muted cream on wood 10.1:1; gold on wood (title, points, score) 11.4:1; button text wood on gold 11.4:1; hint text 7.1:1; input text on cream 15.4:1, placeholder 6.1:1; timer digits and bar 11.4:1, last quarter (red) 6.5:1. Progress squares (not text, needs 3:1): filled gold against an empty square 9.1:1, the current square cream 12.3:1.
The floating reaction label is the one text on the artwork: it is decorative (`aria-hidden`; the same information is in the panel's rarity line and `p.dig`) and every letter has a 1 px dark outline, so each colour is measured against its own outline: cream 18.2:1, gold 16.7:1, green 11.4:1, muted 11.9:1.

## Screenshots
`previews/v2-375-*.png` and `v2-1440-*.png` (real viewport sizes, headless Chrome, final frames): `intro`, `ask`, `rx-none`, `rx-common`, `rx-uncommon`, `rx-rare`, `rx-veryrare`, `end`, plus `v2-375-keyboard-open.png` (375 x 470). `v2-animations-sheet.png` shows every frame of idle, ready and the five digging rows; `v2-reactions-sheet.png` every frame of the five reactions (the screenshots show the hold pose, the sheet shows the motion).

## Limits and what I did not check
- Not tested on a real iPhone or Android keyboard; the keyboard handling was checked with a 375 x 470 viewport and the `visualViewport` API.
- I watched the playback as numbers (frame positions over time) and as frames on contact sheets, not as a recorded video. The first-glance feel of the timing (0.1 s per frame) is untested by a person.
- On a 375 px phone the pit's right edge is cropped by design (zoom 3 shows about 125 art pixels). The far ruins and trees are mostly hidden behind the panel on a phone; they show on wide screens and in the strip between the panel and the dig site.
- The long labels ("One in a million!") are the widest text on the artwork: about 100 art pixels, which fits a phone at zoom 3 but nothing wider.
- The panel can grow when an explanation is very long: it scrolls inside, and may cover the top of the dig site. The question screen and a normal feedback screen fit.
- `previews/question.jpg` and `feedback.jpg` belong to the old card layout.
- The scripts that draw all of this are in `style-kit/_build/v2/` (`char2.py`, `props2.py`, `world2.py`) and `shots.py` in the history-8bit project; the site does not need them.
