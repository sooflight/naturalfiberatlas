import { beforeEach, describe, expect, it } from "vitest";
import { getCloudinaryConfig } from "./cloudinary-upload";

describe("cloudinary-upload", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads cloudinary config from current admin settings key", () => {
    localStorage.setItem(
      "atlas:admin-settings",
      JSON.stringify({
        cloudinary: { cloudName: "current-cloud", uploadPreset: "current-preset" },
      }),
    );

    expect(getCloudinaryConfig()).toEqual({
      cloudName: "current-cloud",
      uploadPreset: "current-preset",
    });
  });

  it("falls back to admin-package settings key", () => {
    localStorage.setItem(
      "atlas-admin-settings",
      JSON.stringify({
        cloudinary: { cloudName: "legacy-cloud", uploadPreset: "legacy-preset" },
      }),
    );

    expect(getCloudinaryConfig()).toEqual({
      cloudName: "legacy-cloud",
      uploadPreset: "legacy-preset",
    });
  });

  it("falls back to cloudinary legacy key", () => {
    localStorage.setItem(
      "atlas-cloudinary-config",
      JSON.stringify({
        cloudName: "legacy-direct-cloud",
        uploadPreset: "legacy-direct-preset",
      }),
    );

    expect(getCloudinaryConfig()).toEqual({
      cloudName: "legacy-direct-cloud",
      uploadPreset: "legacy-direct-preset",
    });
  });
});
