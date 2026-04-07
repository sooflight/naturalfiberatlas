import type { GalleryImageEntry } from "../data/atlas-data";
import { ProgressiveImage } from "./progressive-image";

export interface ProfileImageExperienceProps {
  fiberName: string;
  images: GalleryImageEntry[];
  onFilmstripActivate?: (imageIndex: number, button: HTMLButtonElement) => void;
  /** Added to each tile’s 1-based label (multi-card contact sheets use global gallery position). */
  imageNumberOffset?: number;
}

const CONTACT_SHEET_PADDING = "clamp(8px, 2.2cqi, 14px)";
const CONTACT_SHEET_GAP = "clamp(6px, 1.6cqi, 10px)";

function resolveSheetColumns(imageCount: number): number {
  if (imageCount <= 1) return 1;
  if (imageCount <= 4) return 2;
  return 3;
}

export function ProfileImageExperience({
  fiberName,
  images,
  onFilmstripActivate,
  imageNumberOffset = 0,
}: ProfileImageExperienceProps) {
  if (images.length === 0) return null;

  const columns = resolveSheetColumns(images.length);

  return (
    <section
      aria-label={`${fiberName} contact sheet`}
      className="h-full w-full overflow-hidden"
      style={{ padding: CONTACT_SHEET_PADDING }}
    >
      <ul
        aria-label={`${fiberName} contact sheet grid`}
        className="grid h-full w-full content-start overflow-y-auto"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: CONTACT_SHEET_GAP,
        }}
      >
        {images.map((image, index) => {
          /* Pipeline transforms canonical `url` (e.g. Cloudinary) to contactSheet preset.
             Bundled atlas data has no thumbUrl — raw <img> was loading full originals. */
          const pipelineSrc = (image.url?.trim() ? image.url : image.thumbUrl) ?? "";
          const displayIndex = imageNumberOffset + index + 1;
          const labelSuffix = image.title?.trim() ? `: ${image.title.trim()}` : "";
          const eagerThrough = columns * 2;
          return (
            <li key={`${pipelineSrc}-${index}`} className="min-w-0">
              <button
                type="button"
                aria-label={`Show image ${displayIndex} for ${fiberName}${labelSuffix}`}
                className="block w-full overflow-hidden rounded-md border border-white/[0.14] bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                onClick={(event) => {
                  onFilmstripActivate?.(index, event.currentTarget);
                }}
              >
                <ProgressiveImage
                  src={pipelineSrc}
                  preset="contactSheet"
                  alt={`${fiberName} contact image ${displayIndex}${image.title ? `: ${image.title}` : ""}`}
                  className="aspect-square w-full rounded-md"
                  loading={index < eagerThrough ? "eager" : "lazy"}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
