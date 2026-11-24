# 2D kit: fullscreen dig scene, v3 (animation, scene, sound, end screen)

The scene is the page: a layered dusk scene, a thin top bar (sound button, 7 progress squares, score, timer), the question in a panel in the upper middle, and an archaeologist at a detailed dig site below it. v3 adds a living idle, a build-up for rare and very rare finds, a richer dig site, synthesized sound and a new end screen with a score curve.

Play it: `python -m http.server 8000` in the folder above the kit, open `demo.html` (click through it to hear the sound; the first tap unlocks audio). Jump to a state with `demo.html?screen=ask|common|uncommon|rare|veryRare|none|end`, add `&still=1` for final frames, `&at=1.15` to freeze a dig beat at 1.15 s (that is how the build-up screenshots were made), `&loop=1` to keep playing questions, `&score=640` for the end screen.

Older layouts are kept: `theme-card.css` + `dig-scene-card.js` + `styleguide.html` (the first card layout). The 8-bit kit is untouched.

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
- The curve's axis labels are body-font 9 units in a viewBox of 320, so about 9.6 px at 343 px wide: small but secondary (the full numbers are in the text above and in the aria-label).
- Scripts that draw the art: `style-kit/_build/v2/` (`char2.py` + `char3.py`, `props2.py` + `props3.py`, `world2.py`) and `shots.py` in the history-8bit project; the site does not need them.
