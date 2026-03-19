// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileCard } from "./ImageDatabaseManager";

describe("ImageDatabaseManager parity surface", () => {
  it("exposes low-frequency actions via direct buttons and context menu", () => {
    const onPasteFromClipboard = vi.fn();

    render(
      <ProfileCard
        entryKey="ramie"
        value={["https://example.com/a.jpg"]}
        status="draft"
        zoom={180}
        isExpanded={true}
        isSelected={false}
        tags={[]}
        allTagPaths={[]}
        onToggleExpand={vi.fn()}
        onToggleSelect={vi.fn()}
        onLightbox={vi.fn()}
        onRemoveImage={vi.fn()}
        onReorderImages={vi.fn()}
        onOpenScout={vi.fn()}
        onOpenStoryboard={vi.fn()}
        onAddTag={vi.fn()}
        onRemoveTag={vi.fn()}
        onContextMenu={vi.fn()}
        onRename={vi.fn()}
        onPasteFromClipboard={onPasteFromClipboard}
        onToggleStatus={vi.fn()}
        onPromoteToHero={vi.fn()}
        onSendToFront={vi.fn()}
        onSendToBack={vi.fn()}
        markBroken={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Paste image from clipboard" }));

    expect(onPasteFromClipboard).toHaveBeenCalledTimes(1);
  });
});
