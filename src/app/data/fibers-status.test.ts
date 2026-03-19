import { describe, expect, it } from "vitest";
import { fibers } from "./fibers";

describe("fiber profile default status policy", () => {
  it("publishes all fiber profiles and archives textile/dye profiles", () => {
    for (const profile of fibers) {
      if (profile.category === "fiber") {
        expect(profile.status).toBe("published");
      } else {
        expect(profile.status).toBe("archived");
      }
    }
  });
});

