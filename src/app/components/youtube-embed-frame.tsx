import { useEffect, useState } from "react";
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
  const embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1`;

  const [orientation, setOrientation] = useState<"horizontal" | "vertical" | "unknown">("unknown");

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
            <iframe
              className="absolute inset-0 h-full w-full"
              src={embedSrc}
              title={title}
              allow={IFRAME_ALLOW}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
