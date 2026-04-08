import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { detectYoutubeVideoOrientation } from "../utils/youtube-orientation";

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

export function YouTubeEmbedFrame({
  videoId,
  title,
  className = "",
  compact = false,
}: {
  videoId: string;
  title: string;
  className?: string;
  /** Tighter radius / shadow for admin preview tiles */
  compact?: boolean;
}) {
  const radius = compact ? "rounded-md" : "rounded-xl";
  const embedBase = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1&playsinline=1`;
  const embedSrcAutoplay = `${embedBase}&autoplay=1`;

  const [orientation, setOrientation] = useState<"horizontal" | "vertical" | "unknown">("unknown");
  /** YouTube’s default iframe play control can’t be styled (cross-origin); poster + small custom button until play. */
  const [iframeActive, setIframeActive] = useState(false);

  useEffect(() => {
    setIframeActive(false);
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;
    detectYoutubeVideoOrientation(videoId).then((o) => {
      if (!cancelled) setOrientation(o);
    });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const portrait = orientation === "vertical";
  const portraitMax = compact ? "max-w-[min(100%,38cqw)]" : "max-w-[min(100%,52cqw)]";
  const aspectBoxClass =
    orientation === "unknown"
      ? "w-full aspect-video"
      : portrait
        ? `mx-auto w-full ${portraitMax} aspect-[9/16]`
        : "w-full aspect-video";

  const posterUrl = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
  const playOuter = compact ? "h-8 w-8" : "h-10 w-10";
  const playIcon = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className={`relative w-full ${className}`}>
      {/* Gradient hairline + soft drop shadow — reads as a deliberate “feature” tile */}
      <div
        className={`${radius} bg-gradient-to-br from-red-500/[0.2] via-white/[0.07] to-white/[0.02] p-px shadow-[0_16px_48px_-20px_rgba(0,0,0,0.75)]`}
      >
        <div
          className={`relative overflow-hidden ${radius} bg-black/90 ring-1 ring-inset ring-white/[0.07]`}
        >
          <div className={`relative ${aspectBoxClass}`}>
            {iframeActive ? (
              <iframe
                className="absolute inset-0 h-full w-full"
                src={embedSrcAutoplay}
                title={title}
                allow={IFRAME_ALLOW}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <button
                type="button"
                className="absolute inset-0 block h-full w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5D9A6D]/60"
                onClick={() => setIframeActive(true)}
                aria-label={`Play video: ${title}`}
              >
                <img
                  src={posterUrl}
                  alt={`${title} thumbnail`}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <span
                  className="absolute inset-0 bg-black/30 transition-colors hover:bg-black/40"
                  aria-hidden
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={`flex items-center justify-center rounded-full bg-[#cc0000]/95 text-white shadow-md ring-1 ring-white/30 ${playOuter}`}
                  >
                    <Play className={`${playIcon} shrink-0 translate-x-[1px]`} fill="currentColor" strokeWidth={0} aria-hidden />
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
