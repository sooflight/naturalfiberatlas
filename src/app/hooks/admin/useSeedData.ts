import { useEffect, useRef } from "react";
import { ATLAS_IMAGES } from "../../data/admin/atlas-images";
import { apiKey, getApiUrl } from "@/utils/api/info";
import { toUrlArray } from "../../utils/admin/imageUrl";
import { trackEvent } from "../../utils/admin/telemetry";

// ──────────────────────────────────────────────────────────────
// Seeding logic
// ──────────────────────────────────────────────────────────────

let seeded = false;

// ── Module-level promise for image seed completion ──
// Other hooks (useProfileImages) can await this before fetching,
// ensuring KV has fresh multi-URL data before reads happen.
let imageSeedResolve: () => void;
export const imageSeedReady = new Promise<void>((resolve) => {
  imageSeedResolve = resolve;
});

// Check whether KV already has seed data (avoids overwriting
// richer data from earlier verbose seeds)
async function isAlreadySeeded(): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl("node/hemp"), {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
    if (res.ok) {
      const json = await res.json();
      // If we already have a node with a summary, consider it seeded
      return !!(json?.node?.summary);
    }
    return false;
  } catch (error) {
    trackEvent({
      level: "warn",
      event: "seed.check_failed",
      source: "useSeedData",
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// Seed ATLAS_IMAGES into KV as node-img:{id} → string[]
async function seedNodeImages(): Promise<{ success: boolean; count: number }> {
  const images: Record<string, string[]> = {};
  for (const [id, val] of Object.entries(ATLAS_IMAGES)) {
    images[id] = toUrlArray(val);
  }

  const res = await fetch(getApiUrl("seed-node-images"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ images }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Seed images failed ${res.status}: ${text}`);
  }
  return res.json();
}

export function useSeedData() {
  const attempted = useRef(false);

  useEffect(() => {
    if (seeded || attempted.current) return;
    attempted.current = true;

    (async () => {
      // ── Check if KV already has rich seed data ──
      const alreadySeeded = await isAlreadySeeded();
      if (alreadySeeded) {
        console.log("[seed] KV already has seed data — skipping node seeding, refreshing images only");
        seeded = true;
        // Still seed images (cheap, idempotent, keeps atlas-images.ts in sync)
        seedNodeImages()
          .then((r) => {
            console.log(`[seed] node-images: ${r.count} entries`);
            imageSeedResolve();
          })
          .catch((e) => {
            console.error("[seed] node-images failed:", e);
            imageSeedResolve(); // Resolve anyway so useProfileImages doesn't hang
          });
        return;
      }

      // ── First-time seed: write images only (node data batches removed) ──
      console.log("[seed] First-time seeding images...");

      seedNodeImages()
        .then((result) => {
          console.log(`[seed] node-images: ${result.count} image entries stored`);
          imageSeedResolve();
        })
        .catch((err) => {
          console.error("[seed] node-images failed:", err);
          imageSeedResolve(); // Resolve anyway so useProfileImages doesn't hang
        });

      seeded = true;
    })();
  }, []);
}