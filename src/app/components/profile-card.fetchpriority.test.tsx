import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileCard } from "./profile-card";

vi.mock("../context/image-pipeline", () => ({
  useImagePipeline: () => ({
    transform: (src: string) => src,
  }),
}));

vi.mock("../hooks/use-crossfade", () => ({
  useCrossfade: () => ({
    activeIndex: 0,
    previousIndex: null,
  }),
}));

vi.mock("../hooks/use-image-brightness", () => ({
  useImageBrightness: () => 0.4,
}));

vi.mock("./glass-card", () => ({
  GlassCard: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

describe("ProfileCard image priority attributes", () => {
  it("renders lowercase fetchpriority on the first image layer", () => {
    render(
      <ProfileCard
        id="cotton"
        name="Cotton"
        image="/img/cotton.jpg"
        galleryImages={["/img/cotton-2.jpg"]}
        category="fiber"
        onClick={() => {}}
        priority
      />,
    );

    const images = screen.getAllByAltText("Cotton");
    expect(images.length).toBeGreaterThan(0);
    expect(images[0].getAttribute("fetchpriority")).toBe("high");
  });

  it("does not emit React unknown-prop warning for fetchPriority", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ProfileCard
        id="hemp"
        name="Hemp"
        image="/img/hemp.jpg"
        category="fiber"
        onClick={() => {}}
        priority
      />,
    );

    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("does not recognize the `fetchPriority` prop"),
    );
    errorSpy.mockRestore();
  });
});
