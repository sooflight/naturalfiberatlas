/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ImageContextMenu from "./ImageContextMenu";

describe("ImageContextMenu", () => {
  it("shows Move to profile label and invokes copy/upscale/replace actions", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCopyImage = vi.fn();
    const onUpscale = vi.fn();
    const onReplaceUrl = vi.fn();

    render(
      <ImageContextMenu
        menu={{
          x: 20,
          y: 20,
          imageUrl: "https://example.com/fiber.jpg",
          sourceProfile: "fiber",
          sourceIndex: 1,
          sourceCount: 4,
        }}
        allProfiles={["fiber", "bast"]}
        onSend={vi.fn()}
        onClose={onClose}
        onCopyImage={onCopyImage}
        onUpscale={onUpscale}
        onReplaceUrl={onReplaceUrl}
      />,
    );

    expect(screen.getByRole("button", { name: "Move to profile…" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Copy image" }));
    await user.click(screen.getByRole("button", { name: "Upscale" }));
    await user.click(screen.getByRole("button", { name: "Replace URL" }));

    expect(onCopyImage).toHaveBeenCalledTimes(1);
    expect(onUpscale).toHaveBeenCalledTimes(1);
    expect(onReplaceUrl).toHaveBeenCalledTimes(1);
  });

  it("invokes copy to profile and keeps source image", async () => {
    const user = userEvent.setup();
    const onCopyToProfile = vi.fn();

    render(
      <ImageContextMenu
        menu={{
          x: 20,
          y: 20,
          imageUrl: "https://example.com/fiber.jpg",
          sourceProfile: "fiber",
          sourceIndex: 1,
          sourceCount: 4,
        }}
        allProfiles={["fiber", "bast", "leaf"]}
        onSend={vi.fn()}
        onClose={vi.fn()}
        onCopyToProfile={onCopyToProfile}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Copy to profile…" }));
    await user.type(screen.getByPlaceholderText("Search profiles…"), "bast");
    await user.click(screen.getByRole("button", { name: "bast" }));

    expect(onCopyToProfile).toHaveBeenCalledWith("bast");
  });

  it("deletes the singular selected image from context menu", async () => {
    const user = userEvent.setup();
    const onDeleteImage = vi.fn();
    const onClose = vi.fn();

    render(
      <ImageContextMenu
        menu={{
          x: 20,
          y: 20,
          imageUrl: "https://example.com/fiber.jpg",
          sourceProfile: "fiber",
          sourceIndex: 2,
          sourceCount: 4,
        }}
        allProfiles={["fiber", "bast"]}
        onSend={vi.fn()}
        onClose={onClose}
        onDeleteImage={onDeleteImage}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDeleteImage).toHaveBeenCalledWith("fiber", 2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
