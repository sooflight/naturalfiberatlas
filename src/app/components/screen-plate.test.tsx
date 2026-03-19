import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScreenPlate, type ScreenPlateEntry } from "./screen-plate";
import { fibers } from "../data/fibers";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, onAnimationComplete, ...props }: React.HTMLAttributes<HTMLDivElement> & { onAnimationComplete?: () => void }) => {
      React.useEffect(() => {
        onAnimationComplete?.();
      }, [onAnimationComplete]);
      return <div {...props}>{children}</div>;
    },
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
}));

vi.mock("./glass-card", () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("./detail-plates", () => ({
  RegionsPlate: () => <div>Regions</div>,
  WorldNamesPlate: () => <div>World Names</div>,
  SeeAlsoPlate: () => <div>See Also</div>,
  AnatomyPlate: () => <div>Anatomy</div>,
  CarePlate: () => <div>Care</div>,
  ContactSheetPlate: () => <div>Contact Sheet</div>,
}));

vi.mock("../hooks/use-swipe", () => ({
  useSwipe: () => ({ handlers: {}, dragOffset: 0 }),
}));

vi.mock("../context/image-pipeline", () => ({
  useImagePipeline: () => ({
    transform: (url: string | undefined) => url ?? "",
  }),
}));

vi.mock("../hooks/use-image-brightness", () => ({
  useImageAnalysis: () => null,
}));

describe("ScreenPlate", () => {
  const baseFiber = fibers[0];
  const sourceRect = new DOMRect(20, 20, 200, 260);

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders thumbnail index strip for multi-slide navigation", () => {
    const plates: ScreenPlateEntry[] = [
      { plateType: "about", cellIndex: 0 },
      { plateType: "trade", cellIndex: 1 },
    ];

    render(
      <ScreenPlate
        fiber={baseFiber}
        initialPlateType="about"
        plates={plates}
        sourceRect={sourceRect}
        getCellRect={() => null}
        onClose={() => {}}
        onSelectFiber={() => {}}
      />,
    );

    const thumbStrip = screen.getByTestId("screen-plate-thumb-strip");
    expect(thumbStrip).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open About plate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Source & Trade plate" })).toBeInTheDocument();
  });

  it("keeps the centered 3:4 card frame inside fullscreen overlay", () => {
    const plates: ScreenPlateEntry[] = [
      { plateType: "about", cellIndex: 0 },
      { plateType: "trade", cellIndex: 1 },
    ];

    const { container } = render(
      <ScreenPlate
        fiber={baseFiber}
        initialPlateType="about"
        plates={plates}
        sourceRect={sourceRect}
        getCellRect={() => null}
        onClose={() => {}}
        onSelectFiber={() => {}}
      />,
    );

    const morphCard = container.querySelector(".screen-plate-morph") as HTMLDivElement | null;
    expect(morphCard).toBeTruthy();
    expect(morphCard?.className).toContain("rounded-3xl");
    expect(morphCard?.style.width).toBe("516px");
    expect(morphCard?.style.height).toBe("688px");
  });
});
