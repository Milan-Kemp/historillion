// Checks that every character used in the game's data can be drawn by the kit's fonts.
//   node kit-b/tools/check-glyphs.mjs [dataDir = data/days] [kitDir = kit-b]
// Reads every .json file under dataDir, collects the characters of all strings, and reports the ones missing from the TEXT face (Atkinson Hyperlegible: used for
// sentences, so a gap there falls back to the system font, which is fine for one odd letter but worth knowing) and from the DISPLAY face (Pixelify Sans: the question,
// buttons and titles, which would fall back to our capitals-only channel font or the system font). Exit code 1 if a text-face gap exists.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dataDir = process.argv[2] ?? "data/days";
const kitDir = process.argv[3] ?? "kit-b";
const coverage = JSON.parse(readFileSync(join(kitDir, "fonts", "coverage.json"), "utf8"));
const has = (ranges, cp) => ranges.some(([a, b]) => cp >= a && cp <= b);

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (name.endsWith(".json")) yield p;
  }
}
function* strings(value) {
  if (typeof value === "string") yield value;
  else if (Array.isArray(value)) for (const v of value) yield* strings(v);
  else if (value && typeof value === "object") for (const v of Object.values(value)) yield* strings(v);
}

const used = new Map();                                         // character -> a file and an example
for (const file of files(dataDir)) {
  for (const s of strings(JSON.parse(readFileSync(file, "utf8")))) {
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      if (cp < 0x20 || cp === 0x7f) continue;
      if (!used.has(ch)) used.set(ch, { file, example: s.slice(0, 60) });
    }
  }
}
const missing = (face) => [...used].filter(([ch]) => !has(coverage[face], ch.codePointAt(0)));
const report = (face, list) => {
  console.log(`${face}: ${list.length ? list.length + " character(s) missing" : "all characters covered"}`);
  for (const [ch, info] of list) console.log(`  U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")} "${ch}"  e.g. ${info.file}: ${info.example}`);
};
console.log(`${used.size} distinct characters in ${dataDir}`);
const text = missing("text");
report("text face (Atkinson Hyperlegible)", text);
report("display face (Pixelify Sans)", missing("display"));
process.exit(text.length ? 1 : 0);
