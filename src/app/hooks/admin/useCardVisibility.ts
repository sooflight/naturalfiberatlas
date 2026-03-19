import { useEffect, useRef, useState } from "react";

const callbacks = new WeakMap<Element, (visible: boolean) => void>();

const sharedObserver =
  typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const cb = callbacks.get(e.target);
            if (cb) cb(e.isIntersecting);
          }
        },
        { threshold: 0.05, rootMargin: "0px 0px 0px -30px" }
      )
    : null;

export function useCardVisibility(ref: React.RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !sharedObserver) return;

    const handler = (isIntersecting: boolean) => {
      if (firedRef.current) return;
      if (isIntersecting) {
        firedRef.current = true;
        setVisible(true);
      }
    };

    callbacks.set(el, handler);
    sharedObserver.observe(el);

    return () => {
      sharedObserver.unobserve(el);
      callbacks.delete(el);
    };
  }, [ref]);

  return visible;
}
