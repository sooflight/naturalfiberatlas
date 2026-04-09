import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScreenPlate, type ScreenPlateEntry } from "./screen-plate";
import { fibers } from "../data/fibers";

vi.mock("motion/react", () => ({
  motion: {
    div: React.forwardRef(
      (
        {
          children,
          onAnimationComplete,
          ...props
        }: React.HTMLAttributes<HTMLDivElement> & { onAnimationComplete?: () => void },
        ref: React.ForwardedRef<HTMLDivElement>,
      ) => {
        React.useEffect(() => {
          onAnimationComplete?.();
        }, [onAnimationComplete]);
        return (
          <div ref={ref} {...props}>
            {children}
          </div>
        );
      },
    ),
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

  it("does not render bottom plate tab strip (keyboard and vertical snap-scroll navigate)", () => {
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

    expect(screen.queryByTestId("screen-plate-thumb-strip")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: new RegExp(`${baseFiber.name} detail viewer`, "i") })).toBeInTheDocument();
    expect(screen.getByTestId("screen-plate-snap-scroll")).toBeInTheDocument();
  });

  it("renders a persistent close control that calls onClose", () => {
    const onClose = vi.fn();
    const plates: ScreenPlateEntry[] = [{ plateType: "about", cellIndex: 0 }];

    render(
      <ScreenPlate
        fiber={baseFiber}
        initialPlateType="about"
        plates={plates}
        sourceRect={sourceRect}
        getCellRect={() => null}
        onClose={onClose}
        onSelectFiber={() => {}}
      />,
    );

    const closeBtn = screen.getByRole("button", { name: /close detail view/i });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the centered 3:4 card frame inside fullscreen overlay", () => {
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

    const morphCards = document.body.querySelectorAll(".screen-plate-morph");
    expect(morphCards.length).toBe(2);
    const first = morphCards[0] as HTMLDivElement;
    expect(first.className).toContain("rounded-[2rem]");
    const w = Number.parseFloat(first.style.width);
    const h = Number.parseFloat(first.style.height);
    expect(w).toBeGreaterThan(200);
    expect(h / w).toBeCloseTo(4 / 3, 5);
  });

  it("adds vertical padding on the snap scroller when multiple plates show neighbor peek", () => {
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

    const scroller = screen.getByTestId("screen-plate-snap-scroll");
    expect(scroller).toHaveStyle({
      paddingTop: expect.stringMatching(/^\d+px$/),
      paddingBottom: expect.stringMatching(/^\d+px$/),
    });
  });
});
