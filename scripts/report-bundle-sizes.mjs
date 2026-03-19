import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const assetsDir = join(process.cwd(), "dist", "assets");

function toKb(bytes) {
  return Number((bytes / 1024).toFixed(1));
}

function formatRow(name, bytes) {
  const kb = toKb(bytes);
  return `${name.padEnd(42)} ${String(kb).padStart(8)} KB`;
}

const entries = readdirSync(assetsDir)
  .filter((file) => file.endsWith(".js"))
  .map((file) => {
    const abs = join(assetsDir, file);
    return { file, bytes: statSync(abs).size };
  })
  .sort((a, b) => b.bytes - a.bytes);

const initialCandidates = entries.filter((entry) =>
  /^(index|framework|vendor|atlas-content|atlas-overlays|atlas-home|ui-mui|form-dnd)-/.test(
    entry.file,
  ),
);
const initialBytes = initialCandidates.reduce((sum, entry) => sum + entry.bytes, 0);

console.log("");
console.log("=== JS Chunk Size Report ===");
for (const entry of entries.slice(0, 12)) {
  console.log(formatRow(entry.file, entry.bytes));
}
console.log("");
console.log(
  `Estimated initial JS budget candidate: ${toKb(initialBytes)} KB across ${initialCandidates.length} chunks`,
);
console.log(
  "Tip: compare this value before/after perf changes and keep under the README threshold.",
);
