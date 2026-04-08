import { describe, expect, it } from "vitest";
import { fibers } from "./fibers";

describe("fiber profile default status policy", () => {
  it("publishes fiber and textile profiles unless explicitly archived; archives dye profiles", () => {
    for (const profile of fibers) {
      if (profile.category === "dye") {
        expect(profile.status).toBe("archived");
      } else {
        expect(profile.status === "published" || profile.status === "archived").toBe(true);
      }
    }
  });
});

