import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageWithFallback } from "./ImageWithFallback";

describe("ImageWithFallback", () => {
  it("switches to fallbackSrc before showing error placeholder", () => {
    render(
      <ImageWithFallback
        src="https://cdn.example/primary.jpg"
        fallbackSrc="https://origin.example/primary.jpg"
        alt="thumb"
      />,
    );

    const img = screen.getByAltText("thumb");
    expect(img.getAttribute("src")).toContain("https://cdn.example/primary.jpg");

    fireEvent.error(img);

    const retried = screen.getByAltText("thumb");
    expect(retried.getAttribute("src")).toContain("https://origin.example/primary.jpg");
    expect(screen.queryByAltText("Error loading image")).toBeNull();
  });
});
