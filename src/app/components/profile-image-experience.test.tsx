import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileImageExperience } from "./profile-image-experience";
import type { GalleryImageEntry } from "../data/atlas-data";

const images: GalleryImageEntry[] = [
  {
    url: "https://example.com/image-1.jpg",
    thumbUrl: "https://example.com/thumb-1.jpg",
    title: "Process detail",
    width: 640,
    height: 480,
  },
  {
    url: "https://example.com/image-2.jpg",
    thumbUrl: "https://example.com/thumb-2.jpg",
    title: "Hero image",
    width: 2200,
    height: 1400,
    attribution: "Photo by Atlas",
  },
  {
    url: "https://example.com/image-3.jpg",
    thumbUrl: "https://example.com/thumb-3.jpg",
    title: "Context image",
    width: 1200,
    height: 800,
  },
];

describe("ProfileImageExperience", () => {
  it("renders a contact-sheet grid for all images", () => {
    render(<ProfileImageExperience fiberName="Hemp" images={images} />);

    expect(screen.getByRole("region", { name: /hemp contact sheet/i })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /hemp contact sheet grid/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /show image \d+ for hemp/i })).toHaveLength(
      images.length,
    );
  });

  it("renders null safely when there are no images", () => {
    const { container } = render(<ProfileImageExperience fiberName="Hemp" images={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("splits grid columns by image count", () => {
    const { rerender } = render(<ProfileImageExperience fiberName="Hemp" images={images.slice(0, 1)} />);
    expect(screen.getByRole("list", { name: /hemp contact sheet grid/i })).toHaveStyle({
      gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
    });

    rerender(<ProfileImageExperience fiberName="Hemp" images={images.slice(0, 4)} />);
    expect(screen.getByRole("list", { name: /hemp contact sheet grid/i })).toHaveStyle({
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    });

    const nine = Array.from({ length: 9 }, (_, index) => ({
      ...images[index % images.length]!,
      url: `https://example.com/nine-${index}.jpg`,
      thumbUrl: `https://example.com/nine-thumb-${index}.jpg`,
    }));
    rerender(<ProfileImageExperience fiberName="Hemp" images={nine} />);
    expect(screen.getByRole("list", { name: /hemp contact sheet grid/i })).toHaveStyle({
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    });

    const fourteen = Array.from({ length: 14 }, (_, index) => ({
      ...images[index % images.length]!,
      url: `https://example.com/fourteen-${index}.jpg`,
      thumbUrl: `https://example.com/fourteen-thumb-${index}.jpg`,
    }));
    rerender(<ProfileImageExperience fiberName="Hemp" images={fourteen} />);
    expect(screen.getByRole("list", { name: /hemp contact sheet grid/i })).toHaveStyle({
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    });
  });

  it("uses consistent edge padding and gap spacing", () => {
    render(<ProfileImageExperience fiberName="Hemp" images={images} />);

    expect(screen.getByRole("region", { name: /hemp contact sheet/i })).toHaveStyle({
      padding: "clamp(8px, 2.2cqi, 14px)",
    });
    expect(screen.getByRole("list", { name: /hemp contact sheet grid/i })).toHaveStyle({
      gap: "clamp(6px, 1.6cqi, 10px)",
    });
  });

  it("emits selected image index when a sheet image is activated", () => {
    const onFilmstripActivate = vi.fn();
    render(
      <ProfileImageExperience
        fiberName="Hemp"
        images={images}
        onFilmstripActivate={onFilmstripActivate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /show image 2 for hemp/i }));
    expect(onFilmstripActivate).toHaveBeenCalledTimes(1);
    expect(onFilmstripActivate).toHaveBeenCalledWith(1, expect.any(HTMLButtonElement));
  });
});
