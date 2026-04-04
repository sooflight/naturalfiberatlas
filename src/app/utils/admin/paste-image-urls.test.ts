import { describe, expect, it } from "vitest";
import {
  extractFirstImageUrlFromClipboardText,
  parseImageUrlsFromPastedText,
} from "./paste-image-urls";

describe("parseImageUrlsFromPastedText", () => {
  it("keeps Cloudinary URLs with comma-separated transform segments intact", () => {
    const url =
      "https://res.cloudinary.com/demo/image/upload/c_scale,w_400,h_300,q_auto/sample.jpg";
    expect(parseImageUrlsFromPastedText(url)).toEqual([url]);
  });

  it("parses multiple newline-separated URLs", () => {
    const a = "https://example.com/a.jpg";
    const b = "https://example.com/b.jpg";
    expect(parseImageUrlsFromPastedText(`${a}\n${b}`)).toEqual([a, b]);
  });

  it("parses two https URLs on one line separated by comma", () => {
    const a = "https://example.com/a.jpg";
    const b = "https://example.com/b.jpg";
    expect(parseImageUrlsFromPastedText(`${a}, ${b}`)).toEqual([a, b]);
    expect(parseImageUrlsFromPastedText(`${a},${b}`)).toEqual([a, b]);
  });

  it("extracts URL from leading label text", () => {
    const u = "https://example.com/nettle.jpg";
    expect(parseImageUrlsFromPastedText(`Photo: ${u}`)).toEqual([u]);
  });

  it("parses markdown image syntax", () => {
    const u = "https://example.com/x.jpg";
    expect(parseImageUrlsFromPastedText(`![nettle 22](${u})`)).toEqual([u]);
  });

  it("preserves ResearchGate figure URLs with @ in the path", () => {
    const url =
      "https://www.researchgate.net/publication/369017081/figure/fig8/AS:11431281257233658@1719598199426/SEM-surface-morphology-of-viscose-fiber.gif";
    expect(parseImageUrlsFromPastedText(url)).toEqual([url]);
  });
});

describe("extractFirstImageUrlFromClipboardText", () => {
  it("returns first URL when clipboard has a caption line then URL", () => {
    const u = "https://example.com/p.jpg";
    expect(extractFirstImageUrlFromClipboardText(`Title\n${u}`)).toBe(u);
  });
});
