import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageQuickActions } from "./image-quick-actions";

describe("ImageQuickActions", () => {
  it("stages URLs and commits direct add", () => {
    const onAddImages = vi.fn();
    const onOpenAdvancedWorkspace = vi.fn();

    render(
      <ImageQuickActions
        fiberId="hemp"
        fiberName="Hemp"
        existingImageUrls={["https://example.com/existing.jpg"]}
        onAddImages={onAddImages}
        onOpenAdvancedWorkspace={onOpenAdvancedWorkspace}
      />,
    );

    fireEvent.click(screen.getByText("Open Scout"));
    const input = screen.getByPlaceholderText("Paste one URL per line...");
    fireEvent.change(input, {
      target: {
        value: "https://example.com/a.jpg\nhttps://example.com/b.jpg",
      },
    });

    fireEvent.click(screen.getByText("Add Direct"));
    expect(onAddImages).toHaveBeenCalledWith(
      ["https://example.com/a.jpg", "https://example.com/b.jpg"],
      "direct",
    );

    fireEvent.click(screen.getByText("Advanced Images"));
    expect(onOpenAdvancedWorkspace).toHaveBeenCalledTimes(1);
  });

  it("uploads dropped files to cloudinary before adding", async () => {
    const onAddImages = vi.fn();
    const onOpenAdvancedWorkspace = vi.fn();

    localStorage.setItem(
      "atlas:admin-settings",
      JSON.stringify({
        cloudinary: { cloudName: "demo-cloud", uploadPreset: "demo-preset" },
      }),
    );

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({ secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/v1/atlas/new.jpg" }),
      } as Response);

    render(
      <ImageQuickActions
        fiberId="hemp"
        fiberName="Hemp"
        existingImageUrls={["https://example.com/existing.jpg"]}
        onAddImages={onAddImages}
        onOpenAdvancedWorkspace={onOpenAdvancedWorkspace}
      />,
    );

    fireEvent.click(screen.getByText("Open Scout"));

    const file = new File(["binary"], "hemp.jpg", { type: "image/jpeg" });
    fireEvent.drop(screen.getByText("Drop images here"), {
      dataTransfer: { files: [file] },
    });

    const uploadButton = await screen.findByText("Upload & Add");
    fireEvent.click(uploadButton);

    expect(fetchSpy).toHaveBeenCalled();
    expect(onAddImages).toHaveBeenCalledWith(
      ["https://res.cloudinary.com/demo-cloud/image/upload/v1/atlas/new.jpg"],
      "upload",
    );

    fetchSpy.mockRestore();
    localStorage.removeItem("atlas:admin-settings");
  });

  it("uploads dropped image URLs to cloudinary before adding", async () => {
    const onAddImages = vi.fn();
    const onOpenAdvancedWorkspace = vi.fn();

    localStorage.setItem(
      "atlas:admin-settings",
      JSON.stringify({
        cloudinary: { cloudName: "demo-cloud", uploadPreset: "demo-preset" },
      }),
    );

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({ secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/v1/atlas/from-url.jpg" }),
      } as Response);

    render(
      <ImageQuickActions
        fiberId="hemp"
        fiberName="Hemp"
        existingImageUrls={[]}
        onAddImages={onAddImages}
        onOpenAdvancedWorkspace={onOpenAdvancedWorkspace}
      />,
    );

    fireEvent.click(screen.getByText("Open Scout"));

    fireEvent.drop(screen.getByText("Drop images here"), {
      dataTransfer: {
        files: [],
        getData: (type: string) =>
          type === "text/uri-list" ? "https://example.com/hemp-dropped.jpg" : "",
      },
    });

    const uploadButton = await screen.findByText("Upload & Add");
    fireEvent.click(uploadButton);

    expect(fetchSpy).toHaveBeenCalled();
    expect(onAddImages).toHaveBeenCalledWith(
      ["https://res.cloudinary.com/demo-cloud/image/upload/v1/atlas/from-url.jpg"],
      "upload",
    );

    fetchSpy.mockRestore();
    localStorage.removeItem("atlas:admin-settings");
  });

  it("accepts dropped image files with empty mime type", async () => {
    const onAddImages = vi.fn();
    const onOpenAdvancedWorkspace = vi.fn();

    localStorage.setItem(
      "atlas:admin-settings",
      JSON.stringify({
        cloudinary: { cloudName: "demo-cloud", uploadPreset: "demo-preset" },
      }),
    );

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({ secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/v1/atlas/no-mime.jpg" }),
      } as Response);

    render(
      <ImageQuickActions
        fiberId="hemp"
        fiberName="Hemp"
        existingImageUrls={[]}
        onAddImages={onAddImages}
        onOpenAdvancedWorkspace={onOpenAdvancedWorkspace}
      />,
    );

    fireEvent.click(screen.getByText("Open Scout"));
    const file = new File(["binary"], "hemp-no-mime.jpg", { type: "" });
    fireEvent.drop(screen.getByText("Drop images here"), {
      dataTransfer: { files: [file] },
    });

    const uploadButton = await screen.findByText("Upload & Add");
    fireEvent.click(uploadButton);

    expect(fetchSpy).toHaveBeenCalled();
    expect(onAddImages).toHaveBeenCalledWith(
      ["https://res.cloudinary.com/demo-cloud/image/upload/v1/atlas/no-mime.jpg"],
      "upload",
    );

    fetchSpy.mockRestore();
    localStorage.removeItem("atlas:admin-settings");
  });

  it("accepts finder-style dropped files without extension metadata", async () => {
    const onAddImages = vi.fn();
    const onOpenAdvancedWorkspace = vi.fn();

    localStorage.setItem(
      "atlas:admin-settings",
      JSON.stringify({
        cloudinary: { cloudName: "demo-cloud", uploadPreset: "demo-preset" },
      }),
    );

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({ secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/v1/atlas/finder-asset.jpg" }),
      } as Response);

    render(
      <ImageQuickActions
        fiberId="hemp"
        fiberName="Hemp"
        existingImageUrls={[]}
        onAddImages={onAddImages}
        onOpenAdvancedWorkspace={onOpenAdvancedWorkspace}
      />,
    );

    fireEvent.click(screen.getByText("Open Scout"));
    const file = new File(["binary"], "finder-asset", { type: "" });
    fireEvent.drop(screen.getByText("Drop images here"), {
      dataTransfer: { files: [file] },
    });

    const uploadButton = await screen.findByText("Upload & Add");
    fireEvent.click(uploadButton);

    expect(fetchSpy).toHaveBeenCalled();
    expect(onAddImages).toHaveBeenCalledWith(
      ["https://res.cloudinary.com/demo-cloud/image/upload/v1/atlas/finder-asset.jpg"],
      "upload",
    );

    fetchSpy.mockRestore();
    localStorage.removeItem("atlas:admin-settings");
  });
});
