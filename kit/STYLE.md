# Historillion style kit: 8-bit

The channel's original look (Sprites of History videos 001 to 008): a dusk-blue night page, golden-hour warmth, hard dark outlines, notched pixel borders, one yellow keyword. Everything is drawn from one fixed palette. Read this file first, then open `styleguide.html` (serve it over http) to see every screen styled.

## What is in this folder
| File | What it is |
|---|---|
| `theme.css` | Drop-in replacement for `css/style.css`. Tokens at the top (`:root`). Styles every tag and class that `main.js` produces. |
| `dig-scene.js` | ES module: `digScene(tool, find)`, `museum(items)`, and `DIG` (rarity key to tool and find). Built with `createElement`, no `innerHTML`. |
| `fonts/sprites-pixel.woff2` (+ `.ttf`) | The channel's 5x7 pixel font as a real font (capitals only, lowercase shows as capitals). Own work, no licence issues. Hosted here, no external requests. |
| `sprites/tools/*.png`, `sprites/finds/*.png`, `sprites/sprites.json` | The 5 tools (48x40) and 5 finds (40x40), transparent PNG, foot at the bottom middle. `sprites.json` has sizes and alt text. |
| `scene/dig-site.png`, `scene/scene.json` | The dig-site picture (160x72, a golden-hour cutaway of the pit) and the pixel anchors for tool and find. |
| `brand/logo.png`, `brand/favicon.png` | Logo (use for share image and meta tags) and a 32x32 coin favicon. On the page the title is real text in the pixel font (`h1`), not the PNG. |
| `palette.json` | The full palette: 10 ramps of 6 tones plus the outline colour. |
| `previews/*.jpg` | Screenshots at 375 px of how it should look. |

## Palette (use only these colours)
Ten material ramps, six tones each (0 darkest to 5 lightest): night, sky, stone, wood, brick, gold, paper, leaf, teal, skin. Shadows lean cool and purple, highlights lean warm. Outline colour `#0e0a18`, never pure black.

Roles used by the UI (all tokens are in `theme.css`):
| Role | Colour | Contrast |
|---|---|---|
| Page | night 1 `#121234`, with a quiet 2 px checkerboard of night 0 | |
| Card / hint panel | night 2 `#1e1846` | |
| Text | paper 5 `#faf6eb` | 15:1 on panel |
| Muted text | sky 4 `#acd2f0` | 10:1 on panel |
| Accent (title, points, buttons) | gold 3 `#ffd038` | 12:1 on page |
| Button text | outline `#0e0a18` on gold 3 | 13:1 |
| Hint text | brick 5 `#faaa8c` | 9.6:1 |
| Timer, last quarter | brick 4 `#ec6e5a` | 5.4:1 |
| Borders | sky 2 `#5080d0` | 4.6:1 (non-text needs 3:1) |
| Focus ring | sky 5 `#deeefa`, gold on inputs | 15:1 |

All measured with the WCAG formula, all pass 4.5:1 for text. If you add a colour, measure it.

## Type
- Pixel font (`Sprites Pixel`) only for short UI words: title, "Question 3 of 7", buttons, timer, points, table headers. Always uppercase.
- Crisp sizes are multiples of 8 px (one font pixel = size / 8): 16 px, 24 px, 32 px. In between it blurs.
- Question text, hints, explanations and table cells use the system sans (`system-ui`): long text in an all-capitals 5x7 font is unreadable.
- The title has the video headline look: gold, with a hard dark drop shadow.

## Shapes
- One art pixel = `--px` = 3 px on screen. Borders are 3 px.
- Notched corners with no images: four 3 px box-shadows (up, down, left, right) leave the corners empty. See the `.pix` rule.
- Hard drop shadow: `6px 6px 0` in the outline colour, never blurred.
- Buttons: flat gold, a light top edge and a dark underside (inset shadows), pressed state moves 3 px down.
- No gradients, no rounded corners, no blurred shadows. The only gradient is the stepped timer bar.

## Sprites (what to keep when you draw more)
- Native size, never smoothed: `image-rendering: pixelated`, show at whole multiples (the scene is shown at fluid width, the museum finds at 80 px = 2x).
- Every shape has a lit top-left edge (+1 tone) and a shaded bottom-right edge (-1 tone), plus a 1 px outline in `#0e0a18` around the whole sprite.
- About four values per object, hue-shifted ramps (shadows cool, highlights warm). Light always from the upper left.
- Tools sit on a 48x40 canvas, finds on 40x40, foot at the bottom middle so they stack in the scene.
- Mapping: common = brush + pottery shard, uncommon = pickaxe + coin, rare = digger + crown, very rare = truck + statue, no valid answer = spoon + rock.

## Motion (all optional, all off under `prefers-reduced-motion`)
- Timer bar drains in 20 hard steps (CSS only, `--secs` sets the length), the digits turn red in the last quarter, the frame blinks twice a second.
- Reduced motion keeps the colour change (it is not movement) and drops the bar drain, the blink, the tool bobbing and the find popping up.
- Steps, never easing: `steps(2)`, `steps(5)`. Smooth tweens do not belong in this style.

## How to wire it into Historillion (small changes only)
1. Copy this folder into the site, e.g. `kit/`. Link `kit/theme.css` in `index.html` instead of `css/style.css`. Add `<link rel="icon" href="kit/brand/favicon.png">`.
2. Question screen: add `digScene(null, null)`, the empty dig site (the tool is only known after the answer; `digScene("brush", null)` is a fine "digging starts" variant). Feedback screen: `digScene(tool, find)` from `DIG[rarityKey]`. The rarity key is already computed in `grade()`; keep it in the result (`key`) so `feedback()` and `end()` can use it.
3. End screen: `museum(results.map((r) => ({ find: DIG[r.key].find, label: r.dig.find })))` above the table.
4. Table cards on a phone: give each `td` a `data-label` with its header text (`"data-label": t.questionCol`, via `el()`), the CSS uses it.
5. Replace the emoji in `t.dig` (`js/strings/en.js`) with plain words; the sprites replace them. Keep the sentence "You dug up X with Y": the scene is decorative (`aria-hidden`) and that sentence is its text alternative.
6. If `SECONDS` is not 20, set `--secs` on the timer: `timer.style.setProperty("--secs", SECONDS + "s")`. Optional: `timer.classList.toggle("low", left <= 5)` as a JS fallback for the red state.
7. Do not touch `matching.js`, `scoring.js`, `data/`.

## Do and don't
- Do keep the notched border, the gold keyword, hard shadows, warm light on a cool page.
- Do not add smooth gradients, blur, rounded buttons, system emoji or a second accent colour.
- Do not use the pixel font for sentences.
- Do not scale sprites by non-integer factors without `image-rendering: pixelated`.

## Known limits
- Not tested on a real iPhone (checked in a 375 px browser viewport: no horizontal scroll, input 18 px, targets 44 px or more).
- The font has capitals, digits and basic punctuation only; no accents beyond e with acute (É, é).
- Sprites are static; the "digging" is a 2-step CSS bob. Real animation frames could come later.
