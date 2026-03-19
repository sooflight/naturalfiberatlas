/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageLightbox } from "./image-database/ImageLightbox";

const SAMPLE_URLS = [
  "https://res.cloudinary.com/demo/image/upload/v1/sample-1.jpg",
  "https://res.cloudinary.com/demo/image/upload/v1/sample-2.jpg",
  "https://res.cloudinary.com/demo/image/upload/v1/sample-3.jpg",
];

function renderLightbox(overrides?: Partial<React.ComponentProps<typeof ImageLightbox>>) {
  const onClose = vi.fn();
  const onCropImage = vi.fn();
  render(
    <ImageLightbox
      urls={SAMPLE_URLS}
      startIndex={0}
      label="flax"
      entryKey="flax"
      onClose={onClose}
      onCropImage={onCropImage}
      {...overrides}
    />,
  );
  return { onClose, onCropImage };
}

afterEach(() => {
  cleanup();
});

describe("ImageLightbox editorial cinema UX", () => {
  it("renders cinematic chrome containers", () => {
    renderLightbox();

    expect(screen.getByTestId("lightbox-top-cluster")).toBeTruthy();
    expect(screen.getByTestId("lightbox-filmstrip-dock")).toBeTruthy();
    expect(screen.getByTestId("lightbox-root").className).not.toContain("backdrop-blur");
  });

  it("hides left and right navigation in crop mode", () => {
    renderLightbox();

    fireEvent.click(screen.getByRole("button", { name: /crop image/i }));

    expect(screen.queryByRole("button", { name: /previous image/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /next image/i })).toBeNull();
    expect(screen.getByRole("group", { name: /crop controls/i })).toBeTruthy();
  });

  it("supports keyboard navigation and close actions", () => {
    const { onClose } = renderLightbox();

    expect(screen.getByText("1/3")).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("2/3")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("caps imported lightbox image height at 88vh", () => {
    renderLightbox();
    const preview = screen.getByAltText("flax 1");
    expect(preview.className).toContain("max-h-[88vh]");
    expect(preview.className).toContain("max-w-[92vw]");
    expect(screen.getByTestId("lightbox-image-stage").className).toContain("-z-10");
  });
});
