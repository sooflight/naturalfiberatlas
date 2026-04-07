import { describe, expect, it } from "vitest";
import { buildCropUrl, canApplyCloudinaryCrop } from "./cloudinary";
import { stripCloudinaryTransform } from "./imageUrl";

describe("canApplyCloudinaryCrop", () => {
  it("is true for standard upload and fetch delivery URLs", () => {
    expect(
      canApplyCloudinaryCrop("https://res.cloudinary.com/demo/image/upload/v1/x.jpg"),
    ).toBe(true);
    expect(
      canApplyCloudinaryCrop(
        "https://res.cloudinary.com/demo/image/fetch/https%3A%2F%2Fexample.com%2Fa.jpg",
      ),
    ).toBe(true);
  });

  it("is false for other hosts or delivery types", () => {
    expect(canApplyCloudinaryCrop("https://example.com/x.jpg")).toBe(false);
    expect(canApplyCloudinaryCrop("https://res.cloudinary.com/demo/raw/upload/v1/doc.pdf")).toBe(
      false,
    );
  });
});

describe("buildCropUrl", () => {
  it("inserts c_crop after image/upload", () => {
    const src = "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg";
    const out = buildCropUrl(src, { x: 10, y: 20, width: 100, height: 200 });
    expect(out).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_crop,w_100,h_200,x_10,y_20/v1/sample.jpg",
    );
  });

  it("inserts c_crop after image/fetch before other fetch transforms", () => {
    const src =
      "https://res.cloudinary.com/demo/image/fetch/w_320,c_fill/https%3A%2F%2Fexample.com%2Fcat.jpg";
    const out = buildCropUrl(src, { x: 0, y: 0, width: 50, height: 50 });
    expect(out).toBe(
      "https://res.cloudinary.com/demo/image/fetch/c_crop,w_50,h_50,x_0,y_0/w_320,c_fill/https%3A%2F%2Fexample.com%2Fcat.jpg",
    );
  });

  it("leaves non-delivery URLs unchanged", () => {
    const src = "https://example.com/not-cloudinary.jpg";
    expect(buildCropUrl(src, { width: 1, height: 1 })).toBe(src);
  });
});

describe("stripCloudinaryTransform", () => {
  it("removes stacked c_crop segments", () => {
    const src =
      "https://res.cloudinary.com/x/image/upload/c_crop,w_10,h_10,x_0,y_0/c_crop,w_5,h_5,x_1,y_2/v1/id.jpg";
    const out = stripCloudinaryTransform(src);
    expect(out).toBe("https://res.cloudinary.com/x/image/upload/v1/id.jpg");
  });
});
