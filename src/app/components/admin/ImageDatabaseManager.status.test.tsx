/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ProfileCard,
  copyContextMenuImageToClipboard,
  toggleProfilePublishStatus,
} from "./ImageDatabaseManager";

function renderProfileCardWithStatus(
  status: string | null | undefined,
  options?: { isExpanded?: boolean },
) {
  render(
    <ProfileCard
      entryKey="hemp"
      value={["https://example.com/hemp.jpg"]}
      status={status}
      zoom={180}
      isExpanded={options?.isExpanded ?? true}
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
      onPasteFromClipboard={vi.fn()}
      onShowLinks={vi.fn()}
      onToggleStatus={vi.fn()}
      onPromoteToHero={vi.fn()}
      onSendToFront={vi.fn()}
      onSendToBack={vi.fn()}
      markBroken={vi.fn()}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe("ProfileCard status controls", () => {
  it("renders header status switch for published profiles", () => {
    renderProfileCardWithStatus("published");

    const statusSwitch = screen.getByRole("switch");
    expect(statusSwitch.getAttribute("aria-checked")).toBe("true");
    expect(statusSwitch.getAttribute("aria-label")).toContain("Archived");
    expect(statusSwitch.getAttribute("data-status")).toBe("live");
    expect(statusSwitch.hasAttribute("disabled")).toBe(false);
    expect(statusSwitch.className).toContain("bg-emerald-500");
  });

  it("renders legacy draft status as archived appearance", () => {
    renderProfileCardWithStatus("draft");

    const statusSwitch = screen.getByRole("switch");
    expect(statusSwitch.getAttribute("aria-checked")).toBe("false");
    expect(statusSwitch.getAttribute("aria-label")).toContain("Live");
    expect(statusSwitch.getAttribute("data-status")).toBe("archived");
    expect(statusSwitch.hasAttribute("disabled")).toBe(false);
    expect(statusSwitch.className).toContain("bg-amber-300");
  });

  it("renders archived state with archived semantics", () => {
    renderProfileCardWithStatus("archived");

    const statusSwitch = screen.getByRole("switch");
    expect(statusSwitch.getAttribute("aria-checked")).toBe("false");
    expect(statusSwitch.getAttribute("aria-label")).toContain("Live");
    expect(statusSwitch.getAttribute("data-status")).toBe("archived");
    expect(statusSwitch.className).toContain("bg-amber-300");
  });

  it("keeps the status switch accessible in collapsed cards", () => {
    renderProfileCardWithStatus("draft", { isExpanded: false });

    const statusSwitch = screen.getByRole("switch");
    expect(statusSwitch.getAttribute("aria-checked")).toBe("false");
    expect(statusSwitch.getAttribute("data-status")).toBe("archived");
    expect(screen.queryByTestId("profile-status-footer")).toBeNull();
  });

  it("treats undefined and null statuses as archived semantics", () => {
    renderProfileCardWithStatus(undefined);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("switch").getAttribute("data-status")).toBe("archived");
    cleanup();

    renderProfileCardWithStatus(null);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("switch").getAttribute("data-status")).toBe("archived");
  });

  it("disables switch semantics while statusSaving is true", () => {
    render(
      <ProfileCard
        entryKey="hemp"
        value={["https://example.com/hemp.jpg"]}
        status="published"
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
        onPasteFromClipboard={vi.fn()}
        onShowLinks={vi.fn()}
        onToggleStatus={vi.fn()}
        statusSaving={true}
        onPromoteToHero={vi.fn()}
        onSendToFront={vi.fn()}
        onSendToBack={vi.fn()}
        markBroken={vi.fn()}
      />,
    );

    const statusSwitch = screen.getByRole("switch");
    expect(statusSwitch.hasAttribute("disabled")).toBe(true);
    expect(statusSwitch.getAttribute("aria-disabled")).toBe("true");
  });

  it("renders alert error with stable id and described-by linkage", () => {
    render(
      <ProfileCard
        entryKey="hemp"
        value={["https://example.com/hemp.jpg"]}
        status="published"
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
        onPasteFromClipboard={vi.fn()}
        onShowLinks={vi.fn()}
        onToggleStatus={vi.fn()}
        statusError="Save failed. Try again."
        onPromoteToHero={vi.fn()}
        onSendToFront={vi.fn()}
        onSendToBack={vi.fn()}
        markBroken={vi.fn()}
      />,
    );

    const statusSwitch = screen.getByRole("switch");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Save failed. Try again.");
    expect(alert.id).toBe("profile-status-error-hemp");
    expect(statusSwitch.getAttribute("aria-describedby")).toBe("profile-status-error-hemp");
  });

  it("toggles status when pressing Enter on switch", () => {
    const onToggleStatus = vi.fn();
    render(
      <ProfileCard
        entryKey="hemp"
        value={["https://example.com/hemp.jpg"]}
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
        onPasteFromClipboard={vi.fn()}
        onShowLinks={vi.fn()}
        onToggleStatus={onToggleStatus}
        onPromoteToHero={vi.fn()}
        onSendToFront={vi.fn()}
        onSendToBack={vi.fn()}
        markBroken={vi.fn()}
      />,
    );

    const statusSwitch = screen.getByRole("switch");
    fireEvent.keyDown(statusSwitch, { key: "Enter" });
    expect(onToggleStatus).toHaveBeenCalledTimes(1);
  });

  it("toggles status when pressing Space on switch", () => {
    const onToggleStatus = vi.fn();
    render(
      <ProfileCard
        entryKey="hemp"
        value={["https://example.com/hemp.jpg"]}
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
        onPasteFromClipboard={vi.fn()}
        onShowLinks={vi.fn()}
        onToggleStatus={onToggleStatus}
        onPromoteToHero={vi.fn()}
        onSendToFront={vi.fn()}
        onSendToBack={vi.fn()}
        markBroken={vi.fn()}
      />,
    );

    const statusSwitch = screen.getByRole("switch");
    fireEvent.keyDown(statusSwitch, { key: " " });
    expect(onToggleStatus).toHaveBeenCalledTimes(1);
  });
});

describe("toggleProfilePublishStatus", () => {
  function createRecordState<T extends string | boolean>(initial: Record<string, T> = {}) {
    let state = { ...initial };
    const setState = vi.fn((updater: React.SetStateAction<Record<string, T>>) => {
      state = typeof updater === "function" ? updater(state) : updater;
    });
    return {
      getState: () => state,
      setState,
    };
  }

  it("legacy draft toggles to published (live)", async () => {
    const statusState = createRecordState<string>();
    const savingState = createRecordState<boolean>();
    const errorState = createRecordState<string>();
    const mutateStatus = vi.fn().mockResolvedValue(undefined);
    const persistStatusOverride = vi.fn();

    await toggleProfilePublishStatus({
      profileKey: "hemp",
      profileId: "hemp",
      currentStatus: "draft",
      setStatusOverrides: statusState.setState,
      setSavingByKey: savingState.setState,
      setErrorByKey: errorState.setState,
      mutateStatus,
      persistStatusOverride,
    });

    expect(mutateStatus).toHaveBeenCalledWith({
      type: "passport",
      id: "hemp",
      status: "published",
    });
    expect(statusState.getState().hemp).toBe("published");
    expect(savingState.getState().hemp).toBe(false);
    expect(errorState.getState().hemp).toBeUndefined();
    expect(persistStatusOverride).toHaveBeenCalledWith("hemp", "published");
  });

  it("persists optimistic status immediately before API resolves", async () => {
    const statusState = createRecordState<string>();
    const savingState = createRecordState<boolean>();
    const errorState = createRecordState<string>();
    let resolveMutation!: () => void;
    const mutateStatus = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveMutation = resolve;
        }),
    );
    const persistStatusOverride = vi.fn();

    const pendingToggle = toggleProfilePublishStatus({
      profileKey: "hemp",
      profileId: "hemp",
      currentStatus: "published",
      setStatusOverrides: statusState.setState,
      setSavingByKey: savingState.setState,
      setErrorByKey: errorState.setState,
      mutateStatus,
      persistStatusOverride,
    });

    expect(persistStatusOverride).toHaveBeenCalledWith("hemp", "archived");
    expect(savingState.getState().hemp).toBe(true);

    resolveMutation();
    await pendingToggle;
    expect(savingState.getState().hemp).toBe(false);
  });

  it("cycles non-published (e.g. archived) -> Live", async () => {
    const statusState = createRecordState<string>();
    const savingState = createRecordState<boolean>();
    const errorState = createRecordState<string>();
    const mutateStatus = vi.fn().mockResolvedValue(undefined);
    const persistStatusOverride = vi.fn();

    await toggleProfilePublishStatus({
      profileKey: "hemp",
      profileId: "hemp",
      currentStatus: "archived",
      setStatusOverrides: statusState.setState,
      setSavingByKey: savingState.setState,
      setErrorByKey: errorState.setState,
      mutateStatus,
      persistStatusOverride,
    });

    expect(mutateStatus).toHaveBeenCalledWith({
      type: "passport",
      id: "hemp",
      status: "published",
    });
    expect(statusState.getState().hemp).toBe("published");
    expect(savingState.getState().hemp).toBe(false);
    expect(persistStatusOverride).toHaveBeenCalledWith("hemp", "published");
  });

  it("cycles Live -> Archived", async () => {
    const statusState = createRecordState<string>();
    const savingState = createRecordState<boolean>();
    const errorState = createRecordState<string>();
    const mutateStatus = vi.fn().mockResolvedValue(undefined);
    const persistStatusOverride = vi.fn();

    await toggleProfilePublishStatus({
      profileKey: "hemp",
      profileId: "hemp",
      currentStatus: "published",
      setStatusOverrides: statusState.setState,
      setSavingByKey: savingState.setState,
      setErrorByKey: errorState.setState,
      mutateStatus,
      persistStatusOverride,
    });

    expect(mutateStatus).toHaveBeenCalledWith({
      type: "passport",
      id: "hemp",
      status: "archived",
    });
    expect(statusState.getState().hemp).toBe("archived");
    expect(savingState.getState().hemp).toBe(false);
    expect(persistStatusOverride).toHaveBeenCalledWith("hemp", "archived");
  });

  it("keeps optimistic status as local fallback on failure", async () => {
    const statusState = createRecordState<string>({ hemp: "published" });
    const savingState = createRecordState<boolean>();
    const errorState = createRecordState<string>();
    const mutateStatus = vi.fn().mockRejectedValue(new Error("network down"));
    const persistStatusOverride = vi.fn();

    await toggleProfilePublishStatus({
      profileKey: "hemp",
      profileId: "hemp",
      currentStatus: "published",
      previousOverrideStatus: "published",
      setStatusOverrides: statusState.setState,
      setSavingByKey: savingState.setState,
      setErrorByKey: errorState.setState,
      mutateStatus,
      persistStatusOverride,
    });

    expect(statusState.getState().hemp).toBe("archived");
    expect(errorState.getState().hemp).toBeUndefined();
    expect(savingState.getState().hemp).toBe(false);
    expect(persistStatusOverride).toHaveBeenCalledWith("hemp", "archived");
  });

  it("does not let stale overlapping requests clobber latest state", async () => {
    const statusState = createRecordState<string>();
    const savingState = createRecordState<boolean>();
    const errorState = createRecordState<string>();

    let callCount = 0;
    let resolveFirst!: (response: Response) => void;
    let rejectSecond!: (err: Error) => void;
    const firstPromise = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise<Response>((_resolve, reject) => {
      rejectSecond = reject;
    });

    const mutateStatus = vi.fn(() => {
      callCount += 1;
      return callCount === 1 ? firstPromise : secondPromise;
    });

    let latestVersion = 0;
    const isLatestRequestVersion = (profileKey: string, requestVersion: number) =>
      profileKey === "hemp" && requestVersion === latestVersion;

    latestVersion = 1;
    const firstToggle = toggleProfilePublishStatus({
      profileKey: "hemp",
      profileId: "hemp",
      currentStatus: "draft",
      previousOverrideStatus: undefined,
      setStatusOverrides: statusState.setState,
      setSavingByKey: savingState.setState,
      setErrorByKey: errorState.setState,
      mutateStatus,
      requestVersion: 1,
      isLatestRequestVersion,
    });

    latestVersion = 2;
    const secondToggle = toggleProfilePublishStatus({
      profileKey: "hemp",
      profileId: "hemp",
      currentStatus: "published",
      previousOverrideStatus: "published",
      setStatusOverrides: statusState.setState,
      setSavingByKey: savingState.setState,
      setErrorByKey: errorState.setState,
      mutateStatus,
      requestVersion: 2,
      isLatestRequestVersion,
    });

    resolveFirst(new Response(null, { status: 200 }));
    await firstToggle;
    expect(savingState.getState().hemp).toBe(true);

    rejectSecond(new Error("latest failed"));
    await secondToggle;

    expect(statusState.getState().hemp).toBe("archived");
    expect(errorState.getState().hemp).toBeUndefined();
    expect(savingState.getState().hemp).toBe(false);
  });

  it("clears prior error before retrying a new toggle attempt", async () => {
    const statusState = createRecordState<string>({ hemp: "published" });
    const savingState = createRecordState<boolean>();
    const errorState = createRecordState<string>({ hemp: "Save failed. Try again." });
    const mutateStatus = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

    await toggleProfilePublishStatus({
      profileKey: "hemp",
      profileId: "hemp",
      currentStatus: "published",
      previousOverrideStatus: "published",
      setStatusOverrides: statusState.setState,
      setSavingByKey: savingState.setState,
      setErrorByKey: errorState.setState,
      mutateStatus,
    });

    expect(errorState.setState).toHaveBeenCalled();
    expect(errorState.getState().hemp).toBeUndefined();
    expect(statusState.getState().hemp).toBe("archived");
  });
});

describe("copyContextMenuImageToClipboard", () => {
  it("copies image bytes and closes menu on success", async () => {
    const flash = vi.fn();
    const setContextMenu = vi.fn();
    const copyImage = vi.fn().mockResolvedValue(undefined);

    await copyContextMenuImageToClipboard({
      imageUrl: "https://example.com/hemp.jpg",
      flash,
      setContextMenu,
      copyImage,
    });

    expect(copyImage).toHaveBeenCalledWith("https://example.com/hemp.jpg");
    expect(flash).toHaveBeenCalledWith("Copied image");
    expect(setContextMenu).toHaveBeenCalledWith(null);
  });

  it("shows a helpful error and closes menu on failure", async () => {
    const flash = vi.fn();
    const setContextMenu = vi.fn();
    const copyImage = vi.fn().mockRejectedValue(new Error("clipboard blocked"));

    await copyContextMenuImageToClipboard({
      imageUrl: "https://example.com/hemp.jpg",
      flash,
      setContextMenu,
      copyImage,
    });

    expect(copyImage).toHaveBeenCalledWith("https://example.com/hemp.jpg");
    expect(flash).toHaveBeenCalledWith("Copy image failed: clipboard blocked");
    expect(setContextMenu).toHaveBeenCalledWith(null);
  });
});
