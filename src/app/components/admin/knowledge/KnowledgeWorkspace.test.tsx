/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { KnowledgeWorkspace } from "./KnowledgeWorkspace";
import type { ContentItem } from "@/types/content";

const saveNodeBundleMock = vi.fn();
vi.mock("@/utils/nodeSaveTransaction", () => ({
  saveNodeBundle: (...args: unknown[]) => saveNodeBundleMock(...args),
}));

const makeItem = (id: string, summary = ""): ContentItem => ({
  id,
  heroImage: undefined,
  imageCount: 2,
  passport: {
    id,
    name: id,
    summary,
    performance: "",
    sourcing: "",
    applications: "",
    certifications: "",
    composition: [],
    processingMethods: [],
    lifecycle: { biodegradable: false, recyclable: false, repairable: false },
  } as unknown as ContentItem["passport"],
  completeness: 20,
  mappedFields: 1,
  totalFields: 5,
  status: "draft",
  lastModified: new Date("2026-01-01"),
});

describe("KnowledgeWorkspace", () => {
  afterEach(() => {
    cleanup();
    saveNodeBundleMock.mockReset();
  });

  it("renders profile rail and section editor", () => {
    render(
      <KnowledgeWorkspace
        items={[makeItem("alpha"), makeItem("beta")]}
        selectedId={"alpha"}
        searchQuery=""
        onSelect={() => {}}
      />
    );

    expect(screen.getByTestId("knowledge-view")).toBeTruthy();
    expect(screen.getAllByText("alpha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("beta").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Summary" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publish" }).getAttribute("disabled")).not.toBeNull();
  });

  it("enables publish once quality threshold is met", () => {
    render(
      <KnowledgeWorkspace
        items={[makeItem("alpha")]}
        selectedId={"alpha"}
        searchQuery=""
        onSelect={() => {}}
      />
    );

    const textarea = screen.getByPlaceholderText(/describe the material/i);
    fireEvent.change(textarea, { target: { value: "A".repeat(100) } });
    fireEvent.click(screen.getByRole("button", { name: "Performance" }));
    fireEvent.change(screen.getByRole("textbox", { name: /narrative text/i }), {
      target: { value: "B".repeat(80) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sourcing" }));
    fireEvent.change(screen.getByRole("textbox", { name: /narrative text/i }), {
      target: { value: "C".repeat(60) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Applications" }));
    fireEvent.change(screen.getByRole("textbox", { name: /narrative text/i }), {
      target: { value: "D".repeat(50) },
    });

    expect(screen.getByRole("button", { name: "Publish" }).getAttribute("disabled")).toBeNull();
  });

  it("persists draft via save transaction", async () => {
    saveNodeBundleMock.mockResolvedValue({ ok: true, status: 200 });
    render(
      <KnowledgeWorkspace
        items={[makeItem("alpha")]}
        selectedId={"alpha"}
        searchQuery=""
        onSelect={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    expect(saveNodeBundleMock).toHaveBeenCalledTimes(1);
    expect(saveNodeBundleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: "alpha",
      }),
    );
  });
});

