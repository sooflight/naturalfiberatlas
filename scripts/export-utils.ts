import fs from "fs";
import path from "path";

export type AtlasBundleFileMap = Record<string, string>;

const SENSITIVE_HINTS = ["key", "secret", "token", "password", "apiKey"];

export function isBackupDataFile(filename: string): boolean {
  return (
    filename.includes(".backup.") ||
    filename.endsWith(".backup.json") ||
    filename.endsWith(".backup.ts")
  );
}

export function listExportableDataFilenames(dataDir: string): string[] {
  return fs
    .readdirSync(dataDir)
    .filter((filename) => !isBackupDataFile(filename))
    .filter((filename) => filename.endsWith(".json") || filename.endsWith(".ts"))
    .sort();
}

export function readDataFiles(dataDir: string): AtlasBundleFileMap {
  const fileMap: AtlasBundleFileMap = {};
  for (const filename of listExportableDataFilenames(dataDir)) {
    const abs = path.join(dataDir, filename);
    fileMap[`data/${filename}`] = fs.readFileSync(abs, "utf8");
  }
  return fileMap;
}

export function rotateJsonBackups(filepath: string): void {
  const b2 = filepath.replace(/\.json$/, ".backup.2.json");
  const b1 = filepath.replace(/\.json$/, ".backup.1.json");
  const b0 = filepath.replace(/\.json$/, ".backup.json");
  try {
    if (fs.existsSync(b1)) fs.copyFileSync(b1, b2);
  } catch {
    // ignore best-effort backup rotation failures
  }
  try {
    if (fs.existsSync(b0)) fs.copyFileSync(b0, b1);
  } catch {
    // ignore best-effort backup rotation failures
  }
  if (fs.existsSync(filepath)) fs.copyFileSync(filepath, b0);
}

export function rotateTsBackups(filepath: string): void {
  const b2 = filepath.replace(/\.ts$/, ".backup.2.ts");
  const b1 = filepath.replace(/\.ts$/, ".backup.1.ts");
  const b0 = filepath.replace(/\.ts$/, ".backup.ts");
  try {
    if (fs.existsSync(b1)) fs.copyFileSync(b1, b2);
  } catch {
    // ignore best-effort backup rotation failures
  }
  try {
    if (fs.existsSync(b0)) fs.copyFileSync(b0, b1);
  } catch {
    // ignore best-effort backup rotation failures
  }
  if (fs.existsSync(filepath)) fs.copyFileSync(filepath, b0);
}

export function writeDataFileWithBackups(absoluteFilePath: string, content: string): void {
  if (absoluteFilePath.endsWith(".json")) rotateJsonBackups(absoluteFilePath);
  if (absoluteFilePath.endsWith(".ts")) rotateTsBackups(absoluteFilePath);
  fs.writeFileSync(absoluteFilePath, content, "utf8");
}

function shouldRedactField(fieldName: string): boolean {
  const lowered = fieldName.toLowerCase();
  return SENSITIVE_HINTS.some((hint) => lowered.includes(hint.toLowerCase()));
}

export function redactSensitiveValues(value: unknown, keyHint = ""): unknown {
  if (Array.isArray(value)) return value.map((entry) => redactSensitiveValues(entry, keyHint));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = shouldRedactField(key) ? "__REDACTED__" : redactSensitiveValues(nested, key);
    }
    return output;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const looksLikeSecret =
      value.startsWith("sk-") ||
      value.startsWith("hf_") ||
      value.startsWith("AIza") ||
      value.startsWith("BSA") ||
      value.startsWith("eQt");
    if (shouldRedactField(keyHint) || looksLikeSecret) {
      return "__REDACTED__";
    }
  }
  return value;
}

export function sanitizeAdminSettings(rawJson: string): string {
  try {
    const parsed = JSON.parse(rawJson);
    return JSON.stringify(redactSensitiveValues(parsed), null, 2);
  } catch {
    return rawJson;
  }
}

function collectCloudinaryPublicIdsFromValue(value: unknown, output: Set<string>): void {
  if (typeof value === "string") {
    if (value.includes("res.cloudinary.com") && value.includes("/upload/")) {
      const segments = value.split("/upload/");
      if (segments.length > 1) {
        const tail = segments[1];
        const noQuery = tail.split("?")[0];
        const parts = noQuery.split("/");
        const candidate = parts.slice(1).join("/").replace(/\.[a-zA-Z0-9]+$/, "");
        if (candidate) output.add(candidate);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectCloudinaryPublicIdsFromValue(entry, output);
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if ((key === "publicId" || key === "public_id") && typeof nested === "string" && nested.trim()) {
      output.add(nested.trim());
    }
    collectCloudinaryPublicIdsFromValue(nested, output);
  }
}

export function collectCloudinaryPublicIds(atlasDataJson: string): string[] {
  try {
    const parsed = JSON.parse(atlasDataJson);
    const output = new Set<string>();
    collectCloudinaryPublicIdsFromValue(parsed, output);
    return [...output].sort();
  } catch {
    return [];
  }
}

export function buildRestoreGuide(): string {
  return [
    "# Atlas Bundle Restore Guide",
    "",
    "1. Unpack this bundle.",
    "2. Review `data/admin-settings.json` and replace any `__REDACTED__` values.",
    "3. Copy the files from `data/` into the project's `src/app/data/admin/` directory.",
    "4. Restart the dev server after restoring.",
    "5. If media is required, sync IDs listed in `cloudinary-manifest.json` to Cloudinary.",
    "",
  ].join("\n");
}

export function renderMaterialPassportsSource(
  passports: Record<string, unknown>,
  aliases: Record<string, unknown>,
): string {
  return [
    'import type { MaterialPassportRegistry, TaxonomyAliasRegistry } from "../../types/material";',
    "",
    `export const MATERIAL_PASSPORTS: MaterialPassportRegistry = ${JSON.stringify(passports, null, 2)};`,
    "",
    `export const TAXONOMY_ALIASES: TaxonomyAliasRegistry = ${JSON.stringify(aliases, null, 2)};`,
    "",
  ].join("\n");
}
