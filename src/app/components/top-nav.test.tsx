import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TopNav } from "./top-nav";

const deviceState = vi.hoisted(() => ({ isMobile: false }));

vi.mock("./ui/use-mobile", () => ({
  useIsMobile: () => deviceState.isMobile,
}));

describe("TopNav search sync", () => {
  beforeEach(() => {
    deviceState.isMobile = false;
  });

  it("exposes accessible search and clear controls", () => {
    render(
      <TopNav
        activeNodeId={null}
        onNavigate={() => {}}
        externalSearch="linen"
      >
        <div>content</div>
      </TopNav>,
    );

    expect(screen.getByLabelText("Search fibers")).toBeInTheDocument();
    expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
  });

  it("shows tap-first subcategory toggle on mobile after selecting a parent node", () => {
    deviceState.isMobile = true;
    const onNavigate = vi.fn();
    render(
      <TopNav activeNodeId={null} onNavigate={onNavigate}>
        <div>content</div>
      </TopNav>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Plant Plant/i }));
    expect(screen.getByRole("button", { name: /hide subcategories/i })).toBeInTheDocument();
    deviceState.isMobile = false;
  });

  it("renders former Layer 3 entries as Layer 2 after selecting a root node", async () => {
    render(
      <TopNav activeNodeId={null} onNavigate={() => {}}>
        <div>content</div>
      </TopNav>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Plant Plant/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Bast Fiber/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Seed Fiber/i })).toBeInTheDocument();
    });
  });

  it("shows Textile top-level when textiles are live; hides Dye while dyes stay archived", () => {
    render(
      <TopNav activeNodeId={null} onNavigate={() => {}}>
        <div>content</div>
      </TopNav>,
    );

    expect(screen.getByRole("button", { name: /Textile Textile/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Dye Dye/i })).not.toBeInTheDocument();
  });

  it("does not open the L2/L3 children strip when hovering the breadcrumb bar at a grid-scoped fiber family", async () => {
    const { container } = render(
      <TopNav activeNodeId="silk-fiber" onNavigate={() => {}}>
        <div>content</div>
      </TopNav>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^All$/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Plant Plant/i })).not.toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByTestId("atlas-nav-category-slot"));

    await waitFor(() => {
      const strip = container.querySelector("#atlas-children-strip") as HTMLElement | null;
      expect(strip).not.toBeNull();
      expect(strip?.style.height).toBe("0px");
    });
  });

  it("keeps the subcategory row visible while browsing", async () => {
    const { container } = render(
      <TopNav activeNodeId={null} onNavigate={() => {}}>
        <div>content</div>
      </TopNav>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Plant Plant/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Bast Fiber/i })).toBeInTheDocument();
    });

    const stripScrollRows = container.querySelectorAll(".overflow-x-auto");
    expect(stripScrollRows.length).toBeGreaterThan(0);
    fireEvent.mouseLeave(stripScrollRows[0] as Element);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Bast Fiber/i })).toBeInTheDocument();
    });
  });

  it("navigates home with a full page load when the wordmark is clicked", () => {
    const assignMock = vi.fn();
    vi.stubGlobal("location", { assign: assignMock } as unknown as Location);

    const onNavigate = vi.fn();
    const onSearchChange = vi.fn();

    try {
      render(
        <TopNav
          activeNodeId="fiber"
          onNavigate={onNavigate}
          externalSearch="cotton"
          onSearchChange={onSearchChange}
          visibleProfileCount={42}
        >
          <div>content</div>
        </TopNav>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Natural Fiber Atlas" }));

      expect(assignMock).toHaveBeenCalledWith("/");
      expect(onNavigate).not.toHaveBeenCalled();
      expect(onSearchChange).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("renders visible profile count next to the word mark", () => {
    render(
      <TopNav
        activeNodeId={null}
        onNavigate={() => {}}
        visibleProfileCount={42}
      >
        <div>content</div>
      </TopNav>,
    );

    expect(screen.getByText("42 Profiles")).toBeInTheDocument();
  });

  it("emits a single onSearchChange event for one input change", async () => {
    const onSearchChange = vi.fn();

    render(
      <TopNav
        activeNodeId={null}
        onNavigate={() => {}}
        externalSearch=""
        onSearchChange={onSearchChange}
      >
        <div>content</div>
      </TopNav>,
    );

    const input = screen.getByPlaceholderText("Search profiles...");
    fireEvent.change(input, { target: { value: "a" } });

    await waitFor(() => {
      expect(onSearchChange).toHaveBeenCalledTimes(1);
      expect(onSearchChange).toHaveBeenLastCalledWith("a");
    });
  });

  it("keeps the content region vertically scrollable", () => {
    render(
      <TopNav activeNodeId={null} onNavigate={() => {}}>
        <div style={{ height: "200vh" }}>content</div>
      </TopNav>,
    );

    const contentRegion = screen.getByTestId("atlas-main-scroll");
    expect(contentRegion).toHaveClass("overflow-y-auto");
  });

  it("uses dynamic viewport height for the main shell", () => {
    const { container } = render(
      <TopNav activeNodeId={null} onNavigate={() => {}}>
        <div>content</div>
      </TopNav>,
    );

    const shell = container.querySelector(".relative.h-full.min-h-atlas-vvh.min-h-0.w-full.overflow-hidden");
    expect(shell).not.toBeNull();
    expect(shell).toHaveClass("h-full");
    expect(shell).toHaveClass("min-h-atlas-vvh");
    expect(shell).toHaveClass("min-h-0");
  });

  it("pins shell height to atlas visual viewport fallback", () => {
    const { container } = render(
      <TopNav activeNodeId={null} onNavigate={() => {}}>
        <div>content</div>
      </TopNav>,
    );

    const shell = container.querySelector('[data-atlas-viewport-shell="topnav"]') as HTMLElement | null;
    expect(shell).not.toBeNull();
    expect(shell?.style.height).toBe("var(--atlas-vvh, 100svh)");
    expect(shell?.style.maxHeight).toBe("var(--atlas-vvh, 100svh)");
  });

  it("accounts for dynamic mobile browser chrome in bottom content padding", () => {
    const { container } = render(
      <TopNav activeNodeId={null} onNavigate={() => {}}>
        <div>content</div>
      </TopNav>,
    );

    const scrollFill = container.querySelector(
      ".flex.min-h-\\[min-content\\].flex-col",
    ) as HTMLElement | null;
    expect(scrollFill).not.toBeNull();
    const paddingBottom = scrollFill?.style.paddingBottom ?? "";
    expect(paddingBottom).toContain("safe-area-inset-bottom");
    expect(paddingBottom).toContain("100lvh");
    expect(paddingBottom).toContain("100svh");
  });
});
