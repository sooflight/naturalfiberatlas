#!/usr/bin/env node
/**
 * Download each gallery URL for a profile and upload bytes to Cloudinary (folder: atlas).
 * Replaces hotlinks and image/fetch wrappers with stable /image/upload/ URLs in:
 *   new-images.json
 *   src/app/data/admin/atlas-data.json  (images.<profileKey>)
 *   src/app/data/promoted-overrides.json (fibers.<profileKey>.galleryImages + image)
 *
 * Requires unsigned upload preset:
 *   VITE_CLOUDINARY_CLOUD_NAME (default: dawxvzlte)
 *   VITE_CLOUDINARY_UPLOAD_PRESET
 * Set in .env.local or the environment.
 *
 * Usage:
 *   node scripts/mirror-profile-gallery-to-cloudinary.mjs --profile fig-barkcloth
 *   node scripts/mirror-profile-gallery-to-cloudinary.mjs --profile fig-barkcloth --dry-run
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

/** If stored value is a Cloudinary fetch URL, return the decoded remote URL; else return trimmed string. */
function extractSourceUrl(stored) {
  const m = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/fetch\/(.+)$/i.exec(stored.trim());
  if (m) return decodeURIComponent(m[1]);
  return stored.trim();
}

function isCloudinaryUploadUrl(url) {
  return /https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//i.test(url);
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; FIBER-ATLAS-gallery-mirror/1.0)",
      Accept: "image/*,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, contentType };
}

function guessExt(contentType, url) {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const u = url.toLowerCase();
  if (u.includes(".webp")) return "webp";
  if (u.includes(".png")) return "png";
  return "jpg";
}

async function uploadBuffer(buf, fileName, contentType, cloudName, uploadPreset) {
  const form = new FormData();
  const FileCtor = globalThis.File;
  if (typeof FileCtor === "function") {
    form.append("file", new FileCtor([buf], fileName, { type: contentType }));
  } else {
    form.append("file", new Blob([buf], { type: contentType }), fileName);
  }
  form.append("upload_preset", uploadPreset);
  form.append("folder", "atlas");

  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = json.error?.message || JSON.stringify(json) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  if (!json.secure_url) throw new Error("Cloudinary response missing secure_url");
  return json.secure_url;
}

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const i = argv.indexOf("--profile");
  const profileKey = i >= 0 && argv[i + 1] ? argv[i + 1] : "fig-barkcloth";
  return { dryRun, profileKey };
}

async function main() {
  loadEnvLocal();
  const { dryRun, profileKey } = parseArgs(process.argv.slice(2));
  const cloudName = (process.env.VITE_CLOUDINARY_CLOUD_NAME || "dawxvzlte").trim();
  const uploadPreset = (process.env.VITE_CLOUDINARY_UPLOAD_PRESET || "").trim();

  if (!dryRun && !uploadPreset) {
    console.error(
      "Set VITE_CLOUDINARY_UPLOAD_PRESET (and optionally VITE_CLOUDINARY_CLOUD_NAME) in .env.local or the environment.",
    );
    process.exit(1);
  }

  const newImagesPath = path.join(root, "new-images.json");
  const newImages = JSON.parse(fs.readFileSync(newImagesPath, "utf8"));
  const prof = newImages.profiles?.find((p) => p.profileKey === profileKey);
  if (!prof?.imageLinks?.length) {
    console.error(`Profile "${profileKey}" not found or has no imageLinks in new-images.json`);
    process.exit(1);
  }

  const originals = [...prof.imageLinks];
  const sources = originals.map((u) => extractSourceUrl(u));
  const finalUrls = [];

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const originalStored = originals[i];

    if (isCloudinaryUploadUrl(src)) {
      finalUrls.push(src);
      console.log(`(${i + 1}/${sources.length}) skip (already upload URL)`);
      continue;
    }

    if (dryRun) {
      console.log(`(${i + 1}/${sources.length}) [dry-run] would download + upload: ${src.slice(0, 88)}…`);
      finalUrls.push(originalStored);
      continue;
    }

    console.log(`(${i + 1}/${sources.length}) download ${src.slice(0, 72)}…`);
    const { buf, contentType } = await downloadImage(src);
    const ext = guessExt(contentType, src);
    const fn = `${profileKey.replace(/[^a-z0-9-]/gi, "-")}-${String(i + 1).padStart(2, "0")}.${ext}`;
    const secure = await uploadBuffer(buf, fn, contentType, cloudName, uploadPreset);
    console.log(`     upload -> ${secure}`);
    finalUrls.push(secure);
    await new Promise((r) => setTimeout(r, 350));
  }

  if (dryRun) {
    console.log("\nDry run complete (no files modified).");
    process.exit(0);
  }

  prof.imageLinks = finalUrls;
  prof.imageCount = finalUrls.length;
  fs.writeFileSync(newImagesPath, JSON.stringify(newImages, null, 2) + "\n");

  const atlasPath = path.join(root, "src/app/data/admin/atlas-data.json");
  const atlas = JSON.parse(fs.readFileSync(atlasPath, "utf8"));
  if (!atlas.images) atlas.images = {};
  atlas.images[profileKey] = finalUrls;
  fs.writeFileSync(atlasPath, JSON.stringify(atlas, null, 2) + "\n");

  const promoPath = path.join(root, "src/app/data/promoted-overrides.json");
  const promo = JSON.parse(fs.readFileSync(promoPath, "utf8"));
  const fiber = promo.fibers?.[profileKey];
  if (fiber) {
    fiber.galleryImages = finalUrls.map((url) => ({ url }));
    fiber.image = finalUrls[0];
    fs.writeFileSync(promoPath, JSON.stringify(promo, null, 2) + "\n");
  } else {
    console.warn(`promoted-overrides.json: no fibers.${profileKey} — skipped promoted patch`);
  }

  console.log("\nUpdated new-images.json, admin/atlas-data.json, promoted-overrides.json (gallery + hero).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
