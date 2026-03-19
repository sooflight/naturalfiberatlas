import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Lightbox } from "./lightbox";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: vi.fn(),
  }),
  useTransform: () => 1,
  animate: vi.fn(),
}));

vi.mock("../context/image-pipeline", () => ({
  useImagePipeline: () => ({
    transform: (url: string | undefined, variant?: string) =>
      url ? `${url}?variant=${variant ?? "default"}` : "",
  }),
}));

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}

describe("Lightbox image sizing", () => {
  it("does not upscale hero image beyond its natural dimensions", async () => {
    render(
      <Lightbox
        images={[
          {
            url: "https://example.com/hero.jpg",
            title: "Sample image",
          },
        ]}
        fiberName="Hemp"
        onClose={() => {}}
      />,
    );

    const heroImage = await screen.findByAltText("Sample image");
    Object.defineProperty(heroImage, "naturalWidth", { value: 300, configurable: true });
    Object.defineProperty(heroImage, "naturalHeight", { value: 600, configurable: true });

    fireEvent.load(heroImage);

    expect(heroImage).toHaveStyle({ width: "300px", height: "600px" });
  });

  it("renders hero image with contain fit to preserve source aspect ratio", async () => {
    render(
      <Lightbox
        images={[
          {
            url: "https://example.com/landscape.jpg",
            title: "Landscape image",
          },
        ]}
        fiberName="Flax"
        onClose={() => {}}
      />,
    );

    const heroImage = await screen.findByAltText("Landscape image");

    expect(heroImage).toHaveStyle({ objectFit: "contain" });
  });

});
