// The dig-site scene and the museum shelf, built with createElement (no innerHTML: nothing here touches player input).
// Sprites are loaded relative to this file, so it works wherever you put the kit folder.
// Usage in main.js:
//   import { digScene, museum, DIG } from "./kit/dig-scene.js";
//   const d = DIG[rarityKey];                       // rarityKey: "common" | "uncommon" | "rare" | "veryRare" | "none"
//   show(..., digScene(d.tool, d.find), ...);       // on the question screen: digScene("brush", null) shows only the tool
//   show(..., museum(results.map((r) => ({ find: DIG[r.key].find, label: r.dig.find }))), ...);   // end screen
//
// Accessibility: the sprites are decorative here (alt=""), because the text next to them already says what was dug up
// ("You dug up ... with ..." in p.dig, and the find's name in the museum). Do not remove that text.

export const DIG = {
  common:   { tool: "brush",   find: "shard" },
  uncommon: { tool: "pickaxe", find: "coin" },
  rare:     { tool: "digger",  find: "crown" },
  veryRare: { tool: "truck",   find: "statue" },
  none:     { tool: "spoon",   find: "rock" },
};

const TOOLS = ["brush", "pickaxe", "digger", "truck", "spoon"];
const url = (kind, name) => new URL(`./sprites/${kind}/${name}.png`, import.meta.url).href;

function img(className, src) {
  const node = document.createElement("img");
  node.className = className;
  node.src = src;
  node.alt = "";
  node.decoding = "async";
  return node;
}

export function digScene(tool, find) {
  const scene = document.createElement("div");
  scene.className = "dig-scene";
  scene.setAttribute("aria-hidden", "true");
  scene.append(img("bg", new URL("./scene/dig-site.png", import.meta.url).href));
  if (tool) scene.append(img("tool", url("tools", tool)));
  if (find) scene.append(img("find", url("finds", find)));
  return scene;
}

// items: [{ find: "coin", label: "Gold coin" }, ...]  -> <ul class="museum">, one case per find
export function museum(items) {
  const list = document.createElement("ul");
  list.className = "museum";
  for (const { find, label } of items) {
    const li = document.createElement("li");
    li.append(img("find", url("finds", find)), document.createTextNode(label));
    list.append(li);
  }
  return list;
}

export { TOOLS };
