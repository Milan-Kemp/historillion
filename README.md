# Historillion

Daily history game: 7 questions, 20 seconds each, the rarer your answer the more points.

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

## Known limits and later
- All answers and scores are in the source, so players can peek. Move scoring to a backend later.
- Later, real player data: `mixed_share = (k * prior_share + times_chosen) / (k + total_answers)`. Not built in v1.
- `explanation` and `sources` are stored in the data but not shown in v1.
- Sources per answer are currently the list page per question. Check them before publishing.

## Style kits
`kit/` is the 8-bit style (default), `kit-b/` the 2d style. Open `?kit=b` to compare, for example `/?day=2026-12-01&kit=b`. Both have the same hooks and JS API (`dig-scene.js`), so the choice is one folder. When one wins, delete the other and the `KIT` lines at the top of `js/main.js`. Rules for each style are in `kit/STYLE.md` and `kit-b/STYLE.md`.
