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

  it("does not show archived top-level categories", () => {
    render(
      <TopNav activeNodeId={null} onNavigate={() => {}}>
        <div>content</div>
      </TopNav>,
    );

    expect(screen.queryByRole("button", { name: /Textile Textile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Dye Dye/i })).not.toBeInTheDocument();
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

  it("resets to All when the wordmark is clicked", () => {
    const onNavigate = vi.fn();
    const onSearchChange = vi.fn();

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

    expect(onNavigate).toHaveBeenCalledWith("home");
    expect(onSearchChange).toHaveBeenCalledWith("");
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
    const { container } = render(
      <TopNav activeNodeId={null} onNavigate={() => {}}>
        <div style={{ height: "200vh" }}>content</div>
      </TopNav>,
    );

    const contentRegion = container.querySelector(".min-h-0.flex-1");
    expect(contentRegion).not.toBeNull();
    expect(contentRegion).toHaveClass("overflow-y-auto");
  });

  it("uses dynamic viewport height for the main shell", () => {
    const { container } = render(
      <TopNav activeNodeId={null} onNavigate={() => {}}>
        <div>content</div>
      </TopNav>,
    );

    const shell = container.querySelector(".flex.w-full.flex-col.overflow-hidden");
    expect(shell).not.toBeNull();
    expect(shell).toHaveClass("min-h-dvh");
  });
});
