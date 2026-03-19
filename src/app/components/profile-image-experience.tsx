import type { GalleryImageEntry } from "../data/atlas-data";

export interface ProfileImageExperienceProps {
  fiberName: string;
  images: GalleryImageEntry[];
  onFilmstripActivate?: (imageIndex: number, button: HTMLButtonElement) => void;
}

const CONTACT_SHEET_PADDING = "clamp(8px, 2.2cqi, 14px)";
const CONTACT_SHEET_GAP = "clamp(6px, 1.6cqi, 10px)";

function resolveSheetColumns(imageCount: number): number {
  if (imageCount <= 1) return 1;
  if (imageCount <= 4) return 2;
  if (imageCount <= 9) return 3;
  return 4;
}

export function ProfileImageExperience({ fiberName, images, onFilmstripActivate }: ProfileImageExperienceProps) {
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
          const thumbSrc = image.thumbUrl || image.url;
          const labelSuffix = image.title?.trim() ? `: ${image.title.trim()}` : "";
          return (
            <li key={`${thumbSrc}-${index}`} className="min-w-0">
              <button
                type="button"
                aria-label={`Show image ${index + 1} for ${fiberName}${labelSuffix}`}
                className="block w-full overflow-hidden rounded-md border border-white/[0.14] bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                onClick={(event) => {
                  onFilmstripActivate?.(index, event.currentTarget);
                }}
              >
                <img
                  src={thumbSrc}
                  alt={`${fiberName} contact image ${index + 1}${image.title ? `: ${image.title}` : ""}`}
                  className="aspect-square h-auto w-full object-cover"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
