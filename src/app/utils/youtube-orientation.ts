/**
 * Infer whether a YouTube video is portrait (e.g. Shorts) vs landscape.
 *
 * 1) oEmbed — default embed width/height (no API key).
 * 2) Thumbnail — load i.ytimg.com poster and compare naturalWidth/Height.
 */

export function isPortraitFromDimensions(
  width: number,
  height: number,
  /** Treat as vertical when height exceeds width by this factor */
  tolerance = 1.02,
): boolean {
  if (!(width > 0) || !(height > 0)) return false;
  return height > width * tolerance;
}

function loadFirstThumbnailDimensions(
  urls: string[],
  timeoutMs: number,
): Promise<{ width: number; height: number } | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs);

    const finish = (value: { width: number; height: number } | null) => {
      window.clearTimeout(timer);
      resolve(value);
    };

    let index = 0;
    const tryNext = () => {
      if (index >= urls.length) {
        finish(null);
        return;
      }
      const url = urls[index]!;
      index += 1;
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (w > 0 && h > 0) finish({ width: w, height: h });
        else tryNext();
      };
      img.onerror = () => tryNext();
      img.src = url;
    };

    tryNext();
  });
}

const THUMB_TIMEOUT_MS = 4500;

async function detectFromThumbnails(videoId: string): Promise<"vertical" | "horizontal"> {
  const urls = [
    `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`,
  ];
  const dim = await loadFirstThumbnailDimensions(urls, THUMB_TIMEOUT_MS);
  if (dim && isPortraitFromDimensions(dim.width, dim.height)) return "vertical";
  return "horizontal";
}

/**
 * Best-effort orientation for layout (aspect ratio). Defaults to landscape on any failure.
 */
export async function detectYoutubeVideoOrientation(videoId: string): Promise<"vertical" | "horizontal"> {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
    );
    if (res.ok) {
      const data = (await res.json()) as { width?: number; height?: number };
      const w = Number(data.width);
      const h = Number(data.height);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        return isPortraitFromDimensions(w, h) ? "vertical" : "horizontal";
      }
    }
  } catch {
    /* CORS, network, JSON parse */
  }

  return detectFromThumbnails(videoId);
}
