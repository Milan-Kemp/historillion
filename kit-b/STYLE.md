# Historillion style kit: 2D

The newer channel look (battle films 005, 007, 009), after SMKS Studios' "Tribe of the Accord": flat, bright, top-down, no black outlines, soft darker-same-hue shadows, chunky wood plates with a cream double border. Read this file first, then open `styleguide.html` (serve it over http) to see every screen styled.

## What is in this folder
| File | What it is |
|---|---|
| `theme.css` | Drop-in replacement for `css/style.css`. Tokens at the top (`:root`). Styles every tag and class that `main.js` produces. |
| `dig-scene.js` | ES module: `digScene(tool, find)`, `museum(items)`, and `DIG` (rarity key to tool and find). Built with `createElement`, no `innerHTML`. |
| `fonts/sprites-pixel.woff2` (+ `.ttf`) | The channel's 5x7 pixel font as a real font (capitals only). Own work, hosted here, no external requests. |
| `sprites/tools/*.png`, `sprites/finds/*.png`, `sprites/sprites.json` | The 5 tools (48x40) and 5 finds (40x40), transparent PNG, foot at the bottom middle. `sprites.json` has sizes and alt text. |
| `scene/dig-site.png`, `scene/scene.json` | The dig-site picture (160x80, a bright top-down meadow with a trench, string grid, tent) and the anchors for tool and find. |
| `brand/logo.png`, `brand/favicon.png` | Logo on a wood plate (share image, meta tags) and a 32x32 coin favicon. On the page the title is real text (`h1`). |
| `palette.json` | The full palette: 10 ramps of 6 tones plus the outline colour. |
| `previews/*.jpg` | Screenshots at 375 px of how it should look. |

## Palette (use only these colours)
The same ten ramps as the 8-bit kit (night, sky, stone, wood, brick, gold, paper, leaf, teal, skin; six tones each). This style leans on **leaf** (bright meadow, page), **wood** (plates), **paper** (cream borders and text) and **gold** (accent).

| Role | Colour | Contrast |
|---|---|---|
| Page | leaf 1 `#1e423a`, sparse lighter dots (grass tufts) | |
| The plate (`main`) | wood 0 `#2c1822`, inner line wood 2 `#683a2c`, top lip wood 1, border paper 5 | |
| Text | paper 5 `#faf6eb` | 15:1 on plate |
| Muted text | paper 3 `#dcc89c` | 10:1 |
| Accent (title, points, button) | gold 3 `#ffd038` | 11:1 |
| Button text | wood 0 on gold 3 | 11:1 |
| Input | cream field (paper 5), text wood 0 | 15:1, placeholder `#6a5a52` 5.6:1 |
| Hint text | brick 5 `#faaa8c` | 9:1 |
| Timer bar | leaf 5 `#bace78`, last quarter brick 4 `#ec6e5a` | 9.7:1 and 5.5:1 |
| Focus ring | gold 4 `#ffee96` | 9.5:1 on the page |

All measured with the WCAG formula, all pass 4.5:1 for text. If you add a colour, measure it.

## Type
- Pixel font (`Sprites Pixel`) only for short UI words: title, "Question 3 of 7", buttons, timer, points, table headers. Uppercase.
- Crisp sizes are multiples of 8 px: 16, 24, 32 px.
- Everything longer (questions, hints, explanations, table cells) uses the system sans.
- Title and points: gold with a dark hard shadow, like the film headline.

## Shapes
- One art pixel = `--px` = 3 px. The whole game sits on **one wood plate** (`main`) on the meadow page, like one big HUD plate from the films. Inside the plate: cream double border outside, brown line inside, 3 px notched corners (done with `clip-path`, `--notch`).
- Buttons: flat gold block, a dark strip under it (the "dark strip under every part" rule of this style), a light top line, notched corners.
- The timer is a segmented bar (20 segments) like the film HUD bars. The scene has the same cream frame as the plate.
- No black outlines anywhere. Depth comes from a darker strip of the same hue underneath, and from soft same-hue shadows on the ground.

## Sprites (what to keep when you draw more)
- Native size, `image-rendering: pixelated`, whole multiples.
- Flat blocks of 3 to 4 tones, no outline. The lower edge of every part and the lower/right rim of the sprite are one tone darker. Light from the upper left.
- Tools 48x40, finds 40x40, foot at the bottom middle. The scene already has a soft shadow painted at the tool and find spots, so sprites carry no shadow of their own.
- Mapping: common = brush + pottery shard, uncommon = pickaxe + coin, rare = digger + crown, very rare = truck + statue, no valid answer = spoon + rock.

## Motion (all optional, all off under `prefers-reduced-motion`)
- Timer bar drains in 20 hard steps (CSS only, `--secs` sets the length); the number and bar turn red in the last quarter; the bar background blinks.
- Reduced motion keeps the colour change and drops the bar drain, the blink, the tool bobbing and the find popping up.
- Steps, never easing.

## How to wire it into Historillion (small changes only)
Same as the 8-bit kit:
1. Copy this folder into the site (e.g. `kit/`), link `kit/theme.css` instead of `css/style.css`, add `<link rel="icon" href="kit/brand/favicon.png">`.
2. Question screen: `digScene(null, null)` (the tool is only known after the answer). Feedback screen: `digScene(tool, find)` from `DIG[rarityKey]`; keep the rarity key in each result (`key`) so `end()` can use it.
3. End screen: `museum(results.map((r) => ({ find: DIG[r.key].find, label: r.dig.find })))` above the table.
4. Table cards on a phone: add `data-label` (the header text) to each `td` through `el()`.
5. Replace the emoji in `t.dig` (`js/strings/en.js`) with plain words. Keep the sentence "You dug up X with Y": the scene is decorative (`aria-hidden`) and that sentence is its text alternative.
6. If `SECONDS` is not 20: `timer.style.setProperty("--secs", SECONDS + "s")`. Optional JS fallback for the red state: `timer.classList.toggle("low", left <= 5)`.
7. Do not touch `matching.js`, `scoring.js`, `data/`.

## Do and don't
- Do keep the single wood plate, the cream border, flat tones, bright meadow, gold accent.
- Do not add black outlines, gradients, blur or rounded corners.
- Do not use the pixel font for sentences.
- The wood plate is dark on a dark page: keep the cream border, it is what separates them.

## Known limits
- Not tested on a real iPhone (checked in a 375 px browser viewport: no horizontal scroll, input 18 px, targets 44 px or more).
- `clip-path` cuts off anything outside the box, including a focus ring, so `theme.css` removes it from a focused button (`button:focus-visible { clip-path: none }`). Keep that rule if you restyle buttons.
- The font has capitals, digits and basic punctuation only.
- Sprites are static; the "digging" is a 2-step CSS bob.
