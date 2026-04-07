import { describe, expect, it } from "vitest";
import {
  getCommittedYoutubeEmbedUrls,
  getValidYoutubeEmbedEntries,
  getYoutubeEmbedUrlRowsForEdit,
  hasAnyValidYoutubeEmbed,
} from "./youtube-embed-urls";

describe("youtube-embed-urls", () => {
  it("merges legacy youtubeEmbedUrl when youtubeEmbedUrls is undefined", () => {
    expect(
      getCommittedYoutubeEmbedUrls({
        youtubeEmbedUrl: "https://youtu.be/abcdefghijk",
      }),
    ).toEqual(["https://youtu.be/abcdefghijk"]);
  });

  it("prefers youtubeEmbedUrls over legacy when array is set", () => {
    expect(
      getCommittedYoutubeEmbedUrls({
        youtubeEmbedUrl: "https://youtu.be/legacyyyyyy",
        youtubeEmbedUrls: ["https://youtu.be/abcdefghijk"],
      }),
    ).toEqual(["https://youtu.be/abcdefghijk"]);
  });

  it("dedupes and trims", () => {
    expect(
      getCommittedYoutubeEmbedUrls({
        youtubeEmbedUrls: ["  https://youtu.be/abc  ", "https://youtu.be/abc", "https://youtu.be/def"],
      }),
    ).toEqual(["https://youtu.be/abc", "https://youtu.be/def"]);
  });

  it("getYoutubeEmbedUrlRowsForEdit preserves empty slots", () => {
    expect(
      getYoutubeEmbedUrlRowsForEdit({
        youtubeEmbedUrls: ["https://youtu.be/abc", ""],
      }),
    ).toEqual(["https://youtu.be/abc", ""]);
  });

  it("hasAnyValidYoutubeEmbed is false for invalid strings", () => {
    expect(hasAnyValidYoutubeEmbed({ youtubeEmbedUrls: ["not-a-url"] })).toBe(false);
  });

  it("getValidYoutubeEmbedEntries parses multiple ids", () => {
    const entries = getValidYoutubeEmbedEntries({
      youtubeEmbedUrls: [
        "https://youtu.be/CqprbDMardY",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      ],
    });
    expect(entries).toHaveLength(2);
    expect(entries[0]!.videoId).toBe("CqprbDMardY");
    expect(entries[1]!.videoId).toBe("dQw4w9WgXcQ");
  });
});
