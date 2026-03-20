#!/usr/bin/env node
/**
 * Deletes Upstash keys used for material caching (prefix atlas:material:*).
 * Load credentials via process.env or: node --env-file=.env.local scripts/invalidate-upstash-cache.mjs
 */
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.VITE_UPSTASH_REDIS_REST_URL || "";
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.VITE_UPSTASH_REDIS_REST_TOKEN || "";

if (!url || !token) {
  console.error(
    "[invalidate-upstash-cache] Missing URL/token. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or VITE_* equivalents).",
  );
  process.exit(2);
}

const redis = new Redis({ url, token });
const pattern = "atlas:material:*";
const keys = await redis.keys(pattern);
if (keys.length === 0) {
  console.log(`[invalidate-upstash-cache] No keys matched ${pattern}`);
  process.exit(0);
}

await redis.del(...keys);
console.log(`[invalidate-upstash-cache] Deleted ${keys.length} key(s) matching ${pattern}`);
