/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileCard } from "./ImageDatabaseManager";

function renderProfileCardForTags(options: { tags: string[]; allTagPaths: string[] }) {
  const onAddTag = vi.fn();
  const onRemoveTag = vi.fn();

  render(
    <ProfileCard
      entryKey="hemp"
      value={["https://example.com/hemp.jpg"]}
      status="draft"
      zoom={180}
      isExpanded={true}
      isSelected={false}
      tags={options.tags}
      allTagPaths={options.allTagPaths}
      onToggleExpand={vi.fn()}
      onToggleSelect={vi.fn()}
      onLightbox={vi.fn()}
      onRemoveImage={vi.fn()}
      onReorderImages={vi.fn()}
      onOpenScout={vi.fn()}
      onOpenStoryboard={vi.fn()}
      onAddTag={onAddTag}
      onRemoveTag={onRemoveTag}
      onContextMenu={vi.fn()}
      onRename={vi.fn()}
      onPasteFromClipboard={vi.fn()}
      onShowLinks={vi.fn()}
      onToggleStatus={vi.fn()}
      onPromoteToHero={vi.fn()}
      onSendToFront={vi.fn()}
      onSendToBack={vi.fn()}
      markBroken={vi.fn()}
    />,
  );

  return { onAddTag, onRemoveTag };
}

afterEach(() => {
  cleanup();
});

describe("ProfileCard multi-layer tag editor", () => {
  it("keeps fruit available in the fiber > plant tag layer", async () => {
    const module = await import("./ImageDatabaseManager");
    expect(module.SEEDED_TAG_PATHS).toContain("fiber/plant/fruit");
  });

  it("opens taxonomy navigator from a selected tag pill", () => {
    renderProfileCardForTags({
      tags: ["fiber/plant/bast"],
      allTagPaths: ["fiber/plant/bast", "fiber/plant/leaf", "textile/woven/plain", "other/misc"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit tags for fiber/plant/bast" }));

    expect(screen.getByRole("button", { name: "Select fiber" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select textile" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select other" })).toBeTruthy();
  });

  it("renders selected tags as chips and does not remove without explicit action", () => {
    const { onRemoveTag } = renderProfileCardForTags({
      tags: ["fiber/plant/bast"],
      allTagPaths: ["fiber/plant/bast", "fiber/plant/leaf", "textile/woven/plain", "other/misc"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit tags for fiber/plant/bast" }));

    expect(onRemoveTag).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Remove tag fiber/plant/bast")).toBeTruthy();
  });

  it("switches selected tag when choosing a new layered path", () => {
    const { onAddTag, onRemoveTag } = renderProfileCardForTags({
      tags: ["fiber/plant/bast"],
      allTagPaths: ["fiber/plant/bast", "fiber/plant/leaf", "textile/woven/plain", "other/misc"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit tags for fiber/plant/bast" }));
    fireEvent.click(screen.getByRole("button", { name: "Select fiber" }));
    expect(screen.getByText("Select Layer 2 node")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Select plant" }));
    fireEvent.click(screen.getByRole("button", { name: "Select leaf" }));
    fireEvent.click(screen.getByRole("button", { name: "Add selected tag path" }));

    expect(onAddTag).toHaveBeenCalledWith("fiber/plant/leaf");
    expect(onRemoveTag).not.toHaveBeenCalled();
  });

  it("shows an empty add pill when no tags exist and opens editor on click", () => {
    const { onAddTag, onRemoveTag } = renderProfileCardForTags({
      tags: [],
      allTagPaths: ["fiber/plant/bast", "fiber/plant/leaf", "textile/woven/plain", "other/misc"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Add first tag" }));
    fireEvent.click(screen.getByRole("button", { name: "Select textile" }));
    fireEvent.click(screen.getByRole("button", { name: "Select woven" }));
    fireEvent.click(screen.getByRole("button", { name: "Select plain" }));
    fireEvent.click(screen.getByRole("button", { name: "Add selected tag path" }));

    expect(onRemoveTag).not.toHaveBeenCalled();
    expect(onAddTag).toHaveBeenCalledWith("textile/woven/plain");
  });

  it("removes a selected tag from the chip control", () => {
    const { onAddTag, onRemoveTag } = renderProfileCardForTags({
      tags: ["fiber/plant/bast"],
      allTagPaths: ["fiber/plant/bast", "fiber/plant/leaf", "textile/woven/plain", "other/misc"],
    });

    fireEvent.click(screen.getByLabelText("Remove tag fiber/plant/bast"));

    expect(onRemoveTag).toHaveBeenCalledWith("fiber/plant/bast");
    expect(onAddTag).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "fiber" })).toBeNull();
  });
});
