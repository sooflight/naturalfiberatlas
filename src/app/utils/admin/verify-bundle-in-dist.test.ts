/**
 * Post-build guard: Tier A catalog from Git must appear inside Vite output chunks.
 * Run after `vite build` (e.g. `npm run build` then `vitest run` on this file).
 * If `dist/assets` is missing, tests are skipped so `npm test` works without a build.
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { fibers } from "../../data/fibers";

const root = process.cwd();
const distAssets = join(root, "dist/assets");

function readChunkCombined(prefix: string): string {
  if (!existsSync(distAssets)) return "";
  const files = readdirSync(distAssets).filter(
    (f) => f.startsWith(prefix) && f.endsWith(".js"),
  );
  return files.map((f) => readFileSync(join(distAssets, f), "utf8")).join("\n");
}

const distReady = existsSync(distAssets);
const NEW_IMAGE_ALIASES: Record<string, string> = {
  "coir-coconut": "coir",
  "lyocell-tencel": "lyocell",
  "pineapple-pina": "pineapple",
  cotton: "organic-cotton",
};

function readNewImagesProfileMap(): Map<string, string[]> {
  const path = join(root, "new-images.json");
  if (!existsSync(path)) return new Map();
  const payload = JSON.parse(readFileSync(path, "utf8")) as {
    profiles?: Array<{ profileKey?: string; imageLinks?: string[] }>;
  };
  const map = new Map<string, string[]>();
  for (const profile of payload.profiles ?? []) {
    if (!profile.profileKey || !Array.isArray(profile.imageLinks)) continue;
    const resolvedId = NEW_IMAGE_ALIASES[profile.profileKey] ?? profile.profileKey;
    map.set(resolvedId, profile.imageLinks.filter(Boolean));
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

  it("new-images chunk embeds gallery URLs from new-images.json", () => {
    const path = join(root, "new-images.json");
    expect(existsSync(path)).toBe(true);
    const payload = JSON.parse(readFileSync(path, "utf8")) as {
      profiles?: Array<{ imageLinks?: string[] }>;
    };
    const firstUrl = payload.profiles?.[0]?.imageLinks?.[0];
    expect(firstUrl, "new-images.json should list at least one image URL").toBeTruthy();
    const combined = readChunkCombined("new-images-");
    expect(combined.length).toBeGreaterThan(100);
    expect(combined, "new-images bundle should include URLs from new-images.json").toContain(
      firstUrl as string,
    );
  });

  it("fiber hero URL is present in promoted new-images profile links when a profile exists", () => {
    const byFiberId = readNewImagesProfileMap();
    const stale: string[] = [];
    for (const fiber of fibers) {
      if (fiber.status === "archived") continue;
      const links = byFiberId.get(fiber.id);
      if (!links || links.length === 0) continue;
      if (!links.includes(fiber.image)) stale.push(fiber.id);
    }
    expect(
      stale,
      `new-images.json has profile links that do not include fibers.ts hero URL for: ${stale.join(", ")}`,
    ).toEqual([]);
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
