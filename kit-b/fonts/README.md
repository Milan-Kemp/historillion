# Fonts

| File | Font | Licence | Source |
|---|---|---|---|
| `pixelify-sans.woff2` | Pixelify Sans (variable weight 400-700), copyright 2021 The Pixelify Sans Project Authors | SIL Open Font License 1.1, `OFL-Pixelify-Sans.txt` | https://github.com/google/fonts/tree/main/ofl/pixelifysans (upstream https://github.com/eifetx/Pixelify-Sans) |
| `atkinson-hyperlegible-regular.woff2`, `atkinson-hyperlegible-bold.woff2` | Atkinson Hyperlegible, copyright 2020 Braille Institute of America, Inc. | SIL Open Font License 1.1, `OFL-Atkinson-Hyperlegible.txt` | https://github.com/google/fonts/tree/main/ofl/atkinsonhyperlegible |
| `sprites-pixel.woff2`, `.ttf` | Sprites Pixel, the channel's own 5 x 7 pixel font (built from the Sprites of History engine) | our own work | `style-kit/_build/make_font.py` |

The two open fonts were subsetted to Latin (Latin-1, Latin Extended-A, typographic punctuation) and converted to woff2 with `fonttools` (`style-kit/_build/make_fonts.py`); no outlines were changed and neither font declares a Reserved Font Name, so the names stay. `coverage.json` lists which characters each file can draw (used by `tools/check-glyphs.mjs`).
Downloaded 2026-11-24 with the owner's permission.
