import { describe, expect, it } from "vitest";
import { youtubeVideoIdFromUrl } from "./youtube-embed";

describe("youtubeVideoIdFromUrl", () => {
  it("parses youtu.be share links with query params", () => {
    expect(
      youtubeVideoIdFromUrl("https://youtu.be/CqprbDMardY?si=au1T0b95k0Y3pJpl"),
    ).toBe("CqprbDMardY");
  });

  it("parses watch URLs", () => {
    expect(youtubeVideoIdFromUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses embed and shorts paths", () => {
    expect(youtubeVideoIdFromUrl("https://youtube.com/embed/abcdefghijk")).toBe("abcdefghijk");
    expect(youtubeVideoIdFromUrl("https://youtube.com/shorts/abcdefghijk")).toBe("abcdefghijk");
  });

  it("returns null for empty or invalid input", () => {
    expect(youtubeVideoIdFromUrl("")).toBeNull();
    expect(youtubeVideoIdFromUrl("   ")).toBeNull();
    expect(youtubeVideoIdFromUrl("https://example.com/watch?v=abcdefghijk")).toBeNull();
  });
});
