# Historillion

Daily history game: 7 questions, 3 seconds to read and then 25 seconds to answer, the rarer your answer the more points.

## Run locally
```
python -m http.server 8000
```
Open http://localhost:8000 (`?day=2026-12-01` forces a day). Opening index.html directly does not work: browsers block ES modules on `file://`.

## Tests
```
npm test
```
(same as `node --test`, no packages needed)

## Scoring
`points = min(100, round(15 * log2(1 / prior_share)))`. Half as common = 15 more points.

## How a game plays
- Type an answer and press Enter. A wrong or unknown answer does not count: you get a hint and can try again until the 25 seconds are over.
- A typo never counts by itself. Press Enter and the suggestion is filled in above your answer bar ("Did you mean Nero? Press Enter."); press Enter once more to confirm, or type to replace it.
- After a correct answer the archaeologist digs. Points, what he found and how rare the answer was show up when the find is out of the ground (any key or tap skips the dig). The 7 finds stay on the bench.
- The end screen shows your score on an estimated curve, your rank, and every question: tap a question to see every possible answer, with rarity filters, a search box, explanations and sources.
- One dig a day: the first game of a day is kept in this browser (localStorage, no account). Coming back the same day shows your score, a countdown and "View results" instead of Start. The start and end screens show your logbook: streak, days played, best score and how often you found a One in a Historillion. Another device or cleared browser data starts fresh. For testing add `&replay=1`: you can play again and nothing is saved.
- The curve is an estimate from the predicted answer shares (`js/distribution.js`), not real players.

## Known limits and later
- All answers and scores are in the source, so players can peek. Move scoring to a backend later.
- Later, real player data: `mixed_share = (k * prior_share + times_chosen) / (k + total_answers)`. Not built yet.
- The `prior_share` values are estimates. Sources per answer are Wikipedia pages; check them before publishing (`docs/bronnen-controle.md`).
- Sound is synthesized in the browser (no audio files); the mute button remembers its setting.

## Style kits
`kit/` is the 8-bit style (default), `kit-b/` the fullscreen 2d style with the animated archaeologist, sound, the kept finds bench and the new end screen. Open `?kit=b`, for example `/?day=2026-12-01&kit=b`. Both have the same hooks, so the choice is one folder. When one wins, delete the other and the `KIT` lines at the top of `js/main.js`. Rules for each style are in `kit/STYLE.md` and `kit-b/STYLE.md`; the 2d kit also has `kit-b/FULLSCREEN.md` (API and notes) and `kit-b/demo.html`.

Three scenes in the 2d kit. Default: the worlds (`kit-b/world-scene.js` + `kit-b/world.css`, v13): every answer digs deeper, and enough points break through to an older world (borders in `ERAS[].from`: 0, 80, 160, 230, 300, 360, the golden tomb at 420). `&scene=shaft` shows the cross-section in metres (v12), `&scene=pit` the earlier pit with the bench (`kit-b/dig-scene.js`). `DIG` and `museum()` come from `dig-scene.js` in all three. The ranks in `js/strings/en.js` and the end curve (0 to 560) follow the expected score spread: half the players end near 270, the top 1 % above 410.

Panel transparency of the 2d kit (add to the address): default is very light glass, `&glass=soft` the previous light glass, `&glass=clear` no panel background at all, `&glass=classic` the kit's own darker glass.

The 2d kit's phone layout (`kit-b/layout-phone.css`: the question without a box, the answer bar at the bottom, one big rarity word) is loaded by `js/main.js` right after `theme.css`; the 8-bit kit does not use it.

Style changes are made in a separate chat that delivers a new `kit-b/`. Our own changes to that kit (the camera in `dig-scene.js`, the dig timing, the centred intro and end screens) must be kept when it is replaced; see git history for `kit-b/dig-scene.js`.
