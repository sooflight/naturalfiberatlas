import { useEffect, useState } from "react";

/**
 * True when the primary input supports real hover (e.g. mouse on desktop).
 * Touch-first devices report false so synthetic mouseenter from taps does not
 * drive hover-only behavior (e.g. pausing profile-card image crossfade).
 */
export function useHasRealHover(): boolean {
  const [has, setHas] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHas(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return has;
}
