#!/usr/bin/env node
/**
 * Check that all Live (published) profiles have world names with the required languages:
 * Chinese (Mandarin), Hindi/Sanskrit, Persian (Farsi), Spanish, English, Japanese,
 * Arabic, Russian, Quechua, French.
 *
 * Run: node scripts/check-world-names-live.mjs
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Parse worldNames and fiberIndex from atlas-data.ts (simplified extraction)
const atlasPath = join(root, "src/app/data/atlas-data.ts");
const atlasContent = readFileSync(atlasPath, "utf8");
const fibersPath = join(root, "src/app/data/fibers.ts");
const fibersContent = readFileSync(fibersPath, "utf8");

// Extract fiber IDs from fibers array
const fiberIdMatches = fibersContent.matchAll(/^\s*\{\s*id:\s*["']([^"']+)["']/gm);
const fiberIds = [...new Set([...fiberIdMatches].map((m) => m[1]))];

// Extract worldNames entries - parse the Record structure
const wnMatch = atlasContent.match(/export const worldNames:\s*Record<string,\s*string\[\]>\s*=\s*\{([\s\S]*?)^\};/m);
if (!wnMatch) {
  console.error("Could not parse worldNames from atlas-data.ts");
  process.exit(1);
}
const wnBlock = wnMatch[1];
const wnEntries = [];
const lineRegex = /^\s*["']?([a-z0-9-]+)["']?\s*:\s*\[([^\]]*(?:\[[^\]]*\][^\]]*)*)\]/gm;
let m;
while ((m = lineRegex.exec(wnBlock)) !== null) {
  const id = m[1];
  const arrStr = m[2];
  const names = [];
  const strRegex = /"([^"]*(?:\\.[^"]*)*)"|'([^']*(?:\\.[^']*)*)'/g;
  let sm;
  while ((sm = strRegex.exec(arrStr)) !== null) {
    names.push((sm[1] ?? sm[2] ?? "").replace(/\\"/g, '"'));
  }
  wnEntries.push({ id, names });
}
const worldNames = Object.fromEntries(wnEntries.map((e) => [e.id, e.names]));

// Replicate detectLangTag logic (must match detail-plates.tsx)
function parseWorldName(raw) {
  const match = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) return { native: match[1].trim(), romanized: match[2].trim() };
  return { native: raw.trim(), romanized: null };
}

function detectLangTag(native, romanized) {
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(native)) return "ja";
  if (/[\uAC00-\uD7AF]/.test(native)) return "ko";
  if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(native)) {
    if (romanized && /[zcs]h|q|x/i.test(romanized) && /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i.test(romanized)) return /[\u4E9F\u570B\u7D72\u7D79\u7DB5\u9ECF\u7121\u9EC4\u70CF\u7E3D\u7D93\u7DAD\u7D44\u7E2B\u7E8C\u7E54]/.test(native) ? "zh-Hant" : "zh-Hans";
    if (romanized && /[āáǎàēéěèīíǐìóòǒúùǔǖǘǚǜü]/i.test(romanized)) return /[\u4E9F\u570B\u7D72\u7D79\u7DB5\u9ECF\u7121\u9EC4\u70CF\u7E3D\u7D93\u7DAD\u7D44\u7E2B\u7E8C\u7E54]/.test(native) ? "zh-Hant" : "zh-Hans";
    if (romanized && /[\u016b\u014d]/i.test(romanized)) return "ja";
    if (romanized && /(?:oe|eoi|eon|eot|eung)(?![a-z])|(?:^|\s)[a-z]*[ptkmng](?:\s|$|[^a-z])|(?:^|\s)aa[a-z]*(?:\s|$)/i.test(romanized)) return "yue";
    const isTraditional = /[\u4E9F\u570B\u7D72\u7D79\u7DB5\u9ECF\u7121\u9EC4\u70CF\u7E3D\u7D93\u7DAD\u7D44\u7E2B\u7E8C\u7E54]/.test(native);
    if (romanized && /(?:^|[^a-z])[zch]h|[\u00fc]|[\u0101\u00e1\u01ce\u00e0\u0113\u00e9\u011b\u00e8\u012b\u00ed\u01d0\u00ec\u014d\u00f3\u01d2\u00f2\u016b\u00fa\u01d4\u00f9]/i.test(romanized)) return isTraditional ? "zh-Hant" : "zh-Hans";
    return isTraditional ? "zh-Hant" : "zh-Hans";
  }
  if (/[\u0400-\u04FF]/.test(native)) return "ru";
  if (/[\u0900-\u097F]/.test(native)) return "hi";
  if (/[\u0980-\u09FF]/.test(native)) return "bn";
  if (/[\u0C00-\u0C7F]/.test(native)) return "te";
  if (/[\u0E00-\u0E7F]/.test(native)) return "th";
  if (/[\u0600-\u06FF]/.test(native)) return /[\u067E\u0686\u0698\u06AF\u06A9]/.test(native) ? "fa" : "ar";
  if (/[\u0F00-\u0FFF]/.test(native)) return "bo";
  if (/\u00f1/i.test(native)) return "es";
  if (/\u00e3o|\u00e2n|\u00ea/.test(native)) return "pt";
  if (/(?:Piaçava|Cortiça|Cânhamo)/i.test(native)) return "pt";
  if (/\u1ee5|\u1edd|\u01a1|\u01b0|\u1eaf|\u1ec1/.test(native)) return "vi";
  if (/^(?:Pamuk|Çivit|Zerdeçal|Kök Boya|Yün)$/i.test(native)) return "tr";
  if (/\u00f6|\u00fc|\u00e4/.test(native) && !/\u0151|\u0171/.test(native)) return "de";
  if (/\u00f8|\u00e5/.test(native)) return "sv";
  if (/\u0103|\u0219|\u021b/.test(native)) return "ro";
  if (/\u00ed|\u010d|\u0159|\u017e/.test(native)) return "cs";
  if (/\u0153|(?:^(?:Chanvre|Lin|Soie|Fibre|Bambou|Coton|Fromager|Laine|Liège|Mérinos|Asclépiade|Herbe|Éponge|Écorce|Pelure|Teinture|Vétiver|Alpaga|Cachemire|Mohair|Vicuña|Poil|Crin|Roseau|Sparte|Vacoa|Garance|Pastel|Guède|Gaude|Roucou|Campêche|Réséda))/i.test(native)) return "fr";
  if (/\u0130|\u015f|\u00e7/.test(native) && !/(?:Piaçava|Cortiça)/i.test(native)) return "tr";
  if (/^(?:Hennep|Vlas)$/i.test(native)) return "nl";
  if (/^(?:Pellava|Hamppu)$/i.test(native)) return "fi";
  if (/^(?:H\u00f8r|Ull)$/i.test(native)) return "da";
  if (/^(?:Lana|Seta|Ramia|Iuta|Lino|Raphia|Ceiba)$/i.test(native)) return "it";
  if (/^(?:Fibra|Yute|Corcho|Ortiga|Seda|Cabuya|Pita|Caña|Hierba|Estropajo|Cachemira|Cempasúchil|Índigo)/i.test(native)) return "es";
  if (/de\s+(?:Coco|Banana|Llama|Fique|Palmier|Agave|Maguey|Campeche|Camello)/i.test(native)) return "es";
  if (/(?:faser|wolle|stoff|baumwolle|seegras|halfagras|mariengras|palmfaser|schilf|modalfaser|bambus|kork|brennnessel|seidenpflanze|ananas-faser|agavenfaser|bananenfaser|yakwolle|bisonfaser|qiviut-faser|raffiabast|merinowolle|koridēru|ranbuie|schwarznuss|eisenoxid|studentenblume|mädchenauge|teefärbung|zwiebelschale|blutwurzel|pilzfärbung|sonnenfärbung)(?:\s|$|-)/i.test(native)) return "de";
  if (/^(?:Hanf|Leinen|Seide|Wolle|Kork|Bambus|Brennnessel|Kokosfaser|Manilahanf|Ananas-Faser|Lyocell-Faser|Modalfaser|Yakwolle|Bisonfaser|Seegras|Schraubenpalme|Palmfaser|Seerosenfaser|Agavenfaser|Bananenfaser|Neuseelandflachs|Feigenrindenstoff|Sonnenhanf|Tigerfaser|Vicuñafaser)/i.test(native)) return "de";
  if (/^(?:Randu)$/i.test(native)) return "id";
  if (/^(?:Wik'uña|Q'aytu|Wichuña|Chumpi|Away|Llamk'a|Rumi|Pacha|Q'ero|Qarwa|Paco|Utku|Utcu|Millma|Millwa|Kanab)/i.test(native)) return "qu";
  if (/^(?:China Grass|Manila Hemp|Buffalo Fiber|Angora Goat Fiber|Musk Ox Down|Llama Fiber|Sisal Blanco|Churro Wool|Lana Churro|Navajo Sheep Fiber|Himalayan Nettle|Himalayan Paper|Sedge Grass|New Zealand Flax|Bowstring Hemp|Snake Plant Fiber|Bhabar Grass|Bromeliad Fiber|Chambira Palm|Tucuma Fiber|Red Cotton Tree|Silk Cotton|Daphne Bark Fiber|Java Jute|Bissap Fiber|Karkadé Fiber|Bahia Piassava|Moriche Palm|Mauritia Fiber|Dyer's Rocket|Indigo \(Indigofera\)|Pineapple Leaf|Pineapple Fiber|Piña Fiber|Yak Fiber|Yak Wool|Banana Fiber|Banana Leaf Fiber|Camel Hair|Camel Wool)/i.test(native)) return "en";
  if (/^[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(native) || /^(?:Agave|Musa|Hibiscus|Stipa|Lepironia|Phragmites|Girardinia|Eulaliopsis|Vetiveria|Ananas|Phormium|Crotalaria|Asclepias|Maclura)/i.test(native)) return "la";
  return "en";
}

const REQUIRED = new Set(["zh", "hi", "fa", "es", "en", "ja", "ar", "ru", "qu", "fr"]);

function getLangsForFiber(names) {
  const langs = new Set();
  for (let i = 0; i < names.length; i++) {
    const raw = names[i];
    const { native, romanized } = parseWorldName(raw);
    const tag = detectLangTag(native, romanized);
    if (tag) {
      const normalized = tag.startsWith("zh") ? "zh" : tag;
      langs.add(normalized);
    }
  }
  return langs;
}

// Main check
const missingWorldNames = [];
const missingLangs = [];
const ok = [];

for (const id of fiberIds) {
  const names = worldNames[id];
  if (!names || names.length <= 1) {
    missingWorldNames.push(id);
    continue;
  }
  const langs = getLangsForFiber(names);
  const missing = [...REQUIRED].filter((r) => {
    if (r === "zh") return !langs.has("zh");
    return !langs.has(r);
  });
  if (missing.length > 0) {
    missingLangs.push({ id, missing, langs: [...langs] });
  } else {
    ok.push(id);
  }
}

console.log("=== World Names Check for Live Profiles ===\n");
console.log(`Total fiber profiles: ${fiberIds.length}`);
console.log(`With world names: ${fiberIds.length - missingWorldNames.length}`);
console.log(`Missing world names entirely: ${missingWorldNames.length}`);
console.log(`Missing required languages: ${missingLangs.length}`);
console.log(`OK (all required langs): ${ok.length}\n`);

if (missingWorldNames.length > 0) {
  console.log("Profiles with NO world names:");
  missingWorldNames.slice(0, 30).forEach((id) => console.log(`  - ${id}`));
  if (missingWorldNames.length > 30) console.log(`  ... and ${missingWorldNames.length - 30} more`);
  console.log("");
}

if (missingLangs.length > 0) {
  console.log("Profiles missing required languages (Chinese, Hindi/Sanskrit, Persian, Spanish, English, Japanese, Arabic, Russian, Quechua, French):");
  missingLangs.forEach(({ id, missing }) => {
    console.log(`  ${id}: missing ${missing.join(", ")}`);
  });
}

process.exit(missingLangs.length > 0 || missingWorldNames.length > 0 ? 1 : 0);
