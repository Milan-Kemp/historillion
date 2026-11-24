# 2D kit: fullscreen dig scene, v5 (dig site, bench, ambient life, urgency, glass panels, All answers)

The scene is the page: a layered dusk scene, a thin top bar (sound button, 7 progress squares, score, timer), the question in a panel, and an archaeologist at a detailed dig site. v4 adds **kept finds** (the day's finds stay on a bench at the dig site) and a **new typography system**. Everything from v3 (living idle, build-up for rare and very rare finds, sound, end screen with score curve) is still here; its notes are further down.

Play it: `python -m http.server 8000` in the folder above the kit, open `demo.html` (click through it; the first tap unlocks audio). Useful switches: `?screen=intro|ask|common|uncommon|rare|veryRare|none|end`, `&still=1` (final frames), `&finds=3` (start with the first 3 finds on the bench, up to 7), `&long=1` (the longest question and a long explanation, with accents and apostrophes), `&at=1.15` (freeze a dig beat at 1.15 s), `&loop=1` (keep playing questions), `&score=640`.

## v5 (this version): a believable dig site, a spread-out bench, ambient life, richer digs, urgency, glass panels, "All answers"

Keep from before: the `fit()` logic (`topUsed`, and the `side` layout for wide low windows) is unchanged except for the stage window (first row 18, 117 rows, see 2). New switches in `demo.html`: `&urgent=1` (+`&freeze=1` holds the edge at full strength), `&answers=1` (adds a mock "All answers" section to the end screen), `&only=answers` (just that section), `&at=1.55` (freeze a dig beat at 1.55 s), `&finds=N`.

### 1. The dig site (rebuilt: `style-kit/_build/v2/site5.py`)
A rectangular trench with a crisp cut edge and vertical walls: the north wall shows its strata (topsoil, clay, chalk, a thin charcoal layer, dark earth) with shards, bones and stones sticking out; the floor is trowelled, with a lower test square, a row of foundation stones, a post-hole, a black-and-white **scale bar** and a red-and-white **ranging pole**. A **string grid** with red stakes. A **north-arrow board** on a stake, **spoil heaps** north and east of the trench (with a shovel stuck in one), a **sieving frame** with a pile of sifted earth under a **blue shade tarp that flutters**, a trestle table with **finds trays and labelled bags**, crates, a wheelbarrow, a **site hut**, an orange **safety fence** with mesh, a **rope barrier** on posts, a **survey tripod** with an instrument, two lanterns, a signpost. Kept free: the man's working area, the label rows, the bench. The old ruin wall is gone from the dig site (the far hills still have the temple and arch).

### 2. The finds bench (two tiers, zigzag, labels)
The 7 places are spread over **two tiers**: places 1, 3, 5, 7 stand on the upper tier, 2, 4, 6 on the lower one, so neighbours are never beside each other (same-tier places are about 31 art pixels apart). The order is still 1 to 7 left to right. Under each find: **"1 Common", "2 Uncommon", "3 Rare", "4 Very rare", "5 Nothing"** as real text (13 px on screen whatever the zoom, bold, on a dark chip, rarity colour), above all finds so a find in front never hides a label. The bench fits a 375 px phone (checked at 375 x 812). The stage window is now rows 18 to 134 (117 rows). New: `BENCH_LABELS` export, and `scene.dig(key, label, benchLabel)` (the third argument is the word under the find; default English from `BENCH_LABELS`); `mountScene(document.body, { benchLabels: {...} })` replaces them all.
Limit: on a phone the tall finds (crown, statue) on the upper tier reach up to the working area's bottom rows (83 to 92) at places 3 and 5; they do not touch the pit.

### 3. Ambient motion (all off under reduced motion; bird hidden)
Three groups of grass tufts over the **whole meadow** that sway out of step (1.7 s, 2.3 s, 2.9 s periods), **tree tops** that lean and the camp **flag** (a second frame of the treeline), the **tarp**, **lantern flicker** (dithered halo, 3 frames each, two lanterns), two **birds** (46 s and 61 s crossings), the drifting clouds and twinkling stars from before. Everything changes in whole pixels with `steps()`.

### 4. Longer, richer dig beats (still skippable by key, Enter or tap; Next and the input are never blocked)
common, uncommon, none (about 2.5 s): he digs with his tool (brush 1.0 s, pickaxe 1.2 s, spoon 1.0 s), **dust puffs** and **flying soil** at the tool, a **tool clink** (spark star and sound) on the pickaxe strike and the spoon hitting stone, then a new **brush-off** row: he kneels at the pit edge and brushes the find clean while it rises out of the soil, then reacts and the find flies to the bench. rare (about 2.1 s) and very rare (about 2.6 s) keep their build-up and gain dust clouds, flying soil and a clink in the pit. New assets: `scene/fx.png` (dust, soil, clink), man row 19 `brushoff`, sounds `clink` and `brushoff`.

### 5. Urgency in the last 5 seconds
`scene.urgent(true | false)` fades a red border at the screen edges in and out **once per second** (1 Hz, under the 3-flashes-per-second limit); it is also the class `urgent` on `<body>`. With reduced motion it is a static red edge, no pulse. It is cleared automatically by `dig()`, `idle()`, `ready()` and `hud(null)`.
**Edit in `js/main.js`**, in the timer tick of `ask()` (where you set `timer.textContent`): `scene.urgent(left <= 5 && left > 0);`. Nothing else; the existing `tick` sound can stay as it is.

### 6. Glass panels (like Krillion)
The question panel, the feedback, the end screen, the top bar chips, the sound button and the "All answers" card are now dark glass (`--glass`: 78 % of a very dark plum) with a 7 px blur, a 1 px light edge, a soft shadow and 8 px corners; the heavy cream borders and notched corners are gone from panels (buttons keep their gold look). Rows inside use a 1 px line or a faint light tint instead of boxes. Without `backdrop-filter` the panel falls back to 94 % opacity.
**Contrast, measured against the worst case** (the brightest colour in the scene behind the glass, pure white, with no blur): cream text 9.0:1, muted cream 5.9:1, gold 6.6:1, hint/"YOU" 5.2:1, green 5.6:1, gold-lit 8.3:1; all at least 4.5:1. (The "YOU" label and curve marker changed from red to the lighter hint colour for this reason.) The timer plate stays 88 % opaque.

### 7. "All answers" (`js/answers.js`, `css/answers.css`)
I do **not** have those files, so I styled the class names you listed against the structure I assumed from the Krillion example, and the styles are now in `theme.css` (section "All answers"; you can delete `css/answers.css`). Assumed markup: `.answers` > heading + `.answer-tabs` (buttons with `aria-selected` or `.active`) + `.answer-filters` (`.chip` buttons with `aria-pressed` or `.active`, a `<small>` or `.count` for the number) + `.answer-search` (the input itself or a wrapper around it) + `.answer-list` (scrolls, max about 22 rem) of `.answer-item` > `button.answer-row` (the name, and the points as the last `<b>`, `.pts` or `.points`) + `<p>` (the explanation) + `.answer-source` (small, with a link) + `.answer-more` (a full-width button). `.answer-item.now` or `[aria-current="true"]` highlights the player's answer. `demo.html?screen=end&only=answers` shows a mock of exactly this. If your markup differs (for example a `<details>` for the explanation, or div rows), the colours, sizes and spacing still apply but a few selectors will need a rename; tell me the real structure and I will match it.

### Screenshots (`previews/v5-*`)
`v5-375-*`, `v5-1366-*` (1366 x 650), `v5-1920-*` (1920 x 1080): `intro`, `ask-urgent`, `feedback`, `end`, plus `v5-375-answers.png` and `v5-1366-answers.png`, `v5-375-urgent-full.png` and `v5-1366-urgent-full.png` (the red edge at full strength), and dig frames: `v5-375-dig-brush.png`, `v5-375-dig-pickaxe-clink.png`, `v5-375-brushoff.png`, `v5-375-rare-digger.png`, `v5-1920-brushoff.png`.

### Not checked in v5
- **"All answers" against your real DOM** (see 7).
- **The new dig beats by eye in motion**: checked as frozen frames at chosen moments and by script; the timing (about 2.5 s for ordinary answers) is longer than before on purpose, please judge it.
- **Sound** (`clink`, `brushoff`, and everything else) is still unheard by me.
- **Glass over a very busy background**: contrast was computed for the brightest possible colour behind the panel, not measured pixel by pixel on every scene state; the blur only helps.
- **Real devices**, and sizes other than 375 x 812, 375 x 470, 1366 x 650 and 1920 x 1080.
- **Performance**: the whole-meadow grass layers are 3 images of 1280 x 348 (about 9 KB each) that change background position every 2 s; I did not profile low-end phones.

---

## 0. The `topUsed` fix is kept, and extended
`fit()` still lets the stage rise under the panel when the zoom the picture needs (`sMin`) is bigger than what fits below it (`sFit`): `topUsed = min(centred position, vh - 8 - need * s)`. v4 changes around it:
- the stage now needs **118 rows** (stage rows 12 to 130: the floating label down to the bottom of the finds bench), so the bench is never cut off;
- **a new case for wide, low windows (about 1366 x 650, anything at least 900 px wide where `sFit < sMin`)**: rising under the panel would hide the pit behind the panel (the panel is centred, so is the pit). Instead the document gets the class `side`: the panel moves to the right (`.side main`), the top bar and the stage centre on the left part of the screen (`--cx`), the zoom goes up to 4. Checked at 1366 x 650: the whole dig site, the bench and the panel are visible;
- on short phones (for example 360 x 640) the old behaviour stays: the stage rises under the panel so the pit and the bench stay on screen.
Think about this if you add an element: anything that must stay visible goes inside the 125 x 118 art-pixel stage window (stage x 30 to 155, rows 12 to 130), and the stage can be pushed up under the panel.

## 1. Kept finds ("de opgravingen blijven staan")
**What you see.** A wooden bench runs along the bottom of the dig site with 7 numbered places. Each answer's find flies in an arc from the pit to the next place (0.45 s, in steps), in the order found: place 1 first. Small versions of the finds, drawn for the purpose: shard, coin and rock stand on the bench; the crown has a stone plinth and a golden dithered glow, the statue a gold-trimmed plinth and a bigger glow, so a good day shows at a glance. The rock (the "none" find) is placed too: a grey stone on the bench is the story of an empty answer. The bench is visible from the start with its 7 empty numbered plates, so the day looks like something to fill.
**Where.** Under the pit and the man (stage rows 94 to 130, x 32 to 154), so it does not cover the pit, his working area, the floating label (rows 20 to 28), the panel or the top bar. On a 375 px phone (zoom 3, the right side cropped) the bench is fully visible: it is centred on the same x as the man and the pit.
**When.** The find flies over at the end of each beat (about 0.85 s after the answer for common and uncommon, 1.6 s for rare, 2.25 s for very rare, while he celebrates). If the player presses Next before that, or a key or a tap skips the beat, the find is on the bench at once. Reduced motion: the finds are simply there, no flight.
**End screen.** The scene behind the panel keeps the 7 finds (`scene.hud(null)` does not clear them); the finds list in the panel is unchanged.
**API.** `scene.dig(key)` adds the find itself. New: `scene.newDay()` clears the bench (call it when a new game starts), `scene.setFinds(["shard", "coin", ...])` restores a list, `scene.finds` reads the current list. `scene.reset()` is still `idle()` and does **not** clear the finds (so `end()` can keep calling it).
**Edit in `js/main.js`** (the only one): when question 1 starts, `scene.newDay();`, for example next to the `scene.ready()` call: `if (i === 0) { scene.newDay(); scene.ready(); } else scene.idle();`. "Play again" via `location.reload()` already starts empty.

## 2. Typography
### What was wrong (see `previews/before-typo-375-*.png`)
The channel pixel font has only capitals and no accents, so every sentence in it shouted, and the body fell back to `system-ui`, which looked generic next to the art. Everything had the same weight on the feedback screen, line lengths and spacing were arbitrary, and sizes were scattered through the CSS.
### The pairing (both SIL Open Font License, self-hosted, `fonts/`, licences next to them)
| Face | Used for | Files |
|---|---|---|
| **Pixelify Sans** (variable weight 400 to 700, has lowercase and accents) | display: title, the question, buttons, numbers, chips, headings, labels | `pixelify-sans.woff2` 13 KB, `OFL-Pixelify-Sans.txt` |
| **Atkinson Hyperlegible** (made for legibility, Regular and Bold) | every sentence: tagline, explanations, hints, input, rarity line, lists, captions | `atkinson-hyperlegible-regular.woff2` 19 KB, `-bold.woff2` 19 KB, `OFL-Atkinson-Hyperlegible.txt` |
| **Pixel Digits** (our own 5 x 7 channel font, digits only) | the digits inside display text | `sprites-pixel.woff2` 1.5 KB |
All are subsetted to Latin (Latin-1, Latin Extended-A, typographic punctuation) and loaded with `font-display: swap`, so text never blocks. No runtime requests to other sites. About 53 KB in total. `fonts/README.md` has the sources and licences.
**Why Pixel Digits:** Pixelify Sans draws its 5 like an S and its 6 like a b ("150-249" read as "1S0-249"). So every digit in display text comes from our own font, scaled with `size-adjust: 72.73%` so it is exactly 2 px per font pixel where Pixelify is at 22 px (and 3 px at 33), the same height as Pixelify's capitals. Letters stay Pixelify.
### The scale (tokens in `:root`)
Pixelify Sans is built on an 11-pixel em, so it is crisp only at multiples of 11 px: **22** (display small), **33** (title, points), **44** (desktop title), **55** (total). Atkinson sits on a 2 px step. Body text is never under 16 px, secondary text never under 12 px.
| Role | Face and size | Where |
|---|---|---|
| display | Pixelify 700, 55 px (`--px-4`) | the total score |
| title | Pixelify 700, 33 px (44 px on wide screens) | "Historillion", "+62 points" |
| heading | Pixelify 500, 22 px (33 px on wide screens) | the question |
| heading, small | Pixelify 600, 22 px | "Your rank", "Your finds", rank ranges |
| button, number | Pixelify 700, 22 px | Start, Submit, Next, the timer, the score chip, points per find |
| lead | Atkinson 700, 18 px (`--fs-lead`) | "You dug up a crown...", "Better than 28%..." |
| body | Atkinson 400, 16 px, line height 1.5 | tagline, explanation, hints, "Your answer", the input (18 px) |
| small | Atkinson, 14 px | the rarity line, the question after an answer, rank lines, notes |
| micro / label | Atkinson 700, 12 px, capitals, 0.06em tracking | the question in the finds list |
The floating reaction label over the scene still uses the video's capitals font at 8 px, 1:1 with the art pixels: it is art, not interface text. Spacing tokens `--sp-1` to `--sp-5` (4, 8, 12, 16, 24 px); paragraphs are limited to 62 characters.
### Hierarchy on the feedback screen
Before: eight equally weighted lines. Now (CSS `order`, no change to the DOM or `main.js`): the question shrinks to one small muted line, "Your answer" is body, then a rule, then **"+62 points"** (title), then **"You dug up a crown..."** (lead), then the rarity line (small, muted), then the explanation (body), then Next.
### Long strings and accents
`demo.html?screen=ask&long=1` and `?screen=common&long=1`: the longest question ("Name an explorer from the Age of Discovery (c. 1400 to 1600). Álvares Cabral and Ch’in-era admirals count too.") and a 280-character explanation with accents and curly apostrophes wrap well at 375 px, 1366 x 650 and 1920 x 1080 (`previews/v4-*-ask-long.png`, `-feedback-long.png`). A very long explanation makes the panel taller and it can cover the top of the stage (the man's head); the Next button stays visible.
### Check your data: `tools/check-glyphs.mjs`
`node kit-b/tools/check-glyphs.mjs [data/days] [kit-b]` reads every `data/days/*.json`, and lists any character the text face or the display face cannot draw (exit code 1 for the text face). I did not have your data: **run it**. The fonts cover Latin-1, Latin Extended-A (Polish, Czech, Turkish, Hungarian letters), curly quotes, dashes, the ellipsis, the euro sign. They do not cover arrows (the hint button's "→" falls back to our channel font), Greek, Cyrillic or CJK; those would fall back to the system font.
### Contrast
Unchanged colours, all text on plates: cream on wood 15.4:1, muted cream 10.1:1 (the small rarity line and notes), gold 11.4:1, hint 7.1:1, red 5.5:1 or better. New sizes only.

## Screenshots (`previews/`)
Typography before and after (375 x 812): `before-typo-375-intro.png` / `v4-375-intro.png`, `-ask`, `-feedback-common`, `-end`. All screens at three sizes: `v4-375-*`, `v4-1366-*` (1366 x 650), `v4-1920-*` (1920 x 1080) for `intro`, `ask`, `feedback-common`, `feedback-rare`, `end` (7 finds on the bench), `ask-long`, `feedback-long`.

## What I did not check (v4)
- **Your real data.** Run `tools/check-glyphs.mjs` on `data/days/*.json`; I tested the script on made-up strings only.
- **Pixelify Sans in real use.** Letters read well at 22 px and above; I did not test the font on every device (Windows, macOS, iOS and Android text rendering of an unhinted pixel font can look slightly different; the sizes are chosen to land on whole pixels at device pixel ratio 1 and 2).
- **Flight timing and look** of the finds going to the bench (0.45 s arc) were checked as frames and by script (7 finds fill in order, an 8th is ignored, a fast Next places the find at once), not by eye in motion.
- **Heights between 650 and 812 px on narrow screens** (for example 390 x 700) use the normal layout with the stage rising under the panel when needed; I checked 375 x 812, 375 x 470, 1366 x 650 and 1920 x 1080 only.
- **Pixel Digits spacing:** the channel font's "1" has extra space after it ("1 50"); it is small, I left it.

---

# Earlier versions (still true)

## What is new in v3
**1. Animation** (`scene/man.png`, 8 columns x 19 rows of 128 x 80, motion built from keyframed poses on a two-bone skeleton, so it is smooth)
- **Idle:** a calm 4-frame loop (breathing, weight shift, a blink), plus a random micro-action every 4 to 9 s: wipes his brow, writes in a notebook, glances at the pit, scratches his head, drinks from a flask. They start and end on the idle pose. Never a digging pose.
- **`scene.ready()`** is now a quiet start beat (he looks left, looks right, settles his hat, smiles), 1.2 s. It does not look like a dig. Use it on question 1 only.
- **Digging** (brush, pickaxe, spoon) and the five **reactions** are redone as 8 smooth frames each. Reactions differ clearly: none = head shake, sweat drop, hands out; common = shrug; uncommon = nod and a fist bump held out; rare = jump, sparkles, arms up; very rare = two jumps, confetti, arms up.

**2. Anticipation for good answers.** Common, uncommon and none take about 1.1 s. Rare and very rare build up, still skippable:
| | rare, about 1.9 s | very rare, about 2.5 s |
|---|---|---|
| 0 s | the screen edges darken (vignette), a rumble sound, the digger rolls in from the left while he waves it on | stronger vignette, a beat of silence |
| next | the digger digs, the pit shakes (2 px, two steps), dig sound | 0.3 s: the truck backs in, 0.75 s: it tips its bed, earth pours, a dust cloud grows, the pit shakes |
| then | 0.8 s: he leans over the pit and reaches in, 1.0 s: the crown rises, 1.3 s: he lifts it | 1.3 s: he leans far over the hole, 1.5 s: the statue rises, he lifts it with both hands |
| end | 1.4 s: he jumps, sparkles, the label slams in, the vignette fades | 2.0 s: victory jumps, confetti, sparkles, the label slams in with a glow |
Any key, Enter or tap jumps to the end state at once; the input and Next are never blocked. Reduced motion: no vignette, no movement, only the end pose and the label (at rest).

**3. Scene.** The pit now has layered walls (topsoil, clay, chalk, dark earth, floor) with shards, bones and stones sticking out, plank rim with corner posts, shoring planks, a ladder, a string grid with stakes. Around it: a low cut-stone ruin wall and two columns behind it, a fallen column drum, a rope barrier and a "DIG 07" signpost in front, barrels, a sieve, buckets, a sack, a wheelbarrow, stacked crates, a sorting table with trays, a tent, two lanterns with warm light pools. The man's and the machine's working area is kept free; the panel area is free.

**4. Sound** (`sound.js`, WebAudio synth, no audio files, about 5 KB). 17 events: `tick`, `submit`, `wrong`, `hint`, `dig-brush`, `dig-pickaxe`, `dig-digger`, `dig-truck`, `dig-spoon`, `reveal-none`, `reveal-common`, `reveal-uncommon`, `reveal-rare`, `reveal-veryRare`, `rumble`, `next`, `finish`. A mute button (a pixel speaker, 44 x 44) sits top left in the bar; default on; remembered in `localStorage` (`historillion.sound`); nothing plays until the first tap or key press. The scene plays the dig, reveal, rumble and next sounds itself.

**5. End screen** (`end-screen.js`): big total, the score curve with a "YOU" marker and axis ticks, "Better than N% of players" and the visible note "Estimated, based on predicted answers", a rank list, a finds list, a countdown to the next dig, Play again.

## The API
```js
import { mountScene, museum, DIG, REACTIONS } from "../kit-b/dig-scene.js";
import { endCurve, rankList, findsList, nextDig, RANKS } from "../kit-b/end-screen.js";
const scene = mountScene();                      // once; scene.sound is the sound player

scene.hud({ progress: { current, total }, counter, score, timer, chip, soundLabel })   // soundLabel = the aria-label of the sound button (t.soundLabel)
scene.hud(null)                                  // intro and end screens
scene.ready()                                    // question 1 only
scene.idle()                                     // every other question
scene.dig(key, label)                            // key: common | uncommon | rare | veryRare | none
scene.sound.play(name) / scene.sound.toggle() / scene.sound.muted
```

## Exact edits in `js/main.js`
(on top of the v2 edits you already made; `ready()` on question 1 and `idle()` after it is already done)
1. **`scene.hud({...})`** in `ask()` and `feedback()`: add `soundLabel: t.soundLabel`.
2. **Timer tick** in `ask()`: where you set `timer.textContent` each 100 ms, add
   ```js
   if (left <= 5 && left > 0 && left !== lastTick) { lastTick = left; scene.sound.play("tick"); }
   ```
   with `let lastTick = null;` next to `deadline`.
3. **`submit`** in `ask()`: first line `scene.sound.play("submit");` (every submit).
4. **Wrong answer** in `ask()`: after the hint is shown, `scene.sound.play(hint ? "hint" : "wrong");`.
5. **`end(results)`** becomes `end(day, results)` (call it as `end(day, results)` from `feedback()`), and builds the new screen:
   ```js
   import { scoreDistribution, bins, percentile } from "./distribution.js";
   import { endCurve, rankList, findsList, nextDig } from "../kit-b/end-screen.js";
   // in end(day, results):
   scene.hud(null); scene.reset(); scene.sound.play("finish");
   const total = results.reduce((s, r) => s + r.pts, 0);
   const dist = scoreDistribution(day);
   show(
     el("h1", { className: "total" }, el("span", { className: "sr", textContent: `${t.total}: ` }), String(total)),
     el("p", { className: "sub", textContent: t.totalLabel }),
     endCurve({ bins: bins(dist), total, percentile: percentile(dist, total), labels: t.curve }),
     rankList({ total, ranks: t.ranks, title: t.ranksTitle }),
     findsList({ results: results.map((r) => ({ prompt: r.prompt, typed: r.typed, rarity: r.rarity, find: DIG[r.key].find, findLabel: r.dig.find, pts: r.pts })), title: t.findsTitle, pointsLabel: t.pointsShort }),
     nextDig({ label: t.nextDig }),
     el("button", { textContent: t.playAgain, onclick: () => location.reload() }),
   );
   ```
   `endCurve` returns a `<figure class="curve">` (an `<svg role="img">` with an aria-label, plus the two caption lines, one of them the "Estimated" note). The results table is replaced by the finds list (`ol` of rows with the sprite, the question in small caps, your answer, the find and rarity, the points). `.museum` and `museum()` still exist but the end screen does not use them (each finds row already has its sprite).
6. **`js/strings/en.js`** adds:
   ```js
   soundLabel: "Sound",
   reaction: { none: "Nothing", common: "Common", uncommon: "Nice!", rare: "Rare find!", veryRare: "One in a million!" },
   scoreLabel: (n) => `Score ${n}`,
   totalLabel: "points",
   pointsShort: "pts",
   nextDig: "Next dig in",
   ranksTitle: "Your rank",
   findsTitle: "Your finds",
   curve: { you: "YOU", better: (pct) => `Better than ${pct}% of players`, estimate: "Estimated, based on predicted answers", aria: (total, pct) => `Your score is ${total}, better than ${pct}% of players (estimated)` },
   ranks: [
     { from: 0,   name: "Dust Sweeper",        line: "Plenty of dirt left to dig through." },
     { from: 150, name: "Shard Finder",        line: "Pottery everywhere. A start." },
     { from: 250, name: "Trowel Hand",         line: "Steady digging. The pit approves." },
     { from: 350, name: "Site Supervisor",     line: "Real finds, real sweat. Nice." },
     { from: 450, name: "Field Archaeologist", line: "The museum is calling." },
     { from: 550, name: "Lead Excavator",      line: "Even the trucks listen to you." },
     { from: 640, name: "Legend of the Dig",   line: "One in a million. Seriously." },
   ],
   ```
   (`RANKS` and `CURVE_LABELS` in `end-screen.js` hold the same English defaults, so everything also works without these strings.)
7. Nothing else: `main#app`, `p.timer`, `p.msg`, `p.dig`, `p.points` are unchanged. Do not touch `matching.js`, `scoring.js`, `data/`.

## Contrast (WCAG, measured)
New elements, all on plates: sound button cream on wood 15.4:1 (muted state red 5.5:1); curve axis labels, estimate note and the question in the finds list 10.1:1; "YOU" label 5.5:1; rank range and line on the highlighted row 8.1:1, the current rank in gold 9.1:1; countdown green 9.7:1. Curve line gold against the plate (non-text) 11.4:1. Earlier values (panel, chips, timer, labels) are unchanged, see below in the v2 section of this file's history: cream on wood 15.4:1, gold 11.4:1, hint 7.1:1, timer 11.4:1 and 6.5:1.
The floating reaction label is still the one text on the artwork: decorative (`aria-hidden`, the same information is in `p.dig` and the rarity line), each letter has a 1 px dark outline, measured against that outline 11 to 18:1.

## Screenshots (in `previews/`)
`v3-375-*.png` and `v3-1440-*.png`: `ask`, `rx-none`, `rx-common`, `rx-uncommon`, `rx-rare`, `rx-veryrare` (final hold poses), `buildup-rare-digging`, `buildup-rare-leaning` (375 and 1440), `buildup-veryrare-tipping` (375 and 1440), `buildup-veryrare-lifting` (375), `end`, and `v3-375-keyboard-open.png` (375 x 470). Frame sheets: `v3-sheet-idle-and-micro-actions.png`, `v3-sheet-digging-and-guiding.png`, `v3-sheet-buildup-lean-lift-and-big-reactions.png`, `v3-sheet-reactions.png`.

## What I did not check
- **Sound by ear.** I built it and ran every event without errors, and checked the mute button and the stored choice, but I did not listen to it: the levels and the character of each sound are untested by a person. Expect to tune volumes and notes.
- **`js/distribution.js`.** I do not have the file. `endCurve` uses only the shapes you described (`bins` = `[{from, to, p}]`, `percentile` = a share from 0 to 1), tested with a made-up bell curve in `demo.html`. The real output may need a small adjustment (for example if `p` is a count, not a share; the curve scales to the peak either way).
- **Real devices.** No real iPhone or Android; the keyboard case was checked at 375 x 470.
- **Motion by eye.** The build-up was checked frame by frame (frozen screenshots at chosen moments, sampled CSS frame positions over time), not as a recorded video. Whether 0.1 s per frame and the 2 px pit shake feel right is for a person to judge. The vignette strength (0.8 and 0.93 opacity at the edges) is a first guess.
- The rare and very rare totals are about 1.9 s and 2.5 s by the timeline; the animation is skippable at any moment but I did not time a real click-through.
- The end screen is a scrolling panel: on a phone you scroll inside the panel to reach the finds list and the buttons.
- The curve's axis labels are now 12.5 units in a viewBox of 320, about 12.2 px at 313 px wide.
- Scripts that draw the art: `style-kit/_build/v2/` (`char2.py` + `char3.py`, `props2.py` + `props3.py`, `world2.py`) and `shots.py` in the history-8bit project; the site does not need them.
