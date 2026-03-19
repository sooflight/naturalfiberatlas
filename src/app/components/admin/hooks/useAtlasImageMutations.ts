import { useCallback, useEffect, useRef, useState } from "react";
import type { AtlasMedia, ImageEntry } from "@/types/atlas-media";
import {
  atomicImageUpdate,
  normalizeImageEntries,
  readAtlasDiskData,
  type ImageMap,
} from "@/utils/atlasImageStore";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function hasRichMeta(m: AtlasMedia): boolean {
  return !!(m.rights || m.attribution || m.licenseUrl || m.sourceManifest || m.tileSource || m.provider);
}

export function useTimedSaveStatus() {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSaveStatus = useCallback((status: "saved" | "error") => {
    setSaveStatus(status);
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    saveStatusTimer.current = setTimeout(() => setSaveStatus("idle"), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    };
  }, []);

  return { saveStatus, setSaveStatus, showSaveStatus };
}

export interface UseAtlasImageMutationsOptions {
  /** Overlay to apply over disk when loading. Used when parent has fresher data (e.g. list reorder). */
  preferredOverlay?: ImageMap;
}

export function useAtlasImageMutations(
  initialImages: ImageMap,
  options?: UseAtlasImageMutationsOptions
) {
  const [images, setImages] = useState<ImageMap>(initialImages);
  const preferredOverlay = options?.preferredOverlay;

  useEffect(() => {
    let cancelled = false;
    readAtlasDiskData().then((disk) => {
      if (cancelled || !disk?.images) return;
      const merged = preferredOverlay
        ? { ...disk.images, ...preferredOverlay }
        : disk.images;
      setImages(merged);
    });
    return () => {
      cancelled = true;
    };
  }, []); // preferredOverlay captured in closure; run once on mount

  const addImages = useCallback(
    async (key: string, urls: string[], media?: AtlasMedia[]) => {
      if (!urls.length) return null;
      const entries: ImageEntry[] =
        media && media.length === urls.length
          ? media.map((m) => (hasRichMeta(m) ? m : m.url))
          : urls;
      const result = await atomicImageUpdate((diskImages) => {
        const existing = normalizeImageEntries(diskImages[key]);
        return { ...diskImages, [key]: [...existing, ...entries] };
      });
      if (result) setImages(result);
      return result;
    },
    []
  );

  const reorderImages = useCallback(async (key: string, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return null;
    const result = await atomicImageUpdate((diskImages) => {
      const arr = diskImages[key];
      if (!Array.isArray(arr)) return diskImages;
      const next = [...arr];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...diskImages, [key]: next };
    });
    if (result) setImages(result);
    return result;
  }, []);

  const removeImage = useCallback(async (key: string, idx: number) => {
    const result = await atomicImageUpdate((diskImages) => {
      const c = diskImages[key];
      if (!Array.isArray(c)) return diskImages;
      const u = [...c];
      u.splice(idx, 1);
      return { ...diskImages, [key]: u.length === 1 ? u[0] : u };
    });
    if (result) setImages(result);
    return result;
  }, []);

  return {
    images,
    setImages,
    addImages,
    reorderImages,
    removeImage,
  };
}
