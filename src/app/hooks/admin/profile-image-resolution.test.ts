import { describe, it, expect } from "vitest";
import {
  buildProfileImageFetchPlan,
  resolveFetchedImagesForRequestedIds,
} from "./profile-image-resolution";

describe("profile image resolution", () => {
  it("expands legacy profile ids into canonical fetch candidates", () => {
    const plan = buildProfileImageFetchPlan(["pineapple-pina", "hemp"]);
    expect(plan.requestedIds).toEqual(["pineapple-pina", "hemp"]);
    expect(plan.candidateIdsByRequestedId["pineapple-pina"]).toEqual([
      "pineapple-pina",
      "pineapple",
    ]);
    expect(plan.requestIds).toContain("pineapple");
    expect(plan.requestIds).toContain("hemp");
  });

  it("maps canonical payloads back to requested legacy ids", () => {
    const resolved = resolveFetchedImagesForRequestedIds(
      ["pineapple-pina", "hemp"],
      {
        pineapple: ["https://example.com/pina.jpg"],
        hemp: ["https://example.com/hemp.jpg"],
      }
    );

    expect(resolved["pineapple-pina"]).toEqual(["https://example.com/pina.jpg"]);
    expect(resolved.hemp).toEqual(["https://example.com/hemp.jpg"]);
  });
});
