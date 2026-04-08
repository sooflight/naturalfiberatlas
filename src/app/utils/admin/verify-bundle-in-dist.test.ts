/**
 * Post-build guard: Tier A catalog from Git must appear inside Vite output chunks.
 * Run after `vite build` (e.g. `npm run build` then `vitest run` on this file).
 * If `dist/assets` is missing, tests are skipped so `npm test` works without a build.
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { fibers } from "../../data/fibers";
import { NEW_IMAGE_PROFILE_ALIASES } from "../../data/navigation-id-registry";

const root = process.cwd();
const distAssets = join(root, "dist/assets");

function readChunkCombined(prefix: string): string {
  if (!existsSync(distAssets)) return "";
  const files = readdirSync(distAssets).filter(
    (f) => f.startsWith(prefix) && f.endsWith(".js"),
  );
  return files.map((f) => readFileSync(join(distAssets, f), "utf8")).join("\n");
}

function readAllJsChunksCombined(): string {
  if (!existsSync(distAssets)) return "";
  const files = readdirSync(distAssets).filter((f) => f.endsWith(".js"));
  return files.map((f) => readFileSync(join(distAssets, f), "utf8")).join("\n");
}

const distReady = existsSync(distAssets);

function readNewImagesProfileMap(): Map<string, string[]> {
  const path = join(root, "new-images.json");
  if (!existsSync(path)) return new Map();
  const payload = JSON.parse(readFileSync(path, "utf8")) as {
    profiles?: Array<{ profileKey?: string; imageLinks?: string[] }>;
  };
  const map = new Map<string, string[]>();
  for (const profile of payload.profiles ?? []) {
    if (!profile.profileKey || !Array.isArray(profile.imageLinks)) continue;
    const resolvedId = NEW_IMAGE_PROFILE_ALIASES[profile.profileKey] ?? profile.profileKey;
    const existing = map.get(resolvedId) ?? [];
    const merged = [...existing, ...profile.imageLinks.filter(Boolean)];
    map.set(resolvedId, [...new Set(merged)]);
  }
  return map;
}

describe.skipIf(!distReady)("production bundle includes Git catalog (dist)", () => {
  it("atlas-content chunk contains every fiber id from fibers.ts", () => {
    const combined = readChunkCombined("atlas-content-");
    expect(combined.length).toBeGreaterThan(1000);
    for (const f of fibers) {
      expect(combined, `missing fiber id ${f.id}`).toContain(f.id);
    }
  });

  it("production JS chunks embed gallery URLs from new-images.json", () => {
    const path = join(root, "new-images.json");
    expect(existsSync(path)).toBe(true);
    const payload = JSON.parse(readFileSync(path, "utf8")) as {
      profiles?: Array<{ imageLinks?: string[] }>;
    };
    const firstUrl = payload.profiles?.[0]?.imageLinks?.[0];
    expect(firstUrl, "new-images.json should list at least one image URL").toBeTruthy();
    const combined = readAllJsChunksCombined();
    expect(combined.length).toBeGreaterThan(100);
    expect(combined, "production bundle should include URLs from new-images.json").toContain(
      firstUrl as string,
    );
  });

  it("every linked new-images profile has a non-empty profile key", () => {
    const byFiberId = readNewImagesProfileMap();
    expect([...byFiberId.keys()].some((key) => key.trim().length === 0)).toBe(false);
  });

  it("every linked new-images URL is absolute http(s)", () => {
    const byFiberId = readNewImagesProfileMap();
    const invalid: string[] = [];
    for (const [key, links] of byFiberId.entries()) {
      for (const link of links) {
        const normalized = typeof link === "string" ? link.trim() : "";
        if (!normalized || !/^https?:\/\//.test(normalized)) {
          invalid.push(`${key}: ${String(link)}`);
        }
      }
    }
    expect(invalid, `new-images.json has invalid URLs: ${invalid.join(", ")}`).toEqual([]);
  });

  it("includes robots.txt and sitemap.xml beside the production index", () => {
    const robotsPath = join(root, "dist/robots.txt");
    const sitemapPath = join(root, "dist/sitemap.xml");
    expect(existsSync(robotsPath), "run npm run build before dist assertions").toBe(true);
    expect(existsSync(sitemapPath)).toBe(true);
    expect(readFileSync(robotsPath, "utf8")).toContain("Sitemap:");
    expect(readFileSync(sitemapPath, "utf8")).toContain("/fiber/");
  });
});
