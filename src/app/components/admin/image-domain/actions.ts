import type { FiberProfile } from "../../../data/fibers";
import type { DomainImage } from "./types";
import { toDomainImages, toGalleryImages } from "./adapters";

export interface ImageDomainDataSource {
  getFiberById: (id: string) => FiberProfile | undefined;
  updateFiber: (id: string, patch: Partial<FiberProfile>) => void;
}

function readFiberImages(
  source: ImageDomainDataSource,
  fiberId: string,
): DomainImage[] {
  const fiber = source.getFiberById(fiberId);
  if (!fiber) return [];
  return toDomainImages(fiber.galleryImages ?? []);
}

function writeFiberImages(
  source: ImageDomainDataSource,
  fiberId: string,
  images: DomainImage[],
): void {
  source.updateFiber(fiberId, {
    galleryImages: toGalleryImages(images),
    image: images[0]?.url ?? "",
  });
}

export function createImageDomainActions(source: ImageDomainDataSource) {
  return {
    addImage(fiberId: string, image: DomainImage) {
      const current = readFiberImages(source, fiberId);
      writeFiberImages(source, fiberId, [...current, image]);
    },

    removeImage(fiberId: string, imageId: string) {
      const current = readFiberImages(source, fiberId);
      writeFiberImages(
        source,
        fiberId,
        current.filter((image) => image.id !== imageId),
      );
    },

    reorderImage(fiberId: string, from: number, to: number) {
      const current = readFiberImages(source, fiberId);
      if (
        from < 0 ||
        to < 0 ||
        from >= current.length ||
        to >= current.length ||
        from === to
      ) {
        return;
      }
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      writeFiberImages(source, fiberId, next);
    },

    promoteHero(fiberId: string, index: number) {
      const current = readFiberImages(source, fiberId);
      if (index <= 0 || index >= current.length) return;
      const next = [...current];
      const [hero] = next.splice(index, 1);
      next.unshift(hero);
      writeFiberImages(source, fiberId, next);
    },
  };
}

