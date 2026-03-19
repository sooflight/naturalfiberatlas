/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UpscaleReviewModal from "./UpscaleReviewModal";

describe("UpscaleReviewModal", () => {
  it("renders before/after images and handles confirm/reject", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onReject = vi.fn();

    render(
      <UpscaleReviewModal
        beforeUrl="https://example.com/before.jpg"
        afterUrl="https://example.com/after.jpg"
        onConfirm={onConfirm}
        onReject={onReject}
      />
    );

    expect(screen.getByText("Upscale Review")).toBeTruthy();
    expect(screen.getByAltText("Before upscale")).toBeTruthy();
    expect(screen.getByAltText("After upscale")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Confirm Replace" }));
    await user.click(screen.getByRole("button", { name: "Reject" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});
