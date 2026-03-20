#!/usr/bin/env node
/**
 * Placeholder for deployment-specific DB/API backfill.
 *
 * This app does not ship a generic bulk-upload API. To re-seed production:
 * 1. Use your existing migration or admin pipeline that writes profiles/passports/KV.
 * 2. Or set NFA_RESEED_ENDPOINT to an internal URL that accepts your snapshot format,
 *    plus NFA_RESEED_TOKEN for Authorization, then implement the fetch below.
 *
 * Safety: never commit secrets. Run only from a trusted machine.
 */
const endpoint = process.env.NFA_RESEED_ENDPOINT || "";
const token = process.env.NFA_RESEED_TOKEN || "";

if (!endpoint) {
  console.log(
    "[reseed-remote-from-bundle] NFA_RESEED_ENDPOINT not set — no request sent.\n" +
      "  Document your seed command in deployment docs; see docs/runbooks/data-freshness.md",
  );
  process.exit(0);
}

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify({
    source: "natural-fiber-atlas-bundle",
    note: "Implement server handler to import from repo snapshot",
  }),
});

if (!res.ok) {
  console.error(`[reseed-remote-from-bundle] Failed: ${res.status}`);
  process.exit(1);
}
console.log("[reseed-remote-from-bundle] OK:", await res.text());
