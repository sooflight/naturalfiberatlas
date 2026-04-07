import { createContext, useContext } from "react";

/**
 * The main atlas browse pane scrollport (TopNav’s `overflow-y-auto` region).
 * When set, viewport observers (e.g. grid virtualization) should use this as
 * `IntersectionObserver.root` instead of the implicit viewport.
 */
export const AtlasScrollPortContext = createContext<HTMLDivElement | undefined>(undefined);

export function useAtlasScrollPort(): HTMLDivElement | undefined {
  return useContext(AtlasScrollPortContext);
}
