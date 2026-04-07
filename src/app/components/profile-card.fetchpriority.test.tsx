import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ProfileCard } from "./profile-card";

beforeAll(() => {
  if (!HTMLImageElement.prototype.decode) {
    HTMLImageElement.prototype.decode = function (this: HTMLImageElement) {
      return Promise.resolve();
    };
  }
});

vi.mock("../context/image-pipeline", () => ({
  useImagePipeline: () => ({
    transform: (src: string) => src,
  }),
}));

vi.mock("../hooks/use-crossfade", () => ({
  useCrossfade: () => ({
    activeIndex: 0,
    previousIndex: 0,
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
    fireEvent.load(images[0]);
    expect(images[0].getAttribute("fetchpriority")).toBe("high");
  });

  it("does not set fetchpriority high when fetchPriorityHigh is false", () => {
    render(
      <ProfileCard
        id="flax"
        name="Flax"
        image="/img/flax.jpg"
        category="fiber"
        onClick={() => {}}
        priority
        fetchPriorityHigh={false}
      />,
    );

    const images = screen.getAllByAltText("Flax");
    fireEvent.load(images[0]);
    expect(images[0].getAttribute("fetchpriority")).toBeNull();
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
