import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const TARGETS = ["src", "utils"];
const IGNORE_DIRS = new Set(["node_modules", "dist", ".git", ".cursor"]);
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".json",
  ".css",
  ".md",
]);

async function walk(pathname) {
  const entries = await readdir(pathname, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(pathname, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function isTextFile(pathname) {
  for (const ext of TEXT_EXTENSIONS) {
    if (pathname.endsWith(ext)) return true;
  }
  return false;
}

async function collectTargetFiles() {
  const files = [];
  for (const target of TARGETS) {
    const full = join(ROOT, target);
    try {
      const entries = await readdir(full, { withFileTypes: true });
      for (const entry of entries) {
        const p = join(full, entry.name);
        if (entry.isDirectory()) {
          if (IGNORE_DIRS.has(entry.name)) continue;
          files.push(...(await walk(p)));
        } else {
          files.push(p);
        }
      }
    } catch {
      // Target is likely a file path.
      files.push(full);
    }
  }
  return files.filter(isTextFile);
}

async function main() {
  const files = await collectTargetFiles();
  const offenders = [];

  for (const file of files) {
    let content = "";
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }
    if (/supabase/i.test(content)) {
      offenders.push(file.replace(`${ROOT}/`, ""));
    }
  }

  if (offenders.length > 0) {
    console.error("Found Supabase references in first-party source files:");
    for (const file of offenders) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }

  console.log("No Supabase references found in first-party source files.");
}

await main();
