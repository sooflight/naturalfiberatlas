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
  it("keeps hero sizing intrinsic via auto dimensions and max bounds (no flex blowout)", async () => {
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

    expect(heroImage).toHaveStyle({
      width: "auto",
      height: "auto",
      objectFit: "contain",
    });
    expect(heroImage.style.maxWidth).toMatch(/calc\(/);
  });

  it("does not set explicit pixel width from huge naturals (avoids flex min-width blowout)", async () => {
    render(
      <Lightbox
        images={[{ url: "https://example.com/wide.jpg", title: "Wide" }]}
        fiberName="Hemp"
        onClose={() => {}}
      />,
    );

    const heroImage = await screen.findByAltText("Wide");
    Object.defineProperty(heroImage, "naturalWidth", { value: 12000, configurable: true });
    Object.defineProperty(heroImage, "naturalHeight", { value: 8000, configurable: true });
    fireEvent.load(heroImage);

    expect(heroImage.style.width).toBe("auto");
    expect(heroImage.style.height).toBe("auto");
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

  it("sets width/height layout hints from gallery metadata before load", async () => {
    render(
      <Lightbox
        images={[
          {
            url: "https://example.com/sized.jpg",
            title: "Sized",
            width: 800,
            height: 1200,
          },
        ]}
        fiberName="Hemp"
        onClose={() => {}}
      />,
    );

    const heroImage = await screen.findByAltText("Sized");
    expect(heroImage).toHaveAttribute("width", "2");
    expect(heroImage).toHaveAttribute("height", "3");
    fireEvent.load(heroImage);
    expect(heroImage).not.toHaveAttribute("width");
    expect(heroImage).not.toHaveAttribute("height");
  });

});
