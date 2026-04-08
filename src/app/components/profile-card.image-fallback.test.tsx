import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    transform: (src: string) => src.replace("https://origin.example/", "https://cdn.example/"),
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

describe("ProfileCard transformed image fallback", () => {
  it("retries once with the original source URL when transformed URL errors", async () => {
    render(
      <ProfileCard
        id="hemp"
        name="Hemp"
        image="https://origin.example/hemp.jpg"
        category="fiber"
        onClick={() => {}}
      />,
    );

    const [hero] = screen.getAllByAltText("Hemp");
    expect(hero.getAttribute("src")).toContain("https://cdn.example/hemp.jpg");

    fireEvent.error(hero);

    await waitFor(() => {
      expect(hero.getAttribute("src")).toContain("https://origin.example/hemp.jpg");
    });
  });
});
