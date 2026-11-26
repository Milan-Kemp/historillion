# 2D kit, v12: the cross-section, clear and calm; v11: the cross-section dig (deeper = rarer); v10: phone layout

The scene is the page: a layered dusk scene, a thin top bar (sound button, 7 progress squares, score, timer), the question in a panel, and an archaeologist at a detailed dig site. v4 adds **kept finds** (the day's finds stay on a bench at the dig site) and a **new typography system**. Everything from v3 (living idle, build-up for rare and very rare finds, sound, end screen with score curve) is still here; its notes are further down.

Play it: `python -m http.server 8000` in the folder above the kit, open `demo.html` (click through it; the first tap unlocks audio). Useful switches: `?screen=intro|ask|common|uncommon|rare|veryRare|none|end`, `&still=1` (final frames), `&finds=3` (start with the first 3 finds on the bench, up to 7), `&long=1` (the longest question and a long explanation, with accents and apostrophes), `&at=1.15` (freeze a dig beat at 1.15 s), `&loop=1` (keep playing questions), `&score=640`.

## v12 (this version): the cross-section, clear and calm

Same API, hooks and flow as v11 (`scene.dig(key, points)` Promise, `newDay`, `setDay`, `depth`, `finds`, `ERAS`, `eraAt`). Files changed: `shaft-scene.js`, `shaft.css`, `end-screen.js`, demo `shaft.html`. Previews: `2d/previews/v12-375-sheet.png`, `v12-462-sheet.png`, `v12-1440-sheet.png` (intro, question, after common, after very rare, end screen); script `_build/shots12.py`.
1. **Depth bar** (left edge of the free area, between the question and the answer bar): 0 to 700 m in the six era colours, the part not dug yet darker, a gold marker with the metres ("277 m", it blinks at a new era), and under it the goal "700 m, One in a Historillion". It is the only depth readout while playing: the ground meter is gone and `shaft.css` hides the top bar's score (`visibility: hidden`, so the progress squares stay centred). Hidden on the intro/end screen and when the free area is under 150 px (keyboard open).
2. **The result has its own calm strip** just above Next: the big word, the metres and the explanation on one opaque dark panel (cream on rgb(14, 8, 18): 18:1). The question keeps a dark band of its own at the top (down to `--qb`, set by `fit()`), so nothing is read straight over the soil. The dig shows in between (the camera measures that area).
3. **No overlaps on the right:** the ruler labels and the meter chip are gone; the era names (point 6) are the only thing right of the shaft.
4. **The new find stands out:** a gold frame that blinks a few times and stays until the next question. Finds are kept inside the layer they came from (3 art px off each border); close finds step deeper into the left wall. (Era-specific finds, a Roman coin in the Roman layer: not done, it needs new art.)
5. **More of the cross-section:** the ground at 2 screen px per art px on a phone (3 from 700 px wide), the man and the finds drawn at 1 screen px per sprite px on a phone (2 on a big screen), a narrower shaft (32 art px). The grass stays near the top of the free area (no empty sky); on a 375 x 812 phone four to five layers show while asking. Intro: the ground starts right under the panel.
6. **Era names inside the layers:** large, faint (cream at 72 %, years at 86 %) with a full 1 px dark outline, right of the shaft, e.g. "MEDIEVAL / 500 to 1500"; the layer you are in is gold; the bedrock says "One in a Historillion / 700 m". On a big screen they are bigger (30 px) and use the empty soil.
7. **One unit:** rank ranges read "150-249 m", "640+ m"; the curve axis "0 m 200 m 400 m 600 m" (a number every 200, ticks every 100); the curve's aria label adds " m". `endCurve({ unit })` and `rankList({ unit })` take another unit (`unit: ""` for points).
8. **Core sample on the end screen:** `coreSample({ finds: scene.finds, depth: total })` (exported by `shaft-scene.js`) returns a `figure.core` (role img, with an aria label): a slim 16 px column 0 to 700 m in the era colours, the day's shaft down its middle, a gold line at the depth reached, the day's finds left of it at their depths, the eras with their years right of it (the reached one gold), "700 m, One in a Historillion" at the bottom. About 220 px tall, put it first.

### The exact edits in `js/main.js` (v12)
- `import { mountScene, eraAt, ERAS, coreSample } from "../kit-b/shaft-scene.js";`
- End screen: put `coreSample({ finds: scene.finds, depth: total })` first in the `show(...)` call, before the big total. For "View results" of a stored day, call `scene.setDay(...)` before it (as in v11), so `scene.finds` is that day.
- Optional: drop `score` from `scene.hud({...})` (the kit hides it anyway now; the depth bar says it).
- Nothing else: `.wait` after the Promise, reading time, logbook, `?glass=`, `?scene=pit`, your `start`/`lift`/`layer` sounds stay as they are.
### `js/strings/en.js` (v12)
Only if you want the core sample's screen-reader text in en.js: `coreLabel: (m, era, n) => `Today's dig: ${m} m, ${era}, ${n} finds`` and pass `label: t.coreLabel`. The ranks and curve need no string change (the unit comes from the kit; pass `unit: ""` if you ever show points there again).

### Not checked in v12
Real phones and Safari (`body:has()` hides the top-bar score: Safari 15.4+); 375 x 470 with the keyboard open (the bar hides itself there, not looked at); contrast measured from the palette colours (era names: their 1 px outline is #0e0a18, so the ring is at least 8:1; without the outline the faint names fall under 3:1 on the lightest speckle), not with the A/B screenshot tool; the depth-bar chip could cover a find when 3+ finds sit at the same height (they step left towards the bar); the core sample's finds overlap when many are within ~30 m (they step left in lanes).

## v11: the cross-section dig, deeper = rarer

**One idea:** a side view of the ground, one layer per era, the day's ONE shaft. Each answer digs it deeper by its points (1 point = 1 m, 700 m = the bottom, "One in a Historillion"); the find of that answer stays in the shaft wall at that depth. The total score is the depth.
New files: **`shaft-scene.js`** (replaces `dig-scene.js`; same top bar, sound and v10 phone layout), **`shaft.css`** (load after `theme.css` and `layout-phone.css`), demo **`shaft.html`** (`?screen=intro|ask|common|uncommon|rare|veryRare|none|end`, `&day=4` = the first 4 answers already dug, `&still=1`). Old `dig-scene.js`, `demo.html` and their art stay in the kit but are no longer used.
- **The picture** (drawn in code on one canvas, palette only, crisp whole-pixel zoom 2 to 4): a dusk sky strip, grass, six layers with speckle and pebbles and a wavy boundary (Modern 0 to 100 m, Early modern 100 to 200, Medieval 200 to 320, Roman & Classical 320 to 450, Bronze & Iron Age 450 to 580, Stone Age 580 to 700), bedrock with a glint of gold at 700 m. The shaft (52 px wide, dark, a rope down the left wall), the archaeologist at its bottom, the finds in the left wall (the bench sprites from v9: shard, coin, crown, statue, rock), a ruler on the right with the layer names (12 px on screen, the current layer in gold), and the **depth meter** at the side, level with the bottom of the shaft ("277 m" + "MEDIEVAL"; it blinks when you reach a new layer).
- **Removed:** tools per rarity, machines, winch, props, bench, floating label, zoom camera, name tag.
- **The beat** (`scene.dig(key, points)`, about 1.5 to 3 s): he swings the pickaxe, the shaft goes down by the points and the camera follows (the bottom of the shaft stays at 60 % of the free area): common a short step that slows to a stop (about 1 s), rare and very rare faster swings, a rumble and a long drop that speeds up (up to 2.1 s); a "layer" sound and the meter blink at every new era; then the find pops out of the wall, his reaction, the reveal sound, and the **Promise resolves**: that is the moment to remove `.wait`. A key or a tap ends it at once; reduced motion: the end state at once.
- **Intro and end screen** (`hud(null)`): the whole shaft of the day, its bottom near the bottom of the screen, behind the panel.

### The exact edits in `js/main.js`
- Import `import { mountScene, eraAt, ERAS } from "../kit-b/shaft-scene.js";` instead of `dig-scene.js`, and add `<link rel="stylesheet" href="kit-b/shaft.css">` after `layout-phone.css`.
- A new game: `scene.newDay()` (as before). "View results" of a stored day: `scene.setDay(results.map((r) => ({ key: r.key, points: r.pts })))` instead of `setFinds`.
- After an answer: replace `scene.dig(key, label, benchLabel)` and your reveal timer with `scene.dig(key, pts).then(() => resultEls.forEach((n) => n.classList.remove("wait")));` (`key` = common | uncommon | rare | veryRare | none, `pts` = the points of that answer).
- Top bar: `score: `${scene.depth} m`` (or keep the points: they are the same number).
- End screen: the big total can read `${total} m` with `t.reached(total, eraAt(total).name)` under it; `scene.celebrate()` for 640+ as before.
- Nothing else in the flow changes: reading time, 25 s, typo hint, logbook, end screen sections, `?glass=`, sounds (new: `layer`).
### `js/strings/en.js`
`reached: (m, era) => `You reached ${m} m, ${era}``, `metres: (m) => `+${m} m`` for the points line under the big word; the layer names live in `ERAS` (export) if you want them in en.js.

### Not checked in v11
Real phones and Safari; 375 x 470 with the keyboard; the end screen on a phone shows only the bottom of the shaft behind the panel (the panel is tall); contrast of the layer labels was not measured (cream on an 82 % dark chip, about 13:1 by the colours); 8 answers at the same depth (only 2 side by side are handled well).

---

## v10: the cleaner phone layout (like Krillion): no question box, answer bar at the bottom, one big word

New file **`2d/layout-phone.css`** (load it AFTER `theme.css`) and a new `fit()` / `camPlace()` / `paint()` block in `dig-scene.js`. Everything is scoped to `body:not(.no-hud):not(.phase-end)`: the intro and the end screen keep their centred panel. The side layout is gone (on wide screens everything stays centred in a 30rem column).
1. **The question without a box**: big text (`h2`, 22 px display, 33 px from 700 px wide) straight over the scene under the top bar, a full dark outline and glow on every letter (`--halo-q`) and a very soft dark fade from the top of the screen to just under the question (`main::before`). Measured on the real scene (`_build/contrast7.py default`, 375 x 812, 430 x 932, 462 x 840, 1366 x 650, 1896 x 930, ask / feedback / rare): question and big word (cream) 18:1 against the outline, at least 6.1:1 even 2 px out; gold 8.7 and 5.8; the small muted lines had up to 3 % of their 2 px halo under 4.5:1, so they are now cream (92 %) instead of muted cream. The green timer digits measured as outliers (the ring is not hidden by my tool), not a text problem.
2. **The answer bar at the bottom**: `main > form` is fixed at the bottom (56 px tall, above the on-screen keyboard: `--kb`, set first in `fit()` from `visualViewport`), the **round timer** (a conic ring that drains in 20 steps, the seconds in the middle; `.timer.reading` = a full ring with "Read 3" in small type) sits next to it, the hint `p.msg` is fixed directly above the bar (hidden while empty). On the feedback screen the **Next** button replaces the bar.
3. **One big word**: `p.rarity-word[data-key]` (55 px display, uppercase, cream / green / gold / muted by rarity, a stepped pop-in) with `p.points` ("+30", 44 px gold) under it and `p.explain` small under that. `.rarity-line` and `.dig` stay in the DOM for screen readers but are not drawn. `.wait` (`opacity: 0; visibility: hidden`) keeps their place, so nothing jumps; before the reveal only the question and "Your answer" show and the dig stays in view. The floating reaction label over the pit is hidden in this layout (the big word replaces it); the name tag of a held-up find stays.
4. **The free area and the camera**: `fit()` measures the bottom of `main` (the question block) and the top of the fixed bar / hint / Next, and puts the stage in between (zoom 2 to 4, the label rows may slide 8 rows under the question, nothing else); it refits on a MutationObserver / ResizeObserver of `main` and on body class changes. `camPlace({ step, left, right })` keeps the stage window `left..right` (stage x) and rows 20 to 102 inside that area: the largest step that fits, centred, never past an edge; `push(step, t, left = 16, right = 148)` (rare: `push(1, 2.6, 16, 148)`, very rare: `push(1, 1.7, 48, 148)` then `push(2, 4.0, 62, 148)`). Step 0 is exactly what `fit()` computed.

### Changes needed in the game
- `css`: add `<link rel="stylesheet" href="...layout-phone.css">` after `theme.css`.
- `js/main.js`, ask screen: `form` and `p.msg` must be direct children of `main` (as now); the timer stays in `#hud` (add class `reading` during the 3 s).
- `js/main.js`, feedback screen: render `h2`, `p.your-answer`, `p.rarity-word.wait` (`dataset.key = key`, text `t.rarityWord[key]`), `p.points.wait` (text `"+" + points`), `p.rarity-line.wait`, `p.dig.wait`, `p.explain.wait`, then the Next button; when the find is out of the ground remove `.wait` from all five (you already do it for three).
- `js/strings/en.js`: `rarityWord: { common: "Common", uncommon: "Uncommon", rare: "Rare", veryRare: "Very rare", none: "Nothing" }` (archaeology names work too).
- `dig-scene.js`: take the block between "the camera (v10)" and `addEventListener("resize", fit)` and the `push` line (and the three `push(...)` calls) into your file; do not replace your whole file.
- The bench labels are 11 px here (v9 patch); your 13 px needs wider places or shorter words.

### Not checked in v10
The question with the real iOS keyboard (375 x 470 is only a short window); 462 x 840 on its own (measured, not looked at); the camera frame by frame in the new layout; a very long question (5+ lines) at 375 x 812; Safari.

---

## v9: clear space between the finds on the bench

Only art and one CSS line changed; **`dig-scene.js` is untouched** (so your `camPlace()`, `paint()`, `push()` + `dim-tight` and shorter timelines are not affected; do not replace your `kit-b/dig-scene.js` with the one in this zip, it is the v8 one).
- `scene/slots.png`: the five bench sprites are redrawn at most **15 px wide** (x 5 to 19 of the 24 px cell) and the places stay 17 to 18 px apart, so neighbours have 2 to 3 px of air (the crown and statue keep a plinth and a smaller glow, radius 8). Heights are 12 to 24 px. Same file name, same 24 x 30 cells, so nothing in the JS changes. Built by `_build/v2/finds8.py`.
- `theme.css`, `#scene .slot-label`: font 11 px (was 12 px) and letter-spacing -0.05em, so the widest labels (`COMMON`, `UN-` / `COMMON`) no longer touch at zoom 3 (about 5 px between chips at 375 px wide; before 1 px). `BENCH_SHORT` at zoom 2 is unchanged.
- Check: `previews/v9-375-bench-crop.png` (7 finds on one row at 375 x 812), `previews/v9-1920-bench.png`.
Not checked: zoom 2 (short phones) and the 1366 x 650 side layout after this change; your end screen.

---

## v8: the very rare beat hauls earth OUT, clearer finds held up with a name tag, longer build-up

Same hooks and API. `scene.dig(key, label, benchLabel, findName)` has an optional 4th argument (the name on the tag); `mountScene(parent, { findNames: { shard: "..." } })` changes the defaults (`Painted shard`, `Gold coin`, `Jewelled crown`, `Marble head`, `Plain rock`). v7 items 0 to 5 still apply.
1. **Very rare, redesigned.** No truck any more (it poured earth onto the dig site). A **hand winch** (a gantry of two posts and a beam beside and over the trench, a pulley, a drum with a crank he turns) hauls buckets of earth UP out of the trench (soil and dust rise from the pit floor), tips them over the back of the trench onto the spoil heaps there, and finally its hook takes the statue and hoists it 12 px out of the pit. Nothing covers the trench, the grid, the bench or the man. New art: `scene/winch.png` (176 x 104 cells), `scene/man.png` row `crank`, `reveal`. The digger of the rare beat takes earth out of the trench and drives away; the truck sprites stay in `machine.png` unused.
2. **Anticipation.** Common about 5 s, uncommon 6 s, none 4.5 s, rare about 8.5 s, very rare about 10.5 s (each ends at once on a key, Enter or tap). Rare: 5 scoops, push-in (one zoom step), heartbeat, held breath (tight vignette, silence), reveal. Very rare: 2 pickaxe strikes, the rig stands up, 4 buckets, two zoom steps, heartbeat, held breath, the statue lifted out. Reduced motion: end state only.
3. **Strokes into the trench.** v7 fixed brush, pickaxe, spoon and digger; the winch bucket works inside the trench (hook y 54 to 57 = pit floor). Frame sheets: `_build/audit7/`.
4. **Finds redrawn** (`_build/v2/finds8.py`): thick near-black outline, big silhouettes, a different colour family each: terracotta shard with a cream painted band and dark blocks, gold coin with a head and beaded rim, gold crown with red, blue and green gems and pearls, pale marble head with a laurel on a gold-trimmed plinth, dark blue-grey rock with moss. The bench versions (24 x 30) are drawn by hand at that size, not scaled down; `sprites/finds/*.png` (48 x 48, the list) and `scene/reveal.png` are updated. **Held up:** after the reveal every find is lifted out, held up for 1.1 s beside him (or hanging from the winch) with a **museum name tag** and the reaction label, then it flies to the bench. He now stays at the trench lip for every reaction.
5. **Your end-screen styles are kept.** In `theme.css` `.answer-search`, `.chip` and the result rows are see-through (a gold outline for the active chip, no solid gold; a transparent search field with cream text); your `css/answers.css` overrides still win.
6. **Fixed:** the seek mode (`demo.html?at=`) recursed on idle micro-actions after about 4 s (screenshots only).

Not checked in v8: playback with sound; the lift and the tag at 375 and 1366 widths frame by frame (checked at 1920 and 1366 for very rare, 1920 for common); the winch on the left side next to the table at zoom 2; the find tag overlapping the reaction label at the narrowest widths.

---

## v7: centred end screen, glass that works with no panel at all, every stroke inside the trench, a roof instead of a tarp, long digs with real tension

Same hooks and API (`scene.dig(key, label, benchLabel)` and the rest). New in the kit, nothing to call:
- **Your two kit changes are kept.** `fit()` uses the `side` layout only for wide windows that are too low (`sFit < 3`, at least 900 px wide, not compact); the intro and end screens stay centred. The kit reads the panel glass itself: `dig-scene.js` looks at `--glass` (whatever `main.js` sets, e.g. for `?glass=clear`) and sets `html[data-glass]` to `clear`, `light` or nothing, so the text halo and the heavier type follow without any extra line in `main.js`. `demo.html` has the same `?glass=` switch.
- A hard reload may be needed once: the scene sheets keep their names (`scene/man.png` is now 21 rows, `scene/machine.png` has 5 rows, `scene/tarp.png` is a new picture).

### 1. The end screen, centred, with the scene in view
The end (and intro) panel no longer grows to 80 % of the height. It ends where the stage begins (`--stagetop`, set by `fit()`), so the man (cheering for the top rank), the pit and the bench stay in view; the content scrolls inside the panel and **"Play again" is sticky** at its bottom edge (a normal gap when the content is short, flush while scrolling). 1920 x 1080: the panel is about 465 px tall, 375 x 812: about 390 px. On wide but low windows (1366 x 650, about 1280 x 720) the side layout still applies, as you set it. Screenshots: `previews/v7-*-end*.png`.

### 2. Transparency, measured: default, `light`, `clear`
`?glass=clear` = no panel background and no blur, `?glass=light` = 12 % glass with a 4 px blur. Without a panel the text is readable through a **dark halo on every letter**: default = soft shadow (`0 1px 3px`), `light` = a two-layer glow, `clear` = a full 1 px dark outline in 8 directions plus a soft 5 px and 12 px glow, **bold** body text, and muted cream turned into cream. Everything in the top bar, the feedback and end panels and the "All answers" card uses it; borders and shadows go away in `clear`.
**Measured on the real pages** (`style-kit/_build/contrast7.py`, Chrome renders the glass, the blur and the halo; for each text colour the worst pixel in the 1 to 2 px ring around the letters, i.e. in the halo, at 375 x 812, 1366 x 650 and 1920 x 1080 for the ask, feedback and end screens; "bare" = the same letters against the scene alone, no glass, no halo):
| mode | cream | muted cream | gold | green | share of the 2 px halo ring under 4.5:1 |
|---|---|---|---|---|---|
| default (38 % glass) | 8.6 | 5.1 | 7.3 | 8.5 | 0 % (muted cream dips to 4.2 at 2 px, end screen 1920) |
| `light` (12 % glass) | 4.7 | 3.1 | 2.3 | 5.2 | up to 9 % |
| `clear` (no background) | next to the outline 8 to 18 (1 px ring); weak spots 1 to 3 % (muted cream up to 17 %) | | | | see below |
**Recommendation: keep the default 38 % glass.** `light` is marginal. `clear` reads for nearly all letters thanks to the outline, but a few pixels of the halo sit on bright scene spots; the worst values in the last run (1.0 to 1.5) came from things my method cannot separate from text (the timer bar, gradient rank text), so treat `clear` numbers as rough. After the first run I brightened muted cream and the timer green in `clear` and thickened its halo; only `clear` was re-run.

### 3. Every stroke lands inside the trench
He now stands at the **trench lip** (8 px higher and 24 px closer than before) for every dig and reaches INTO the trench: the brush, pickaxe and spoon tips, the sparks, soil and dust all land at stage x 119 to 130, y 71 to 76, inside the trench (x 90 to 150, y 22 to 80); before, the tips were at y 98, below it. He walks from the idle spot to the lip diagonally (0.3 s). The digger bucket and the truck bed already worked inside it (fx at 100 to 120 x 54 to 62, checked frame by frame). Frame sheets for every beat at 375, 1366 and 1920: `style-kit/_build/audit7/`.

### 4. The roof
The white tarp is gone. In its place (same file name, `scene/tarp.png`) a **small wooden lean-to roof** of planks in the hut's wood ramp over the sieving frame; only a little rope with a tag sways. No large pale shape is left.

### 5. Longer digs, real anticipation
Durations (all still end at once on a key, Enter or tap; Next and the input are never blocked): **common 3.5 s, uncommon 4.5 s, none 3.2 s, rare 6 s, very rare 8 s**.
- **Common**: the brush sweeps 3 times (6 strokes), dust each time, then a 0.6 s pause where he leans in and looks, then the brush-off and the find.
- **Uncommon**: the pickaxe chops 4 times, each with a clink, soil and chips, the pitch of the clink rising every hit; the pause; the brush-off.
- **None**: the spoon scrapes 3 times, flicks soil out; a shorter pause; the rock.
- **Rare (6 s)**: a rising rumble (`swell-rare`) and a vignette; the digger drives in and scoops 4 times (soil and dust from inside the trench, a clink on every second scoop); **camera push-in** one whole zoom step around the pit at 2.1 s (with a thud) ; a heartbeat from 1.2 s (accelerating, and the vignette opens a little on every beat); the digger drives away; **the held breath**: 1 s of near silence under a tight vignette closed around him and the pit, he steps up and looks in; then he leans in, the crown appears, **the camera pulls back at once** as he lifts it, sparkles, the label slams, the crown flies to the bench.
- **Very rare (8 s)**, the biggest version: the strong vignette from the start; he strikes twice with the pickaxe (the second one rings on something hard); a 5 s rising rumble (`swell-veryRare`); the truck backs in and **tips twice** (soil and dust); **two zoom steps** (1.3 s and 3.4 s); a heartbeat from 1.6 s; the truck leaves; **the held breath** (1.2 s of silence, tight vignette, he stares); he leans in deep; the statue; the pull-back as he lifts it; confetti-like stars, the label slam.
- **Zoom** is in whole steps (zoom `s` becomes `s + 1`, or `s + 2`; for example 3 to 4 to 5) so every pixel stays crisp; the pit stays where it is on screen (the stage is zoomed around the spot between him and the pit, so he stays in view), `fit()` keeps working during it (resize, keyboard) and the panel, the input and Next are untouched (the panel is above the scene, and see-through). The bench may leave the bottom of the screen for the moment of the push; the pull-back brings it back.
- **Reduced motion**: no zoom, no camera, no vignette, no movement: the end pose, the find on the bench and the label.
- New sounds in `sound.js` (all synthesized): `hit` (pickaxe, `play("hit", n)` = n half steps higher), `scrape`, `swell-rare`, `swell-veryRare`, `heartbeat`, `thud`, and `sound.hush(seconds)` / `sound.unhush()` for the held breath. `main.js` needs nothing: the scene plays them.
- New art: `scene/man.png` has a row `peer` (he leans over the trench and looks) and the brush, pickaxe and spoon rows are now loop cycles at the trench lip; `scene/machine.png` row 4 `truck_leave` (from v6).

### Not checked in v7
- Whether the digging looks right on your machine and in motion (I checked frames, not playback); the heartbeat, swell and breath sounds were not listened to.
- `clear` contrast: the numbers are rough (see 2); `light` and default were not re-measured after the last halo change.
- The camera at 900 to 1100 px tablets; `backdrop-filter` in Firefox and Safari.
- At 375 wide the bench goes partly off screen during a push (by design); the man stays in view.
- Only 1920, 1366 and 375 audited; spoon (none) only at 1920.

---

## v6: real transparency, one straight bench, the top rank, the digging glitch, calmer props

Same hooks and API. `fit()` keeps `topUsed` and the `side` layout; the side layout is now also used for the **intro and end screens on wide screens** (so the scene, and the man cheering for the top rank, is not hidden behind a centred panel) and whenever a wide screen (at least 900 px) would only get zoom 2 under the panel (about 1280 x 720 or 1366 x 768): it then gets zoom 3 or 4 beside the panel.

### 1. Real transparency
Panels, top-bar chips, the sound button, the timer and the "All answers" card are now **38 % dark glass** (`--glass: rgba(24,12,20,.38)`) over a **12 px blur, brightness 0.55 and a little extra saturation** (`--blur`), a thin 16 % light edge, a soft shadow, and a soft text shadow under every letter. The scene is clearly visible through them, dimmed and blurred. Without `backdrop-filter` the panels fall back to 92 % opaque.
**Measured on the real scene** (`style-kit/_build/contrast6.py`): for 375 x 812, 1366 x 650 and 1920 x 1080 and for the ask, feedback and end screens (with the All answers card) it renders the scene without the panels, reads the real boxes of every panel and chip from the page, applies the blur and the brightness the way `backdrop-filter` does, lays the glass over it, and takes the WORST pixel behind each box (the brightest one, for light text; text shadows are not counted). Worst case over every size, screen, panel and chip: **cream 8.6:1, muted cream 5.7:1, gold 6.3:1, hint 4.95:1, green 5.4:1, gold-lit 7.9:1**; all at least 4.5:1. Typical panels are 9 to 12:1 for the main text. The script takes `alpha blur brightness` arguments if you want to try other values.
Not measured: the browser's own rendering of `backdrop-filter` (I used the standard definition), and states in motion.

### 2. The bench: one straight row again
All 7 finds stand on **one row, evenly spread, 1 to 7 from left to right**. The rarity word sits on the face of the bench under each find in **one or two short lines** (`Common`, `Un-` / `common`, `Rare`, `Very` / `rare`, `No` / `find`), 12 px on screen whatever the zoom, bold, in the rarity colour on a dark chip. At 375 x 812 (zoom 3) the places are 52 px apart and the chips do not touch (screenshot `previews/v6-375-bench-crop.png`). The numbers 1 to 7 are gone (the order is the order of the row).
Edit: `BENCH_LABELS` values may contain `\n`; in `js/strings/en.js` write them the same way (`benchLabel: { common: "Common", uncommon: "Un-\ncommon", rare: "Rare", veryRare: "Very\nrare", none: "No\nfind" }`). At **zoom 2** (a short phone such as 375 x 640) 7 words cannot fit 34 px places; there the labels switch to codes (`Com`, `Unc`, `Rare`, `V.R.`, `None`). That is the one place the words are not shown: tell me if you want something else there.

### 3. The top rank (640 and up)
Hook: **`scene.celebrate()`**. Edit in `js/main.js`, in `end()`, right after `scene.hud(null); scene.reset(); scene.sound.play("finish");`:
```js
if (total >= 640) scene.celebrate();      // the top rank: "One in a Historillion"
```
What it does: the archaeologist jumps and cheers (the very-rare victory row, looping, in the scene beside the panel), 26 small confetti squares fall, a fanfare plays (`reveal-veryRare`), the rank name shimmers gold, the rank row glows, the curve marker glows and the total turns bright gold. `idle()`, `ready()` and `dig()` clear it again, so it never survives into the next game. With reduced motion everything is static: the man holds his arms-up pose, the confetti rests where it is, the name stays gold, the marker keeps its glow.
`end-screen.js`: the last rank is now "One in a Historillion" ("A perfect dig. Seriously." by default; yours go in `en.js`), `rankList` adds the class `top` to the row when it is the highest rank, `endCurve` adds `top` to the figure when `total >= topFrom` (default 640).

### 4. The digging glitch: what I found and fixed
I could not reproduce "he goes through the half" as one event, but stepping through every beat frame by frame (`style-kit/_build/audit6.py`: `demo.html?at=` in 0.1 s steps, 1366 x 650, 1920 x 1080 and 1280 x 720, contact sheets in `style-kit/_build/audit/`) and checking every sprite sheet by script found real defects, any of which would look like that:
1. **Frames cut off at the sheet cell** (the most likely cause): 31 of the man's frames had pixels on the cell's edge (pickaxe heads, brush and spoon tips and dust at the bottom, the top of the victory jump and the right end of the brush-off, 4 to 18 pixels each) and 5 digger frames lost the tip of the boom at the top. The browser shows exactly the cell, so a tool or a hat was sliced straight through. Cells are now bigger (man 144 x 112, machine 144 x 104) and **no frame of any sheet touches its edge any more** (checked by script).
2. **He teleported between his spots**: the rows at the pit edge (brush-off, leaning, lifting, the rare reactions) are drawn 24 px to the right of the digging rows, so he jumped sideways at every switch. He now walks there in 5 steps (0.3 s) and walks back for the next question.
3. **The digger overlapped the man** (12 % of his pixels were drawn over the machine's counterweight and tracks): the digger is 4 px further right and he stands 2 px further left while he guides it; the overlap is 1 %. The truck overlapped 3 %.
4. **The find did not follow his hands**: it was carried too late. The crown now follows from 1.35 s, the statue from 1.85 s, as he pulls and lifts.
5. At zoom 2 the bench labels overlapped (see 2).
6. **The machine stayed next to the pit while he stepped up to it.** When the dig is done the digger / truck now drives away to the left (0.35 s, new `truck_leave` row in `scene/machine.png`), so he never stands in front of or inside it; the still end state (`opts.still`) has no machine either.
Many of the audit's contact-sheet tiles are plain dark blue: those are blank screenshots from starting several Chrome windows at once, not scene states. **Not found:** any sign that the sheet sizes or the CSS cut a frame wrongly; if the glitch is still there after these fixes, send me the browser, its zoom and a screen recording.

### 5. The tarp and the other props
The tarp is now **weathered off-white canvas**: warm parchment where the low sun hits it, cool purple-grey in the folds and the shaded half, a dark brown rim, same shape and flutter (`scene/tarp.png`). Toned down with the same logic, from the kit's own ramps: the orange safety fence is ochre, the ranging pole and the stakes are deep brick red and parchment instead of bright red and white, the rope barrier and the finds-tray tags are deep brick, the bench's felt mats are deep red, the hut's blue window is a window with a lamp lit inside (warm). The string grid and the lanterns stay bright on purpose (they are what you look at).

### Screenshots (`previews/v6-*`)
`v6-375-*`, `v6-1366-*`, `v6-1920-*`: `ask` (with the urgency edge), `feedback`, `end`, `end-toprank` (score 655); `v6-375-answers.png`, `v6-375-bench-crop.png`, and frame sheets of every beat in `style-kit/_build/audit_final/`.

### Not checked in v6
- The glitch on your machine (see 4).
- `backdrop-filter` rendering differences between browsers; Firefox and Safari were not run.
- The end-screen layout (side panel) on 900 to 1100 px wide tablets was not looked at.
- The confetti and the shimmer in motion (checked as frames, not watched).

---

---

## v5: a believable dig site, a spread-out bench, ambient life, richer digs, urgency, glass panels, "All answers"

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
